import { NextResponse } from "next/server"
import { getAverageNdviTile, getAverageNdviThumbnail } from "@/app/lib/earthengineUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"

async function handleRequest(request) {
    console.log(`[API] ${request.method} /api/ndvi/average - Request received`)
    let start, end, bbox, cloudParam, geometryParam, thumbnailParam, dimensions
    
    if (request.method === "POST") {
        let body
        try {
            const bodyText = await request.text()
            console.log("[API] /api/ndvi/average - POST body text length:", bodyText.length)
            if (!bodyText || bodyText.trim() === "") {
                throw new Error("Empty request body")
            }
            body = JSON.parse(bodyText)
        } catch (parseError) {
            console.error("[API] /api/ndvi/average - JSON parse error:", parseError)
            return NextResponse.json(
                { error: "Invalid JSON in request body: " + (parseError.message || parseError.toString()) },
                { status: 400 }
            )
        }
        console.log("[API] /api/ndvi/average - POST body received:", {
            start: body.start,
            end: body.end,
            bbox: body.bbox,
            cloud: body.cloud,
            thumbnail: body.thumbnail,
            dimensions: body.dimensions,
            hasGeometry: !!body.geometry,
            geometryType: body.geometry?.geometry?.type || body.geometry?.type || "none"
        })
        start = body.start
        end = body.end
        bbox = body.bbox
        cloudParam = body.cloud
        geometryParam = body.geometry
        thumbnailParam = body.thumbnail
        dimensions = body.dimensions
    } else {
        const { searchParams } = new URL(request.url)
        console.log("[API] /api/ndvi/average - GET Params:", { start: searchParams.get("start"), end: searchParams.get("end"), bbox: searchParams.get("bbox"), cloud: searchParams.get("cloud"), hasGeometry: !!searchParams.get("geometry"), thumbnail: searchParams.get("thumbnail") })
        start = searchParams.get("start")
        end = searchParams.get("end")
        bbox = searchParams.get("bbox")
        cloudParam = searchParams.get("cloud")
        geometryParam = searchParams.get("geometry")
        thumbnailParam = searchParams.get("thumbnail")
        dimensions = searchParams.get("dimensions")
    }
    
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
        if (typeof geometryParam === "string") {
            try {
                geometry = JSON.parse(geometryParam)
            } catch (e) {
                return NextResponse.json(
                    { error: "Invalid geometry parameter. Must be valid JSON" },
                    { status: 400 }
                )
            }
        } else {
            geometry = geometryParam
        }
    }

    try {
        if (thumbnailParam === "true") {
            const dimensionsNum = parseInt(dimensions || "1024")
            console.log(`[API] /api/ndvi/average - Calling getAverageNdviThumbnail:`, {
                start,
                end,
                bbox,
                cloud,
                dimensions: dimensionsNum,
                hasGeometry: !!geometry,
                geometryType: geometry?.geometry?.type || geometry?.type || "none"
            })
            const imageUrl = await getAverageNdviThumbnail(start, end, bbox, cloud, geometry, dimensionsNum)
            console.log(`[API] /api/ndvi/average - Thumbnail success:`, { imageUrl: imageUrl?.substring(0, 100) + "..." })
            return NextResponse.json({ imageUrl, start, end, bbox, cloud })
        } else {
            console.log(`[API] /api/ndvi/average - Calling getAverageNdviTile:`, {
                start,
                end,
                bbox,
                cloud,
                hasGeometry: !!geometry,
                geometryType: geometry?.geometry?.type || geometry?.type || "none"
            })
            const tileUrl = await getAverageNdviTile(start, end, bbox, cloud, geometry)
            console.log(`[API] /api/ndvi/average - Tile success`)
            return NextResponse.json({ tileUrl, start, end, bbox, cloud })
        }
    } catch (error) {
        const errorMessage = error.message || error.toString() || ""
        const isNoDataError = errorMessage.includes("No images found") || errorMessage.includes("No NDVI value found")
        
        if (isNoDataError && thumbnailParam === "true") {
            console.log(`[API] /api/ndvi/average - No data found for thumbnail, returning null`)
            return NextResponse.json({ imageUrl: null, start, end, bbox, cloud })
        }
        
        if (isNoDataError) {
            console.log(`[API] /api/ndvi/average - No data found for tile`)
            return NextResponse.json({ error: "No images found" }, { status: 500 })
        }
        
        console.error(`[API] /api/ndvi/average - Error:`, {
            error: errorMessage,
            errorType: error.constructor?.name || typeof error,
            stack: error.stack,
            fullError: error,
            thumbnail: thumbnailParam === "true",
            start,
            end,
            bbox,
            cloud
        })
        return NextResponse.json({ error: "Failed to get NDVI tile" }, { status: 500 })
    }
}

export async function GET(request) {
    return handleRequest(request)
}

export async function POST(request) {
    return handleRequest(request)
}

