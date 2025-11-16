import {
    NUSACONTACT_SYNC_CONTACT_API_URL,
    NUSACONTACT_API_KEY,
    NUSACONTACT_SYNC_CONTACT_MAX_ATTEMPTS,
} from '../config'
import axios from 'axios'

const SYNC_CONFIG = {
    MAX_ATTEMPTS: Number(NUSACONTACT_SYNC_CONTACT_MAX_ATTEMPTS),
    TIMEOUT: 10000,
    BASE_DELAY: 1000,
    RETRYABLE_CODES: [408, 429],
}

/**
 * Sync contact to Nusacontact API
 * @param data 
 * @returns Promise<void>
 */
export async function syncNusacontactContact(data: any): Promise<void> {
    for (let attempt = 1; attempt <= SYNC_CONFIG.MAX_ATTEMPTS; attempt++) {
        try {
            const response = await axios.post(
                NUSACONTACT_SYNC_CONTACT_API_URL,
                data,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Api-Key': NUSACONTACT_API_KEY,
                    },
                    timeout: SYNC_CONFIG.TIMEOUT,
                }
            )

            console.log('[SYNC SUCCESS]', response.data.message)
            return

        } catch (error: any) {
            if (!axios.isAxiosError(error)) {
                console.error('[SYNC ERROR] Unexpected error:', error)
                return
            }

            const status = error.response?.status
            const message = error.response?.data || error.message

            console.error(
                `[SYNC ERROR] Attempt ${attempt}/${SYNC_CONFIG.MAX_ATTEMPTS} - ${status || 'No Status'}: ${message}`
            )

            // 4xx non-retryable
            if (status && status >= 400 && status < 500) {
                if (!SYNC_CONFIG.RETRYABLE_CODES.includes(status)) {
                    console.error('[SYNC STOPPED] Non-retryable 4xx error.')
                    return
                }
            }

            // Retry habis
            if (attempt >= SYNC_CONFIG.MAX_ATTEMPTS) {
                console.error('[SYNC FAILED] Max retries reached.')
                return
            }

            // Exponential backoff + jitter
            const delay =
                SYNC_CONFIG.BASE_DELAY * Math.pow(2, attempt - 1) +
                Math.floor(Math.random() * 300)

            console.log(`[SYNC RETRY] Waiting ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
}
