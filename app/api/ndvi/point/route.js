import { NextResponse } from "next/server"
import { getNdviAtPoint } from "@/app/lib/earthengineUtils"
import { DEFAULT_CLOUD_TOLERANCE, DEFAULT_RELIABILITY, DEFAULT_SATELLITE } from "@/app/lib/config"

export async function GET(request) {
    console.log("[API] GET /api/ndvi/point - Request received")
    const { searchParams } = new URL(request.url)
    console.log("[API] /api/ndvi/point - Params:", { lat: searchParams.get("lat"), lon: searchParams.get("lon"), start: searchParams.get("start"), end: searchParams.get("end"), cloud: searchParams.get("cloud"), satellite: searchParams.get("satellite") })
    const lat = searchParams.get("lat")
    const lon = searchParams.get("lon")
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const cloudParam = searchParams.get("cloud")
    const reliabilityParam = searchParams.get("reliability")
    const satelliteParam = searchParams.get("satellite")
    const cloud = cloudParam ? parseFloat(cloudParam) : DEFAULT_CLOUD_TOLERANCE
    const reliability = reliabilityParam ? parseInt(reliabilityParam) : DEFAULT_RELIABILITY
    const satellite = satelliteParam || DEFAULT_SATELLITE

    if (!lat || !lon || !start || !end) {
        return NextResponse.json(
            { error: "Missing required parameters: lat, lon, start, or end" },
            { status: 400 }
        )
    }

    if (cloudParam && (isNaN(cloud) || cloud < 0 || cloud > 100)) {
        return NextResponse.json(
            { error: "Invalid cloud parameter. Must be a number between 0 and 100" },
            { status: 400 }
        )
    }

    const latNum = parseFloat(lat)
    const lonNum = parseFloat(lon)

    if (isNaN(latNum) || isNaN(lonNum)) {
        return NextResponse.json(
            { error: "Invalid lat or lon parameter" },
            { status: 400 }
        )
    }

    try {
        console.log("API: Getting NDVI at point", { lat: latNum, lon: lonNum, start, end, cloud, satellite })
        const ndvi = await getNdviAtPoint(latNum, lonNum, start, end, null, cloud, satellite, reliability)
        console.log("API: NDVI retrieved:", ndvi)
        return NextResponse.json({ ndvi, lat: latNum, lon: lonNum })
    } catch (error) {
        const errorMessage = error.message || error.toString() || ""
        if (errorMessage.includes("No images found") || errorMessage.includes("No NDVI value found")) {
            return NextResponse.json({ ndvi: null, lat: latNum, lon: lonNum })
        }
        if (errorMessage.includes("Invalid")) {
            return NextResponse.json({ error: errorMessage }, { status: 400 })
        }
        console.error("Error getting NDVI at point:", error)
        return NextResponse.json({ error: errorMessage || "Failed to get NDVI at point" }, { status: 500 })
    }
}

