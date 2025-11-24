import { cookies } from "next/headers"

const ADMIN_USERNAME = "admin"
const ADMIN_PASSWORD = "admin"
const SESSION_COOKIE_NAME = "admin_session"
const SESSION_DURATION = 24 * 60 * 60 * 1000

export async function isAdminAuthenticated() {
    try {
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
        
        if (!sessionCookie) {
            return false
        }
        
        const sessionData = JSON.parse(sessionCookie.value)
        const now = Date.now()
        
        if (now > sessionData.expires) {
            return false
        }
        
        return sessionData.username === ADMIN_USERNAME
    } catch {
        return false
    }
}

export function createAdminSession() {
    const expires = Date.now() + SESSION_DURATION
    return JSON.stringify({
        username: ADMIN_USERNAME,
        expires
    })
}

export function verifyAdminCredentials(username, password) {
    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD
}

