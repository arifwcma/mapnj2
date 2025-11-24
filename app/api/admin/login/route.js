import { cookies } from "next/headers"

const ADMIN_USERNAME = "admin"
const ADMIN_PASSWORD = "admin"
const SESSION_COOKIE_NAME = "admin_session"

export async function POST(request) {
    try {
        const body = await request.json()
        const { username, password } = body

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            const cookieStore = await cookies()
            const sessionToken = `admin_${Date.now()}_${Math.random().toString(36).substring(7)}`
            cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24
            })

            return Response.json({ success: true, token: sessionToken })
        } else {
            return Response.json({ success: false, error: "Invalid credentials" }, { status: 401 })
        }
    } catch (error) {
        console.error("Admin login error:", error)
        return Response.json({ success: false, error: "Internal server error" }, { status: 500 })
    }
}

export async function GET(request) {
    const cookieStore = await cookies()
    const session = cookieStore.get(SESSION_COOKIE_NAME)
    
    if (session) {
        return Response.json({ authenticated: true })
    } else {
        return Response.json({ authenticated: false })
    }
}

