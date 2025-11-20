import { NextResponse } from "next/server"
import { getAverageNdviTile } from "@/app/lib/earthengineUtils"
import { getCurrentMonth } from "@/app/lib/monthUtils"
import { getMonthDateRange, getPreviousMonth } from "@/app/lib/dateUtils"

export async function GET(request) {
    console.log("[API] GET /api/ndvi/recent - Request received")
    const { searchParams } = new URL(request.url)
    const bbox = searchParams.get("bbox")

    if (!bbox) {
        return NextResponse.json(
            { error: "Missing required parameter: bbox" },
            { status: 400 }
        )
    }

    try {
        const currentMonth = getCurrentMonth()
        const monthsBack = 12
        
        const endDateRange = getMonthDateRange(currentMonth.year, currentMonth.month)
        
        let startMonth = { year: currentMonth.year, month: currentMonth.month }
        for (let i = 0; i < monthsBack - 1; i++) {
            const prev = getPreviousMonth(startMonth.year, startMonth.month)
            startMonth.year = prev.year
            startMonth.month = prev.month
        }
        const startDateRange = getMonthDateRange(startMonth.year, startMonth.month)
        
        const tileUrl = await getAverageNdviTile(startDateRange.start, endDateRange.end, bbox, 10, null)
        
        return NextResponse.json({
            year: currentMonth.year,
            month: currentMonth.month,
            monthName: endDateRange.start,
            start: startDateRange.start,
            end: endDateRange.end,
            tileUrl
        })
    } catch (error) {
        console.error("Error getting recent NDVI snapshot:", error)
        return NextResponse.json(
            { error: "Failed to get recent NDVI snapshot", details: error.message },
            { status: 500 }
        )
    }
}

