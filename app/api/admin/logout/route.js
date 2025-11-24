import { cookies } from "next/headers"

const SESSION_COOKIE_NAME = "admin_session"

export async function POST() {
    try {
        const cookieStore = await cookies()
        cookieStore.delete(SESSION_COOKIE_NAME)
        return Response.json({ success: true })
    } catch (error) {
        console.error("Admin logout error:", error)
        return Response.json({ success: false, error: "Internal server error" }, { status: 500 })
    }
}

