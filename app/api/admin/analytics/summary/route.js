import { getAnalyticsSummary } from "@/app/lib/db"
import { isAdminAuthenticated } from "@/app/lib/adminAuth"

export async function GET(request) {
    try {
        const authenticated = await isAdminAuthenticated()
        if (!authenticated) {
            return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get("startDate") ? parseInt(searchParams.get("startDate")) : null
        const endDate = searchParams.get("endDate") ? parseInt(searchParams.get("endDate")) : null

        const summary = getAnalyticsSummary(startDate, endDate)
        return Response.json(summary)
    } catch (error) {
        console.error("Analytics summary error:", error)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}

