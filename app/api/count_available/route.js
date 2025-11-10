import { NextResponse } from "next/server"
import { ee, initEarthEngine } from "@/app/lib/earthengine"

export async function GET(request) {
    await initEarthEngine()
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

    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(parseFloat)

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        return NextResponse.json(
            { error: "Invalid bbox format. Expected: minLng,minLat,maxLng,maxLat" },
            { status: 400 }
        )
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])

    const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10))

    return await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                console.error("Earth Engine error:", err)
                resolve(NextResponse.json({ error: "Failed to query images" }, { status: 500 }))
                return
            }
            resolve(NextResponse.json({ count: size, start, end, bbox }))
        })
    })
}

