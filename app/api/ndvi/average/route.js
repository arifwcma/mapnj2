import { NextResponse } from "next/server"
import { getAverageNdviTile } from "@/app/lib/earthengineUtils"

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const bbox = searchParams.get("bbox")
    const cloudParam = searchParams.get("cloud")
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

    try {
        const tileUrl = await getAverageNdviTile(start, end, bbox, cloud)
        return NextResponse.json({ tileUrl, start, end, bbox, cloud })
    } catch (error) {
        console.error("Error getting NDVI tile:", error)
        return NextResponse.json({ error: "Failed to get NDVI tile" }, { status: 500 })
    }
}

