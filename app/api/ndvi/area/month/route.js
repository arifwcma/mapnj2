import { NextResponse } from "next/server"
import { getAverageNdviForArea } from "@/app/lib/earthengineUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"

export async function GET(request) {
    console.log("[API] GET /api/ndvi/area/month - Request received")
    try {
        const { searchParams } = new URL(request.url)
        console.log("[API] /api/ndvi/area/month - Params:", { year: searchParams.get("year"), month: searchParams.get("month"), bbox: searchParams.get("bbox"), cloud: searchParams.get("cloud") })
        const geometryParam = searchParams.get("geometry")
        const year = searchParams.get("year")
        const month = searchParams.get("month")
        const bbox = searchParams.get("bbox")
        const cloud = searchParams.get("cloud")

        if (!geometryParam || !year || !month || !bbox) {
            return NextResponse.json(
                { error: "Missing required parameters: geometry, year, month, or bbox" },
                { status: 400 }
            )
        }

        let geometry = null
        try {
            geometry = JSON.parse(geometryParam)
        } catch (e) {
            return NextResponse.json(
                { error: "Invalid geometry parameter. Must be valid JSON" },
                { status: 400 }
            )
        }

        const yearNum = parseInt(year, 10)
        const monthNum = parseInt(month, 10)
        const cloudNum = cloud ? parseFloat(cloud) : 30

        if (isNaN(yearNum) || isNaN(monthNum)) {
            return NextResponse.json(
                { error: "Invalid year or month parameter" },
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
            const ndvi = await getAverageNdviForArea(dateRange.start, dateRange.end, bbox, cloudNum, geometry)
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
                console.error(`Error fetching area NDVI for ${yearNum}-${monthNum}:`, error)
                return NextResponse.json({
                    year: yearNum,
                    month: monthNum,
                    ndvi: null
                })
            }
        }
    } catch (error) {
        console.error("Error in /api/ndvi/area/month:", error)
        return NextResponse.json(
            { error: error.message || "Failed to get area NDVI for month" },
            { status: 500 }
        )
    }
}

