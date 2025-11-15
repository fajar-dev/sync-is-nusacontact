import {
    NUSACONTACT_SYNC_CONTACT_API_URL,
    NUSACONTACT_API_KEY,
    NUSACONTACT_SYNC_CONTACT_MAX_ATTEMPTS,
} from '../config'
import axios from 'axios'

const SYNC_CONFIG = {
    MAX_ATTEMPTS: Number(NUSACONTACT_SYNC_CONTACT_MAX_ATTEMPTS),
    TIMEOUT: 10000,
    RETRY_DELAY: 1000,
    RETRYABLE_CODES: [408, 429],
}

/**
 * Sync contact data to Nusacontact API
 * @param {any} data 
 * @returns {Promise<void>}
 */
export async function syncNusacontactContact(data: any): Promise<void> {
    const maxAttempts = Number(NUSACONTACT_SYNC_CONTACT_MAX_ATTEMPTS) || SYNC_CONFIG.MAX_ATTEMPTS

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await axios.post(NUSACONTACT_SYNC_CONTACT_API_URL, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': NUSACONTACT_API_KEY,
                },
                timeout: SYNC_CONFIG.TIMEOUT,
            })
        } catch (error: any) {
            if (!axios.isAxiosError(error)) {
                break
            }

            const status = error.response?.status
            const message = error.response?.data || error.message

            console.error(
                `[SYNC ERROR] Attempt ${attempt}/${maxAttempts} - ${status || 'No Status'}: ${message}`
            )

            // Non-retryable client error (4xx except 408, 429)
            if (status && status >= 400 && status < 500) {
                if (!SYNC_CONFIG.RETRYABLE_CODES.includes(status)) {
                    console.error('[SYNC STOPPED] Non-retryable client error.')
                    break
                }
            }

            if (attempt >= maxAttempts) {
                console.error('[SYNC FAILED] Max retry reached.')
                break
            }

            // Delay before retry
            await new Promise(resolve => setTimeout(resolve, SYNC_CONFIG.RETRY_DELAY * attempt))
        }
    }
}