import { NextResponse } from "next/server"
import { getNdviAtPoint } from "@/app/lib/earthengineUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"

export async function GET(request) {
    console.log("[API] GET /api/ndvi/point/month - Request received")
    try {
        const { searchParams } = new URL(request.url)
        console.log("[API] /api/ndvi/point/month - Params:", Object.fromEntries(searchParams))
        const lat = searchParams.get("lat")
        const lon = searchParams.get("lon")
        const year = searchParams.get("year")
        const month = searchParams.get("month")
        const bbox = searchParams.get("bbox")
        const cloud = searchParams.get("cloud")

        if (!lat || !lon || !year || !month || !bbox) {
            return NextResponse.json(
                { error: "Missing required parameters: lat, lon, year, month, or bbox" },
                { status: 400 }
            )
        }

        const latNum = parseFloat(lat)
        const lonNum = parseFloat(lon)
        const yearNum = parseInt(year, 10)
        const monthNum = parseInt(month, 10)
        const cloudNum = cloud ? parseFloat(cloud) : DEFAULT_CLOUD_TOLERANCE

        if (isNaN(latNum) || isNaN(lonNum) || isNaN(yearNum) || isNaN(monthNum)) {
            return NextResponse.json(
                { error: "Invalid lat, lon, year, or month parameter" },
                { status: 400 }
            )
        }

        if (cloudNum && (isNaN(cloudNum) || cloudNum < 0 || cloudNum > 100)) {
            return NextResponse.json(
                { error: "Invalid cloud parameter. Must be a number between 0 and 100" },
                { status: 400 }
            )
        }

        const dateRange = getMonthDateRange(yearNum, monthNum)
        
        try {
            const ndvi = await getNdviAtPoint(latNum, lonNum, dateRange.start, dateRange.end, bbox, cloudNum)
            return NextResponse.json({
                year: yearNum,
                month: monthNum,
                ndvi: ndvi !== null && ndvi !== undefined ? ndvi : null
            })
        } catch (error) {
            const errorMessage = error.message || error.toString() || ""
            if (errorMessage.includes("No images found") || errorMessage.includes("No NDVI value found")) {
                return NextResponse.json({
                    year: yearNum,
                    month: monthNum,
                    ndvi: null
                })
            } else {
                console.error(`Error fetching NDVI for ${yearNum}-${monthNum}:`, error)
                return NextResponse.json({
                    year: yearNum,
                    month: monthNum,
                    ndvi: null
                })
            }
        }
    } catch (error) {
        console.error("Error in /api/ndvi/point/month:", error)
        return NextResponse.json(
            { error: error.message || "Failed to get NDVI for month" },
            { status: 500 }
        )
    }
}

