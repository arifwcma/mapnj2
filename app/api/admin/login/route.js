import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyAdminCredentials, createAdminSession } from "@/app/lib/adminAuth"

const SESSION_COOKIE_NAME = "admin_session"

export async function POST(request) {
    try {
        const body = await request.json()
        const { username, password } = body
        
        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: "Username and password required" },
                { status: 400 }
            )
        }
        
        if (!verifyAdminCredentials(username, password)) {
            return NextResponse.json(
                { success: false, error: "Invalid credentials" },
                { status: 401 }
            )
        }
        
        const cookieStore = await cookies()
        const sessionData = createAdminSession()
        
        cookieStore.set(SESSION_COOKIE_NAME, sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60
        })
        
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Login error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}

