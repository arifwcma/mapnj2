import { NextResponse } from "next/server"
import { getNdviAtPoint } from "@/app/lib/earthengineUtils"

function getMonthDateRange(year, month) {
    const start = `${year}-${String(month).padStart(2, "0")}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    return { start, end }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { lat, lon, months, bbox, cloud } = body

        if (!lat || !lon || !months || !Array.isArray(months) || !bbox) {
            return NextResponse.json(
                { error: "Missing required parameters: lat, lon, months (array), or bbox" },
                { status: 400 }
            )
        }

        const latNum = parseFloat(lat)
        const lonNum = parseFloat(lon)
        const cloudNum = cloud ? parseFloat(cloud) : 30

        if (isNaN(latNum) || isNaN(lonNum)) {
            return NextResponse.json(
                { error: "Invalid lat or lon parameter" },
                { status: 400 }
            )
        }

        if (cloudNum && (isNaN(cloudNum) || cloudNum < 0 || cloudNum > 100)) {
            return NextResponse.json(
                { error: "Invalid cloud parameter. Must be a number between 0 and 100" },
                { status: 400 }
            )
        }

        const results = []
        
        const uniqueMonths = months.filter((m, index, self) => 
            index === self.findIndex(t => t.year === m.year && t.month === m.month)
        )
        
        for (const monthData of uniqueMonths) {
            const { year, month } = monthData
            const dateRange = getMonthDateRange(year, month)
            
            try {
                const ndvi = await getNdviAtPoint(latNum, lonNum, dateRange.start, dateRange.end, bbox, cloudNum)
                results.push({
                    year,
                    month,
                    ndvi: ndvi !== null && ndvi !== undefined ? ndvi : null
                })
            } catch (error) {
                if (error.message && error.message.includes("No images found")) {
                    results.push({
                        year,
                        month,
                        ndvi: null
                    })
                } else {
                    console.error(`Error fetching NDVI for ${year}-${month}:`, error)
                    results.push({
                        year,
                        month,
                        ndvi: null
                    })
                }
            }
        }

        return NextResponse.json({ results })
    } catch (error) {
        console.error("Error in /api/ndvi/point/months:", error)
        return NextResponse.json(
            { error: error.message || "Failed to get NDVI for multiple months" },
            { status: 500 }
        )
    }
}

