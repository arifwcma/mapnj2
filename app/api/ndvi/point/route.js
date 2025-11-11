import { NextResponse } from "next/server"
import { getNdviAtPoint } from "@/app/lib/earthengineUtils"

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get("lat")
    const lon = searchParams.get("lon")
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const bbox = searchParams.get("bbox")
    const cloudParam = searchParams.get("cloud")
    const cloud = cloudParam ? parseFloat(cloudParam) : 30

    if (!lat || !lon || !start || !end || !bbox) {
        return NextResponse.json(
            { error: "Missing required parameters: lat, lon, start, end, or bbox" },
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
        console.log("API: Getting NDVI at point", { lat: latNum, lon: lonNum, start, end, bbox, cloud })
        const ndvi = await getNdviAtPoint(latNum, lonNum, start, end, bbox, cloud)
        console.log("API: NDVI retrieved:", ndvi)
        return NextResponse.json({ ndvi, lat: latNum, lon: lonNum })
    } catch (error) {
        console.error("Error getting NDVI at point:", error)
        if (error.message && error.message.includes("No images found")) {
            return NextResponse.json({ ndvi: null, lat: latNum, lon: lonNum })
        }
        if (error.message && error.message.includes("Invalid")) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: error.message || "Failed to get NDVI at point" }, { status: 500 })
    }
}

