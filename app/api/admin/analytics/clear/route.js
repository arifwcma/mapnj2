import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/app/lib/adminAuth"
import { clearAllAnalytics } from "@/app/lib/db"

export async function POST() {
    if (!(await isAdminAuthenticated())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        )
    }
    
    try {
        clearAllAnalytics()
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Clear analytics error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

