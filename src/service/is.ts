import { pool } from '../db';
import type { RowDataPacket } from 'mysql2/promise';

interface ContactDetail {
    ids: string[]
    branches: string[]
    companies: Array<{ id: string; name: string }>
    services: Array<{ id: string; name: string }>
    accounts: Array<{ id: string; name: string }>
    addresses: Array<{ id: string; name: string }>
}

const CUSTOMER_LINK = {
    PREFIX: 'https://isx.nusa.net.id/customer.php?custId=',
    SUFFIX: '&pid=profile&module=customer',
}

const SUBSCRIPTION_LINK = {
    PREFIX: 'https://isx.nusa.net.id/v2/customer/service/',
    SUFFIX: '/detail',
}

/**
 * Sync customer contact data to Nusacontact system
 * @param {string} contactNumber - Group contact number
 * @param {string | string[]} custIds - Customer IDs (comma-separated string or array)
 * @param {string} contactName - Contact name
 * @returns {Promise<any>}
 */
export async function syncNusacontactCustomer(
    contactNumber: string,
    custIds: string | string[],
    contactName: string
): Promise<any> {
    const contact = await getContactDetail(custIds)
    if (!contact) {
        return null
    }
    return formatContact(contactNumber, contact, contactName)
}

/**
 * Get customer contact detail from NIS database
 * @param {string | string[]} custIds - Customer IDs (comma-separated string or array)
 * @returns {Promise<ContactDetail | null>}
 */
async function getContactDetail(custIds: string | string[]): Promise<ContactDetail | null> {
    const contact: ContactDetail = {
        ids: [],
        branches: [],
        companies: [],
        services: [],
        accounts: [],
        addresses: [],
    }

    // Parse custIds
    const ids = Array.isArray(custIds) 
        ? custIds 
        : custIds.split(',').map(id => id.trim())

    if (ids.length === 0) {
        return null
    }

    contact.ids = ids
    const placeholders = ids.map(() => '?').join(',')

    // Query 1: Company & branch data
    const sql1 = `
        SELECT CustId AS customerId, 
            CustCompany AS company,
            IFNULL(DisplayBranchId, BranchId) AS branch
        FROM Customer
        WHERE CustId IN (${placeholders})
    `
    const [rows1] = await pool.execute<RowDataPacket[]>(sql1, ids)

    if (rows1.length === 0) {
        return null
    }

    rows1.forEach(({ customerId, company, branch }) => {
        const trimmedCompany = company?.trim()
        if (trimmedCompany) {
            contact.companies.push({ id: customerId, name: trimmedCompany })
        }
        if (!contact.branches.includes(branch)) {
            contact.branches.push(branch)
        }
    })

    // Query 2: Services, accounts & addresses
    const sql2 = `
        SELECT cs.CustServId AS subscriptionId, 
            s.ServiceType AS service,
            cs.CustAccName AS account, 
            IFNULL(cs.installation_address, '') AS address
        FROM CustomerServices cs
        LEFT JOIN Services s ON cs.ServiceId = s.ServiceId
        LEFT JOIN Customer c ON cs.CustId = c.CustId
        WHERE cs.CustId IN (${placeholders}) 
        AND cs.CustStatus != 'NA'
    `
    const [rows2] = await pool.execute<RowDataPacket[]>(sql2, ids)

    rows2.forEach(({ subscriptionId, service, account, address }) => {
        const normalizedAddress = address?.trim().replace(/\s+/g, ' ')
        if (normalizedAddress) {
            contact.addresses.push({ id: subscriptionId, name: normalizedAddress })
        }
        contact.services.push({ id: subscriptionId, name: service })
        contact.accounts.push({ id: subscriptionId, name: account?.trim() })
    })

    return contact
}

/**
 * Format contact data for Nusacontact
 * @param {string} contactNumber - Contact phone number
 * @param {ContactDetail} contact - Contact details from database
 * @param {string} contactName - Contact name
 * @returns {any}
 */
function formatContact(
    contactNumber: string, 
    contact: ContactDetail, 
    contactName: string
): any {
    const timezone = Array.isArray(contact.branches) && contact.branches.includes('062')
        ? 'Asia/Makassar'
        : 'Asia/Jakarta'

    const branchCode = Array.isArray(contact.branches) ? contact.branches.join(', ') : ''

    const createLink = (text: string, id: string, isCustomer: boolean) => {
        const { PREFIX, SUFFIX } = isCustomer ? CUSTOMER_LINK : SUBSCRIPTION_LINK
        return `[${text}](${PREFIX}${id}${SUFFIX})`
    }

    const attributes: any = {
        ids: contact.ids
            .map(id => createLink(id, id, true))
            .join(', '),
        companies: contact.companies
            .map(({ id, name }) => createLink(name, id, true))
            .join(', '),
    }

    if (contact.services.length > 0) {
        attributes.services = contact.services
            .map(({ id, name }) => createLink(name, id, false))
            .join(', ')
    }

    if (contact.accounts.length > 0) {
        attributes.accounts = contact.accounts
            .map(({ id, name }) => createLink(name, id, false))
            .join(', ')
    }

    if (contact.addresses.length > 0) {
        attributes.addresses = contact.addresses
            .map(({ id, name }) => createLink(name, id, false))
            .join(', ')
    }

    return {
        phone_number: contactNumber,
        name: contactName,
        timezone,
        branch_code: branchCode,
        attributes: JSON.stringify(attributes),
    }
}