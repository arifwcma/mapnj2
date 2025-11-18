import { NextResponse } from "next/server"
import { findAvailableMonth } from "@/app/lib/earthengineUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"

export async function GET(request) {
    console.log("[API] GET /api/find_month - Request received")
    const { searchParams } = new URL(request.url)
    console.log("[API] /api/find_month - Params:", { bbox: searchParams.get("bbox"), cloud: searchParams.get("cloud") })
    const bbox = searchParams.get("bbox")
    const cloudParam = searchParams.get("cloud")
    const cloud = cloudParam ? parseFloat(cloudParam) : DEFAULT_CLOUD_TOLERANCE

    if (!bbox) {
        return NextResponse.json(
            { error: "Missing required parameter: bbox" },
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
        const result = await findAvailableMonth(bbox, cloud)
        return NextResponse.json(result)
    } catch (error) {
        console.error("Error finding available month:", error)
        return NextResponse.json(
            { error: "Failed to find available month", details: error.message },
            { status: 500 }
        )
    }
}

