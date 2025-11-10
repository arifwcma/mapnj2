import { ee, initEarthEngine } from "@/app/lib/earthengine"

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
                reject(err)
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

    const currentStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`
    const currentEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`

    let count = await countAvailableImages(currentStart, currentEnd, bboxStr, cloud)
    
    if (count > 0) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        return {
            year: currentYear,
            month: currentMonth,
            monthName: monthNames[currentMonth - 1],
            count,
            start: currentStart,
            end: currentEnd
        }
    }

    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const prevStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`
    const prevEnd = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${new Date(prevYear, prevMonth + 1, 0).getDate()}`

    count = await countAvailableImages(prevStart, prevEnd, bboxStr, cloud)
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    
    return {
        year: prevYear,
        month: prevMonth,
        monthName: monthNames[prevMonth - 1],
        count,
        start: prevStart,
        end: prevEnd
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
    const vis = { min: -1, max: 1, palette: ["blue", "white", "yellow", "green", "darkgreen"] }

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

