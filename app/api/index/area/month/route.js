import { NextResponse } from "next/server"
import { getAverageIndexForArea } from "@/app/lib/earthengineUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"
import { DEFAULT_INDEX, isValidIndex } from "@/app/lib/indexConfig"

async function handleRequest(request) {
    let year, month, bbox, cloudParam, geometryParam, indexParam
    
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
        year = body.year
        month = body.month
        bbox = body.bbox
        cloudParam = body.cloud
        geometryParam = body.geometry
        indexParam = body.index
    } else {
        const { searchParams } = new URL(request.url)
        year = searchParams.get("year")
        month = searchParams.get("month")
        bbox = searchParams.get("bbox")
        cloudParam = searchParams.get("cloud")
        geometryParam = searchParams.get("geometry")
        indexParam = searchParams.get("index")
    }
    
    const indexName = indexParam || DEFAULT_INDEX

    if (!year || !month || !bbox) {
        return NextResponse.json(
            { error: "Missing required parameters: year, month, or bbox" },
            { status: 400 }
        )
    }

    if (!isValidIndex(indexName)) {
        return NextResponse.json(
            { error: `Invalid index: ${indexName}` },
            { status: 400 }
        )
    }

    const yearNum = typeof year === 'number' ? year : parseInt(year, 10)
    const monthNum = typeof month === 'number' ? month : parseInt(month, 10)
    const cloudNum = cloudParam ? (typeof cloudParam === 'number' ? cloudParam : parseFloat(cloudParam)) : DEFAULT_CLOUD_TOLERANCE

    if (isNaN(yearNum) || isNaN(monthNum)) {
        return NextResponse.json(
            { error: "Invalid year or month parameter" },
            { status: 400 }
        )
    }

    if (cloudParam && (isNaN(cloudNum) || cloudNum < 0 || cloudNum > 100)) {
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

    const dateRange = getMonthDateRange(yearNum, monthNum)

    try {
        const value = await getAverageIndexForArea(dateRange.start, dateRange.end, bbox, cloudNum, geometry, indexName)
        return NextResponse.json({
            year: yearNum,
            month: monthNum,
            value: value !== null && value !== undefined ? value : null,
            index: indexName
        })
    } catch (error) {
        const errorMessage = error?.message || error?.toString() || "Unknown error"
        if (errorMessage.includes("No images found") || errorMessage.includes("No value found")) {
            return NextResponse.json({
                year: yearNum,
                month: monthNum,
                value: null,
                index: indexName
            })
        }
        return NextResponse.json({
            year: yearNum,
            month: monthNum,
            value: null,
            index: indexName
        })
    }
}

export async function GET(request) {
    return handleRequest(request)
}

export async function POST(request) {
    return handleRequest(request)
}

