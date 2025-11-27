import { NextResponse } from "next/server"
import { getAverageIndexTile, getAverageIndexThumbnail } from "@/app/lib/earthengineUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"
import { DEFAULT_INDEX, isValidIndex } from "@/app/lib/indexConfig"

async function handleRequest(request) {
    let start, end, bbox, cloudParam, geometryParam, thumbnailParam, dimensions, indexParam
    
    if (request.method === "POST") {
        let body
        try {
            const bodyText = await request.text()
            if (!bodyText || bodyText.trim() === "") {
                throw new Error("Empty request body")
            }
            body = JSON.parse(bodyText)
        } catch (parseError) {
            return NextResponse.json(
                { error: "Invalid JSON in request body: " + (parseError.message || parseError.toString()) },
                { status: 400 }
            )
        }
        start = body.start
        end = body.end
        bbox = body.bbox
        cloudParam = body.cloud
        geometryParam = body.geometry
        thumbnailParam = body.thumbnail
        dimensions = body.dimensions
        indexParam = body.index
    } else {
        const { searchParams } = new URL(request.url)
        start = searchParams.get("start")
        end = searchParams.get("end")
        bbox = searchParams.get("bbox")
        cloudParam = searchParams.get("cloud")
        geometryParam = searchParams.get("geometry")
        thumbnailParam = searchParams.get("thumbnail")
        dimensions = searchParams.get("dimensions")
        indexParam = searchParams.get("index")
    }
    
    const cloud = cloudParam ? parseFloat(cloudParam) : DEFAULT_CLOUD_TOLERANCE
    const indexName = indexParam || DEFAULT_INDEX

    console.log("[API /api/index/average] Request params:", { start, end, bbox: bbox?.substring?.(0, 50), cloud, indexName, thumbnail: thumbnailParam, hasGeometry: !!geometryParam })

    if (!start || !end || !bbox) {
        console.log("[API /api/index/average] Missing required params - start:", start, "end:", end, "bbox:", !!bbox)
        return NextResponse.json(
            { error: "Missing required parameters: start, end, or bbox" },
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
        if (thumbnailParam === "true" || thumbnailParam === true) {
            const dims = dimensions ? parseInt(dimensions, 10) : 1024
            console.log("[API /api/index/average] Fetching thumbnail for index:", indexName)
            const thumbUrl = await getAverageIndexThumbnail(start, end, bbox, cloud, geometry, dims, indexName)
            console.log("[API /api/index/average] Thumbnail result:", thumbUrl ? "SUCCESS" : "NULL")
            return NextResponse.json({ thumbUrl, index: indexName })
        } else {
            console.log("[API /api/index/average] Fetching tile for index:", indexName)
            const tileUrl = await getAverageIndexTile(start, end, bbox, cloud, geometry, indexName)
            console.log("[API /api/index/average] Tile result:", tileUrl ? "SUCCESS" : "NULL")
            return NextResponse.json({ tileUrl, index: indexName })
        }
    } catch (error) {
        const errorMessage = error?.message || error?.toString() || "Unknown error"
        console.log("[API /api/index/average] Error:", errorMessage)
        if (errorMessage.includes("No images found")) {
            return NextResponse.json({ tileUrl: null, thumbUrl: null, index: indexName, error: "No images found" })
        }
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}

export async function GET(request) {
    return handleRequest(request)
}

export async function POST(request) {
    return handleRequest(request)
}

