import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/app/lib/adminAuth"
import { getAnalyticsSummary } from "@/app/lib/db"

export async function GET(request) {
    if (!(await isAdminAuthenticated())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        )
    }
    
    try {
        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get("startDate") ? parseInt(searchParams.get("startDate")) : null
        const endDate = searchParams.get("endDate") ? parseInt(searchParams.get("endDate")) : null
        
        const summary = getAnalyticsSummary(startDate, endDate)
        
        return NextResponse.json(summary)
    } catch (error) {
        console.error("Analytics summary error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

