import { NextResponse } from "next/server"
import { findRecentSnapshot, getAverageNdviTile } from "@/app/lib/earthengineUtils"

export async function GET(request) {
    console.log("[API] GET /api/ndvi/recent - Request received")
    const { searchParams } = new URL(request.url)
    const bbox = searchParams.get("bbox")

    if (!bbox) {
        return NextResponse.json(
            { error: "Missing required parameter: bbox" },
            { status: 400 }
        )
    }

    try {
        const snapshot = await findRecentSnapshot(bbox)
        
        if (!snapshot) {
            return NextResponse.json(
                { error: "No recent snapshot found" },
                { status: 404 }
            )
        }

        const tileUrl = await getAverageNdviTile(snapshot.start, snapshot.end, bbox, 100, null)
        
        return NextResponse.json({
            year: snapshot.year,
            month: snapshot.month,
            monthName: snapshot.monthName,
            start: snapshot.start,
            end: snapshot.end,
            tileUrl
        })
    } catch (error) {
        console.error("Error getting recent NDVI snapshot:", error)
        return NextResponse.json(
            { error: "Failed to get recent NDVI snapshot", details: error.message },
            { status: 500 }
        )
    }
}

