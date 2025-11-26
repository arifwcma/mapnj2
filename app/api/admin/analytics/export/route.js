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
            const headers = ["ip", "event_type", "timestamp", "lat", "lon", "data"]
            const rows = events.map(event => {
                let ip = "-"
                let lat = null
                let lon = null
                
                if (event.data) {
                    let parsedData = null
                    
                    if (typeof event.data === "object" && event.data !== null) {
                        parsedData = event.data
                    } else if (typeof event.data === "string") {
                        try {
                            parsedData = JSON.parse(event.data)
                        } catch {
                            parsedData = null
                        }
                    }
                    
                    if (parsedData) {
                        if (parsedData.ip) {
                            ip = parsedData.ip
                        }
                        if (typeof parsedData.lat === "number" && typeof parsedData.lon === "number") {
                            lat = parsedData.lat
                            lon = parsedData.lon
                        } else if ((event.event_type === "Parcel added" || event.event_type === "Rectangle added" || 
                                    event.event_type === "Parcel set" || event.event_type === "Rectangle set") &&
                                   typeof parsedData.center_lat === "number" && typeof parsedData.center_lon === "number") {
                            lat = parsedData.center_lat
                            lon = parsedData.center_lon
                        }
                    }
                }
                
                const dataStr = event.data ? JSON.stringify(event.data) : ""
                
                return [
                    ip === "Unknown" || ip === "-" ? ip : ip,
                    event.event_type,
                    new Date(event.timestamp).toLocaleString(),
                    lat !== null ? lat.toString() : "",
                    lon !== null ? lon.toString() : "",
                    dataStr
                ]
            })
            
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

