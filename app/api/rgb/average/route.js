import { NextResponse } from "next/server"
import { getAverageRgbTile } from "@/app/lib/earthengineUtils"

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const bbox = searchParams.get("bbox")
    const cloudParam = searchParams.get("cloud")
    const geometryParam = searchParams.get("geometry")
    const cloud = cloudParam ? parseFloat(cloudParam) : 30

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

