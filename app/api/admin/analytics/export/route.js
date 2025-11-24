import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/app/lib/adminAuth"
import { getAnalyticsForExport } from "@/app/lib/db"

export async function GET(request) {
    if (!(await isAdminAuthenticated())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        )
    }
    
    try {
        const { searchParams } = new URL(request.url)
        const format = searchParams.get("format") || "json"
        const eventType = searchParams.get("eventType") || null
        const startDate = searchParams.get("startDate") ? parseInt(searchParams.get("startDate")) : null
        const endDate = searchParams.get("endDate") ? parseInt(searchParams.get("endDate")) : null
        
        const events = getAnalyticsForExport({
            eventType,
            startDate,
            endDate
        })
        
        if (format === "csv") {
            const headers = ["id", "event_type", "timestamp", "data"]
            const rows = events.map(event => [
                event.id,
                event.event_type,
                new Date(event.timestamp).toISOString(),
                event.data ? JSON.stringify(event.data) : ""
            ])
            
            const csvContent = [
                headers.join(","),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            ].join("\n")
            
            return new NextResponse(csvContent, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="analytics-${Date.now()}.csv"`
                }
            })
        } else {
            return NextResponse.json(events)
        }
    } catch (error) {
        console.error("Analytics export error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

