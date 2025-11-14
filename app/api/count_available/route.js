import { NextResponse } from "next/server"
import { countAvailableImages } from "@/app/lib/earthengineUtils"

export async function GET(request) {
    console.log("[API] GET /api/count_available - Request received")
    const { searchParams } = new URL(request.url)
    console.log("[API] /api/count_available - Params:", { start: searchParams.get("start"), end: searchParams.get("end"), bbox: searchParams.get("bbox"), cloud: searchParams.get("cloud") })
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
        const count = await countAvailableImages(start, end, bbox, cloud)
        return NextResponse.json({ count, start, end, bbox, cloud })
    } catch (error) {
        console.error("Error counting available images:", error)
        if (error.message.includes("Invalid bbox")) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to query images" }, { status: 500 })
    }
}

