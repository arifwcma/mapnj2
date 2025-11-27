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
        
        console.log("Login attempt:", { username, password: password ? "***" : "empty" })
        
        if (!verifyAdminCredentials(username, password)) {
            console.log("Invalid credentials")
            return NextResponse.json(
                { success: false, error: "Invalid credentials" },
                { status: 401 }
            )
        }
        
        console.log("Credentials verified")
        
        const cookieStore = await cookies()
        const sessionData = createAdminSession()
        
        const isSecure = process.env.NODE_ENV === "production" && request.url.startsWith("https://")
        
        cookieStore.set(SESSION_COOKIE_NAME, sessionData, {
            httpOnly: true,
            secure: isSecure,
            sameSite: "lax",
            maxAge: 24 * 60 * 60,
            path: "/"
        })
        
        console.log("Login successful, cookie set:", {
            secure: isSecure,
            url: request.url,
            nodeEnv: process.env.NODE_ENV
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

