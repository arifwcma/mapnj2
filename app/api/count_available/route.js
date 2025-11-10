import { NextResponse } from "next/server"
import { countAvailableImages } from "@/app/lib/earthengineUtils"

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const bbox = searchParams.get("bbox")

    if (!start || !end || !bbox) {
        return NextResponse.json(
            { error: "Missing required parameters: start, end, or bbox" },
            { status: 400 }
        )
    }

    try {
        const count = await countAvailableImages(start, end, bbox)
        return NextResponse.json({ count, start, end, bbox })
    } catch (error) {
        console.error("Error counting available images:", error)
        if (error.message.includes("Invalid bbox")) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to query images" }, { status: 500 })
    }
}

