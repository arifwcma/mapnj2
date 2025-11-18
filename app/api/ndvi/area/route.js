import { NextResponse } from "next/server"
import { getAverageNdviForArea } from "@/app/lib/earthengineUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"

export async function GET(request) {
    console.log("[API] GET /api/ndvi/area - Request received")
    const { searchParams } = new URL(request.url)
    console.log("[API] /api/ndvi/area - Params:", { start: searchParams.get("start"), end: searchParams.get("end"), bbox: searchParams.get("bbox"), cloud: searchParams.get("cloud"), hasGeometry: !!searchParams.get("geometry") })
    const geometryParam = searchParams.get("geometry")
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const bbox = searchParams.get("bbox")
    const cloudParam = searchParams.get("cloud")
    const cloud = cloudParam ? parseFloat(cloudParam) : DEFAULT_CLOUD_TOLERANCE

    if (!geometryParam || !start || !end || !bbox) {
        return NextResponse.json(
            { error: "Missing required parameters: geometry, start, end, or bbox" },
            { status: 400 }
        )
    }

    if (cloudParam && (isNaN(cloud) || cloud < 0 || cloud > 100)) {
        return NextResponse.json(
            { error: "Invalid cloud parameter. Must be a number between 0 and 100" },
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

    try {
        console.log("API: Getting average NDVI for area", { start, end, bbox, cloud })
        const ndvi = await getAverageNdviForArea(start, end, bbox, cloud, geometry)
        console.log("API: Average NDVI retrieved:", ndvi)
        return NextResponse.json({ ndvi })
    } catch (error) {
        const errorMessage = error.message || error.toString() || ""
        if (errorMessage.includes("No images found") || errorMessage.includes("No NDVI value found")) {
            return NextResponse.json({ ndvi: null })
        }
        if (errorMessage.includes("Invalid")) {
            return NextResponse.json({ error: errorMessage }, { status: 400 })
        }
        console.error("Error getting average NDVI for area:", error)
        return NextResponse.json({ error: errorMessage || "Failed to get average NDVI for area" }, { status: 500 })
    }
}

