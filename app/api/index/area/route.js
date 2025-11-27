import { NextResponse } from "next/server"
import { getAverageIndexForArea } from "@/app/lib/earthengineUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"
import { DEFAULT_INDEX, isValidIndex } from "@/app/lib/indexConfig"

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const geometryParam = searchParams.get("geometry")
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const bbox = searchParams.get("bbox")
    const cloudParam = searchParams.get("cloud")
    const indexParam = searchParams.get("index")
    
    const cloud = cloudParam ? parseFloat(cloudParam) : DEFAULT_CLOUD_TOLERANCE
    const indexName = indexParam || DEFAULT_INDEX

    if (!geometryParam || !start || !end || !bbox) {
        return NextResponse.json(
            { error: "Missing required parameters: geometry, start, end, or bbox" },
            { status: 400 }
        )
    }

    if (!isValidIndex(indexName)) {
        return NextResponse.json(
            { error: `Invalid index: ${indexName}` },
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
        const value = await getAverageIndexForArea(start, end, bbox, cloud, geometry, indexName)
        return NextResponse.json({ value, index: indexName })
    } catch (error) {
        const errorMessage = error?.message || error?.toString() || "Unknown error"
        if (errorMessage.includes("No images found")) {
            return NextResponse.json({ value: null, index: indexName })
        }
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}

