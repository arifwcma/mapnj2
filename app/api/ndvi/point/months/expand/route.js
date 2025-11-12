import { NextResponse } from "next/server"
import { getNdviAtPoint } from "@/app/lib/earthengineUtils"
import { MIN_YEAR, MIN_MONTH } from "@/app/lib/constants"
import { getMonthDateRange, getPreviousMonth, getNextMonth } from "@/app/lib/dateUtils"

export async function POST(request) {
    try {
        const body = await request.json()
        const { lat, lon, startYear, startMonth, direction, offset, bbox, cloud } = body

        if (!lat || !lon || !startYear || !startMonth || !direction || !offset || !bbox) {
            return NextResponse.json(
                { error: "Missing required parameters: lat, lon, startYear, startMonth, direction, offset, or bbox" },
                { status: 400 }
            )
        }

        if (direction !== "left" && direction !== "right") {
            return NextResponse.json(
                { error: "Invalid direction. Must be 'left' or 'right'" },
                { status: 400 }
            )
        }

        const latNum = parseFloat(lat)
        const lonNum = parseFloat(lon)
        const cloudNum = cloud ? parseFloat(cloud) : 30
        const offsetNum = parseInt(offset)

        if (isNaN(latNum) || isNaN(lonNum) || isNaN(offsetNum) || offsetNum < 1) {
            return NextResponse.json(
                { error: "Invalid lat, lon, or offset parameter" },
                { status: 400 }
            )
        }

        if (cloudNum && (isNaN(cloudNum) || cloudNum < 0 || cloudNum > 100)) {
            return NextResponse.json(
                { error: "Invalid cloud parameter. Must be a number between 0 and 100" },
                { status: 400 }
            )
        }

        const monthsToFetch = []
        let currentYear = startYear
        let currentMonth = startMonth

        for (let i = 0; i < offsetNum; i++) {
            if (direction === "left") {
                const prevMonth = getPreviousMonth(currentYear, currentMonth)
                currentYear = prevMonth.year
                currentMonth = prevMonth.month

                if (currentYear < MIN_YEAR || (currentYear === MIN_YEAR && currentMonth < MIN_MONTH)) {
                    break
                }

                monthsToFetch.unshift({ year: currentYear, month: currentMonth })
            } else {
                const nextMonth = getNextMonth(currentYear, currentMonth)
                currentYear = nextMonth.year
                currentMonth = nextMonth.month

                const now = new Date()
                const currentCalendarYear = now.getFullYear()
                const currentCalendarMonth = now.getMonth() + 1

                if (currentYear > currentCalendarYear || (currentYear === currentCalendarYear && currentMonth > currentCalendarMonth)) {
                    break
                }

                monthsToFetch.push({ year: currentYear, month: currentMonth })
            }
        }

        if (monthsToFetch.length === 0) {
            return NextResponse.json({ results: [] })
        }

        const results = []

        for (const monthData of monthsToFetch) {
            const { year, month } = monthData
            const dateRange = getMonthDateRange(year, month)

            try {
                const ndvi = await getNdviAtPoint(latNum, lonNum, dateRange.start, dateRange.end, bbox, cloudNum)
                results.push({
                    year,
                    month,
                    ndvi: ndvi !== null && ndvi !== undefined ? ndvi : null
                })
            } catch (error) {
                const errorMessage = error.message || error.toString() || ""
                if (errorMessage.includes("No images found") || errorMessage.includes("No NDVI value found")) {
                    results.push({
                        year,
                        month,
                        ndvi: null
                    })
                } else {
                    console.error(`Error fetching NDVI for ${year}-${month}:`, error)
                    results.push({
                        year,
                        month,
                        ndvi: null
                    })
                }
            }
        }

        return NextResponse.json({ results })
    } catch (error) {
        console.error("Error in /api/ndvi/point/months/expand:", error)
        return NextResponse.json(
            { error: error.message || "Failed to expand months" },
            { status: 500 }
        )
    }
}

