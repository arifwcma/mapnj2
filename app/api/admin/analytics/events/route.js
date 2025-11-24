import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/app/lib/adminAuth"
import { getAnalyticsEvents } from "@/app/lib/db"

export async function GET(request) {
    if (!(await isAdminAuthenticated())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        )
    }
    
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "50")
        const eventType = searchParams.get("eventType") || null
        const startDate = searchParams.get("startDate") ? parseInt(searchParams.get("startDate")) : null
        const endDate = searchParams.get("endDate") ? parseInt(searchParams.get("endDate")) : null
        
        const result = getAnalyticsEvents({
            page,
            limit,
            eventType,
            startDate,
            endDate
        })
        
        return NextResponse.json(result)
    } catch (error) {
        console.error("Analytics events error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

