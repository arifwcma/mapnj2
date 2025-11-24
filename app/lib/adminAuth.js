import { cookies } from "next/headers"

const SESSION_COOKIE_NAME = "admin_session"

export async function isAdminAuthenticated() {
    try {
        const cookieStore = await cookies()
        const session = cookieStore.get(SESSION_COOKIE_NAME)
        return !!session
    } catch (error) {
        return false
    }
}

