import { logAnalytics } from "@/app/lib/db"

export async function POST(request) {
    try {
        const body = await request.json()
        const { events } = body

        if (!Array.isArray(events)) {
            return Response.json({ success: false, error: "Invalid request" }, { status: 400 })
        }

        for (const event of events) {
            try {
                const data = event.data ? (typeof event.data === "string" ? event.data : JSON.stringify(event.data)) : null
                logAnalytics(event.event_type, data)
            } catch (error) {
                console.error("Failed to log analytics event:", error)
            }
        }

        return Response.json({ success: true })
    } catch (error) {
        console.error("Analytics log endpoint error:", error)
        return Response.json({ success: false, error: "Internal server error" }, { status: 500 })
    }
}

