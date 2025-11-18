import { NextResponse } from "next/server"
import { getAverageRgbTile } from "@/app/lib/earthengineUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"

export async function GET(request) {
    console.log("[API] GET /api/rgb/average - Request received")
    const { searchParams } = new URL(request.url)
    console.log("[API] /api/rgb/average - Params:", { start: searchParams.get("start"), end: searchParams.get("end"), bbox: searchParams.get("bbox"), cloud: searchParams.get("cloud"), hasGeometry: !!searchParams.get("geometry") })
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const bbox = searchParams.get("bbox")
    const cloudParam = searchParams.get("cloud")
    const geometryParam = searchParams.get("geometry")
    const cloud = cloudParam ? parseFloat(cloudParam) : DEFAULT_CLOUD_TOLERANCE

    if (!start || !end || !bbox) {
        return NextResponse.json(
            { error: "Missing required parameters: start, end, or bbox" },
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
    if (geometryParam) {
        try {
            geometry = JSON.parse(geometryParam)
        } catch (e) {
            return NextResponse.json(
                { error: "Invalid geometry parameter. Must be valid JSON" },
                { status: 400 }
            )
        }
    }

    try {
        const tileUrl = await getAverageRgbTile(start, end, bbox, cloud, geometry)
        return NextResponse.json({ tileUrl, start, end, bbox, cloud })
    } catch (error) {
        console.error("Error getting RGB tile:", error)
        return NextResponse.json({ error: "Failed to get RGB tile" }, { status: 500 })
    }
}

