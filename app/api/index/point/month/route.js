import { NextResponse } from "next/server"
import { getIndexAtPointForMonth } from "@/app/lib/earthengineUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"
import { DEFAULT_INDEX, isValidIndex } from "@/app/lib/indexConfig"

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const lat = searchParams.get("lat")
        const lon = searchParams.get("lon")
        const year = searchParams.get("year")
        const month = searchParams.get("month")
        const cloud = searchParams.get("cloud")
        const indexParam = searchParams.get("index")

        const indexName = indexParam || DEFAULT_INDEX

        if (!lat || !lon || !year || !month) {
            return NextResponse.json(
                { error: "Missing required parameters: lat, lon, year, or month" },
                { status: 400 }
            )
        }

        if (!isValidIndex(indexName)) {
            return NextResponse.json(
                { error: `Invalid index: ${indexName}` },
                { status: 400 }
            )
        }

        const latNum = parseFloat(lat)
        const lonNum = parseFloat(lon)
        const yearNum = parseInt(year, 10)
        const monthNum = parseInt(month, 10)
        const cloudNum = cloud ? parseFloat(cloud) : DEFAULT_CLOUD_TOLERANCE

        if (isNaN(latNum) || isNaN(lonNum) || isNaN(yearNum) || isNaN(monthNum)) {
            return NextResponse.json(
                { error: "Invalid lat, lon, year, or month parameter" },
                { status: 400 }
            )
        }

        if (cloudNum && (isNaN(cloudNum) || cloudNum < 0 || cloudNum > 100)) {
            return NextResponse.json(
                { error: "Invalid cloud parameter. Must be a number between 0 and 100" },
                { status: 400 }
            )
        }

        try {
            const value = await getIndexAtPointForMonth(latNum, lonNum, yearNum, monthNum, cloudNum, indexName)
            return NextResponse.json({ value, index: indexName })
        } catch (innerError) {
            const errorMessage = innerError?.message || innerError?.toString() || "Unknown error"
            if (errorMessage.includes("No images found") || errorMessage.includes("No value found")) {
                return NextResponse.json({ value: null, index: indexName })
            }
            return NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            )
        }
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Failed to get index value for month" },
            { status: 500 }
        )
    }
}

