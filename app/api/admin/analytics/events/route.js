import { getAnalyticsEvents } from "@/app/lib/db"
import { isAdminAuthenticated } from "@/app/lib/adminAuth"

export async function GET(request) {
    try {
        const authenticated = await isAdminAuthenticated()
        if (!authenticated) {
            return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

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

        return Response.json(result)
    } catch (error) {
        console.error("Analytics events error:", error)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}

