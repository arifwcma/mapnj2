import { NextResponse } from "next/server"
import { getAverageNdviForArea } from "@/app/lib/earthengineUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"

async function handleRequest(request) {
    console.log(`[API] ${request.method} /api/ndvi/area/month - Request received`)
    try {
        let geometryParam, year, month, bbox, cloud
        
        if (request.method === "POST") {
            let body
            try {
                const bodyText = await request.text()
                console.log("[API] /api/ndvi/area/month - POST body text length:", bodyText.length)
                if (!bodyText || bodyText.trim() === "") {
                    throw new Error("Empty request body")
                }
                body = JSON.parse(bodyText)
            } catch (parseError) {
                console.error("[API] /api/ndvi/area/month - JSON parse error:", parseError)
                return NextResponse.json(
                    { error: "Invalid JSON in request body: " + (parseError.message || parseError.toString()) },
                    { status: 400 }
                )
            }
            console.log("[API] /api/ndvi/area/month - POST body received:", {
                year: body.year,
                month: body.month,
                bbox: body.bbox,
                cloud: body.cloud,
                hasGeometry: !!body.geometry,
                geometryType: body.geometry?.geometry?.type || body.geometry?.type || "none"
            })
            geometryParam = body.geometry ? JSON.stringify(body.geometry) : null
            year = body.year
            month = body.month
            bbox = body.bbox
            cloud = body.cloud
        } else {
            const { searchParams } = new URL(request.url)
            console.log("[API] /api/ndvi/area/month - GET Params:", { year: searchParams.get("year"), month: searchParams.get("month"), bbox: searchParams.get("bbox"), cloud: searchParams.get("cloud") })
            geometryParam = searchParams.get("geometry")
            year = searchParams.get("year")
            month = searchParams.get("month")
            bbox = searchParams.get("bbox")
            cloud = searchParams.get("cloud")
        }

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
        const cloudNum = cloud ? parseFloat(cloud) : DEFAULT_CLOUD_TOLERANCE

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
        console.log(`[API] /api/ndvi/area/month - Calling getAverageNdviForArea:`, {
            start: dateRange.start,
            end: dateRange.end,
            bbox: bbox,
            cloud: cloudNum,
            hasGeometry: !!geometry,
            geometryType: geometry?.geometry?.type || geometry?.type || "none"
        })
        
        try {
            const ndvi = await getAverageNdviForArea(dateRange.start, dateRange.end, bbox, cloudNum, geometry)
            console.log(`[API] /api/ndvi/area/month - Success for ${yearNum}-${monthNum}:`, { ndvi })
            
            return NextResponse.json({
                year: yearNum,
                month: monthNum,
                ndvi: ndvi !== null && ndvi !== undefined ? ndvi : null
            })
        } catch (error) {
            const errorMessage = error.message || error.toString() || ""
            console.error(`[API] /api/ndvi/area/month - Error for ${yearNum}-${monthNum}:`, {
                error: errorMessage,
                errorType: error.constructor?.name || typeof error,
                stack: error.stack,
                fullError: error
            })
            if (errorMessage.includes("No images found") || errorMessage.includes("No NDVI value found")) {
                console.log(`[API] /api/ndvi/area/month - No images found, returning null for ${yearNum}-${monthNum}`)
                return NextResponse.json({
                    year: yearNum,
                    month: monthNum,
                    ndvi: null
                })
            } else {
                console.error(`[API] /api/ndvi/area/month - Unexpected error, returning null for ${yearNum}-${monthNum}`)
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

export async function GET(request) {
    return handleRequest(request)
}

export async function POST(request) {
    return handleRequest(request)
}

