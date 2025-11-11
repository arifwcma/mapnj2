import { ee, initEarthEngine } from "@/app/lib/earthengine"

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export function getMonthDateRange(year, month) {
    const start = `${year}-${String(month).padStart(2, "0")}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    return { start, end }
}

function getPreviousMonth(year, month) {
    if (month === 1) {
        return { year: year - 1, month: 12 }
    }
    return { year, month: month - 1 }
}

export async function countAvailableImages(start, end, bbox, cloud = 30) {
    await initEarthEngine()

    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(parseFloat)

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format. Expected: minLng,minLat,maxLng,maxLat")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])

    const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud))

    return await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                const errorMsg = err.message || err.toString() || "Unknown Earth Engine error"
                reject(new Error(errorMsg))
                return
            }
            resolve(size)
        })
    })
}

export async function findAvailableMonth(bbox, cloud = 30) {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const bboxStr = Array.isArray(bbox) 
        ? `${bbox[0][1]},${bbox[0][0]},${bbox[1][1]},${bbox[1][0]}`
        : bbox

    const currentDateRange = getMonthDateRange(currentYear, currentMonth)
    
    let count
    try {
        count = await countAvailableImages(currentDateRange.start, currentDateRange.end, bboxStr, cloud)
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || "Unknown error"
        throw new Error(`Failed to count images for current month: ${errorMsg}`)
    }
    
    if (count > 0) {
        return {
            year: currentYear,
            month: currentMonth,
            monthName: MONTH_NAMES[currentMonth - 1],
            count,
            start: currentDateRange.start,
            end: currentDateRange.end
        }
    }

    const { year: prevYear, month: prevMonth } = getPreviousMonth(currentYear, currentMonth)
    const prevDateRange = getMonthDateRange(prevYear, prevMonth)

    try {
        count = await countAvailableImages(prevDateRange.start, prevDateRange.end, bboxStr, cloud)
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || "Unknown error"
        throw new Error(`Failed to count images for previous month: ${errorMsg}`)
    }
    
    return {
        year: prevYear,
        month: prevMonth,
        monthName: MONTH_NAMES[prevMonth - 1],
        count,
        start: prevDateRange.start,
        end: prevDateRange.end
    }
}

export async function getAverageNdviTile(start, end, bbox, cloud = 30) {
    await initEarthEngine()

    const [minLng, minLat, maxLng, maxLat] = Array.isArray(bbox)
        ? [bbox[0][1], bbox[0][0], bbox[1][1], bbox[1][0]]
        : bbox.split(",").map(parseFloat)

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])

    const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud))
        .map(img => img.normalizedDifference(["B8", "B4"]).rename("NDVI"))

    const mean = collection.mean().clip(rectangle)
    const vis = { min: -1, max: 1, palette: ["red", "yellow", "green"] }

    return await new Promise((resolve, reject) => {
        mean.getMap(vis, (mapObj, err) => {
            if (err) {
                reject(err)
                return
            }
            const tileUrl = `https://earthengine.googleapis.com/v1/${mapObj.mapid}/tiles/{z}/{x}/{y}`
            resolve(tileUrl)
        })
    })
}

export async function getNdviAtPoint(lat, lon, start, end, bbox, cloud = 30) {
    await initEarthEngine()

    const [minLng, minLat, maxLng, maxLat] = Array.isArray(bbox)
        ? [bbox[0][1], bbox[0][0], bbox[1][1], bbox[1][0]]
        : bbox.split(",").map(parseFloat)

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format")
    }

    if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Invalid lat/lon format")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    const point = ee.Geometry.Point([lon, lat])

    const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud))
        .map(img => img.normalizedDifference(["B8", "B4"]).rename("NDVI"))

    return await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                const errorMsg = err.message || err.toString() || "Unknown Earth Engine error"
                console.error("Earth Engine error checking collection size:", errorMsg)
                reject(new Error(errorMsg))
                return
            }
            
            if (size === 0) {
                reject(new Error("No images found for the specified criteria"))
                return
            }
            
            const mean = collection.mean().clip(rectangle)
            const sampled = mean.sampleRegions({
                collection: ee.FeatureCollection([ee.Feature(point)]),
                scale: 10,
                tileScale: 2
            })
            
            sampled.first().getInfo((feature, err) => {
                if (err) {
                    const errorMsg = err.message || err.toString() || "Unknown Earth Engine error"
                    console.error("Earth Engine error:", errorMsg)
                    reject(new Error(errorMsg))
                    return
                }
                const ndviValue = feature?.properties?.NDVI
                if (ndviValue === null || ndviValue === undefined) {
                    console.log("No NDVI value found at point")
                    reject(new Error("No NDVI value found at this point"))
                    return
                }
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                const startDate = new Date(start)
                const monthYear = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`
                console.log(`NDVI value retrieved for ${monthYear}:`, ndviValue)
                resolve(ndviValue)
            })
        })
    })
}
