import { getAnalyticsForExport } from "@/app/lib/db"
import { isAdminAuthenticated } from "@/app/lib/adminAuth"

export async function GET(request) {
    try {
        const authenticated = await isAdminAuthenticated()
        if (!authenticated) {
            return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

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
            const headers = ["ID", "Event Type", "Timestamp", "Data"]
            const rows = events.map(e => [
                e.id,
                e.event_type,
                new Date(e.timestamp).toISOString(),
                e.data ? JSON.stringify(e.data) : ""
            ])
            
            const csvContent = [
                headers.join(","),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            ].join("\n")

            return new Response(csvContent, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="analytics_${Date.now()}.csv"`
                }
            })
        } else {
            return Response.json(events)
        }
    } catch (error) {
        console.error("Analytics export error:", error)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}

