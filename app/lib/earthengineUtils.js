import { ee, initEarthEngine } from "@/app/lib/earthengine"
import { MONTH_NAMES_FULL, DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"
import { getMonthDateRange, getPreviousMonth } from "@/app/lib/dateUtils"
import { bboxToArray, createPointBbox } from "@/app/lib/bboxUtils"

const SENTINEL2_START_DATE = "2019-01-01"

function shouldUseMODIS(startDate) {
    return startDate < SENTINEL2_START_DATE
}

export async function countAvailableImages(start, end, bbox, cloud = DEFAULT_CLOUD_TOLERANCE) {
    if (shouldUseMODIS(start)) {
        return await countAvailableImagesMODIS(start, end, bbox)
    }

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

export async function findAvailableMonth(bbox, cloud = DEFAULT_CLOUD_TOLERANCE) {
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
            monthName: MONTH_NAMES_FULL[currentMonth - 1],
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
            monthName: MONTH_NAMES_FULL[prevMonth - 1],
        count,
        start: prevDateRange.start,
        end: prevDateRange.end
    }
}

export async function findRecentSnapshot(bbox) {
    const now = new Date()
    let currentYear = now.getFullYear()
    let currentMonth = now.getMonth() + 1

    const bboxStr = Array.isArray(bbox) 
        ? `${bbox[0][1]},${bbox[0][0]},${bbox[1][1]},${bbox[1][0]}`
        : bbox

    const maxMonthsToSearch = 60

    for (let i = 0; i < maxMonthsToSearch; i++) {
        const dateRange = getMonthDateRange(currentYear, currentMonth)
        
        try {
            const count = await countAvailableImages(dateRange.start, dateRange.end, bboxStr, 10)
            
            if (count > 0) {
                return {
                    year: currentYear,
                    month: currentMonth,
                    monthName: MONTH_NAMES_FULL[currentMonth - 1],
                    count,
                    start: dateRange.start,
                    end: dateRange.end
                }
            }
        } catch (error) {
            console.error(`Error checking ${currentYear}-${currentMonth}:`, error)
        }

        const prev = getPreviousMonth(currentYear, currentMonth)
        currentYear = prev.year
        currentMonth = prev.month
    }

    return null
}

function geoJsonToEeGeometry(geoJson) {
    if (!geoJson || !geoJson.geometry) {
        return null
    }

    const geom = geoJson.geometry
    const coords = geom.coordinates

    if (geom.type === "Polygon") {
        const rings = coords.map(ring => 
            ring.map(([lng, lat]) => [lng, lat])
        )
        return ee.Geometry.Polygon(rings)
    } else if (geom.type === "MultiPolygon") {
        const polygons = coords.map(polygon => 
            polygon.map(ring => 
                ring.map(([lng, lat]) => [lng, lat])
            )
        )
        return ee.Geometry.MultiPolygon(polygons)
    }

    return null
}

async function countAvailableImagesMODIS(start, end, bbox) {
    await initEarthEngine()

    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(parseFloat)

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format. Expected: minLng,minLat,maxLng,maxLat")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])

    const collection = ee.ImageCollection("MODIS/061/MOD13Q1")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)

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

async function getNdviAtPointMODIS(lat, lon, start, end) {
    console.log(`[getNdviAtPointMODIS] Starting MODIS query:`, { lat, lon, start, end })
    await initEarthEngine()

    if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Invalid lat or lon")
    }

    const pointBbox = createPointBbox(lat, lon, 0.01)
    const [minLat, minLon] = pointBbox[0]
    const [maxLat, maxLon] = pointBbox[1]
    console.log(`[getNdviAtPointMODIS] Point bbox:`, { minLat, minLon, maxLat, maxLon })

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")
    console.log(`[getNdviAtPointMODIS] Date range:`, { start, end })

    const rectangle = ee.Geometry.Rectangle([minLon, minLat, maxLon, maxLat])
    const point = ee.Geometry.Point([lon, lat])

    const collection = ee.ImageCollection("MODIS/061/MOD13Q1")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .map(img => {
            const qa = img.select("SummaryQA")
            const mask = qa.eq(0)
            return img.select("NDVI").multiply(0.0001).updateMask(mask).rename("NDVI")
        })

    console.log(`[getNdviAtPointMODIS] Checking collection size...`)
    const collectionSize = await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                console.error(`[getNdviAtPointMODIS] Error getting collection size:`, err)
                reject(err)
                return
            }
            console.log(`[getNdviAtPointMODIS] Collection size:`, size)
            resolve(size)
        })
    })

    if (collectionSize === 0) {
        console.log(`[getNdviAtPointMODIS] No images found in collection`)
        throw new Error("No images found")
    }

    console.log(`[getNdviAtPointMODIS] Computing mean and reducing region...`)
    const mean = collection.mean().clip(rectangle)

    const ndviValue = mean.select("NDVI").reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: point,
        scale: 250,
        maxPixels: 1e9
    }).get("NDVI")

    return await new Promise((resolve, reject) => {
        ndviValue.getInfo((value, err) => {
            if (err) {
                console.error(`[getNdviAtPointMODIS] Error getting NDVI value:`, err)
                const errorMsg = err.message || err.toString() || "Unknown Earth Engine error"
                reject(new Error(errorMsg))
                return
            }
            console.log(`[getNdviAtPointMODIS] NDVI value retrieved:`, value)
            resolve(value)
        })
    })
}

async function getAverageNdviForAreaMODIS(start, end, bbox, geometry = null) {
    await initEarthEngine()

    const bboxArray = Array.isArray(bbox) ? bboxToArray(bbox) : bbox.split(",").map(parseFloat)
    const [minLng, minLat, maxLng, maxLat] = bboxArray || []

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    const clipGeometry = geometry ? geoJsonToEeGeometry(geometry) : rectangle

    if (!clipGeometry) {
        throw new Error("Invalid geometry format")
    }

    const collection = ee.ImageCollection("MODIS/061/MOD13Q1")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .map(img => {
            const qa = img.select("SummaryQA")
            const mask = qa.eq(0)
            return img.select("NDVI").multiply(0.0001).updateMask(mask).rename("NDVI")
        })

    const collectionSize = await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                reject(err)
                return
            }
            resolve(size)
        })
    })

    if (collectionSize === 0) {
        throw new Error("No images found")
    }

    const mean = collection.mean().clip(clipGeometry)

    const ndviValue = mean.select("NDVI").reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: clipGeometry,
        scale: 250,
        maxPixels: 1e9
    }).get("NDVI")

    return await new Promise((resolve, reject) => {
        ndviValue.getInfo((value, err) => {
            if (err) {
                const errorMsg = err.message || err.toString() || "Unknown Earth Engine error"
                reject(new Error(errorMsg))
                return
            }
            resolve(value)
        })
    })
}

async function getAverageNdviThumbnailMODIS(start, end, bbox, geometry = null, dimensions = 1024) {
    await initEarthEngine()

    const bboxArray = Array.isArray(bbox) ? bboxToArray(bbox) : bbox.split(",").map(parseFloat)
    const [minLng, minLat, maxLng, maxLat] = bboxArray || []

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    const clipGeometry = geometry ? geoJsonToEeGeometry(geometry) : rectangle

    if (!clipGeometry) {
        throw new Error("Invalid geometry format")
    }

    const collection = ee.ImageCollection("MODIS/061/MOD13Q1")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .map(img => {
            const qa = img.select("SummaryQA")
            const mask = qa.eq(0)
            return img.select("NDVI").multiply(0.0001).updateMask(mask).rename("NDVI")
        })

    const collectionSize = await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                const errorMsg = err.message || err.toString() || "Unknown Earth Engine error"
                reject(new Error(errorMsg))
                return
            }
            resolve(size)
        })
    })

    if (collectionSize === 0) {
        throw new Error("No images found")
    }

    const mean = collection.mean().clip(clipGeometry)
    const vis = { min: -1, max: 1, palette: ["darkred", "orangered", "red", "yellow", "darkgreen"] }

    return await new Promise((resolve, reject) => {
        mean.getThumbURL({
            dimensions: [dimensions, dimensions],
            region: rectangle,
            format: "png",
            min: vis.min,
            max: vis.max,
            palette: vis.palette
        }, (thumbUrl, err) => {
            if (err) {
                console.error("getThumbURL error details:", {
                    error: err,
                    errorType: typeof err,
                    errorMessage: err?.message || err?.toString(),
                    errorString: String(err),
                    collectionSize: collectionSize,
                    bbox: bboxArray,
                    start: start,
                    end: end
                })
                reject(new Error(err?.message || err?.toString() || "Failed to generate thumbnail"))
                return
            }
            if (!thumbUrl) {
                console.error("getThumbURL returned null/undefined")
                reject(new Error("Thumbnail URL is null"))
                return
            }
            console.log("getThumbURL success:", thumbUrl.substring(0, 100) + "...")
            resolve(thumbUrl)
        })
    })
}

async function getAverageNdviTileMODIS(start, end, bbox, geometry = null) {
    await initEarthEngine()

    const bboxArray = Array.isArray(bbox) ? bboxToArray(bbox) : bbox.split(",").map(parseFloat)
    let [minLng, minLat, maxLng, maxLat] = bboxArray || []

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const originalRectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    
    let rectangle
    let clipGeometry
    
    if (geometry === null) {
        const latDiff = maxLat - minLat
        const lngDiff = maxLng - minLng
        const buffer = Math.max(latDiff, lngDiff) * 0.2
        
        minLat -= buffer
        maxLat += buffer
        minLng -= buffer
        maxLng += buffer
        
        rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
        clipGeometry = originalRectangle
    } else {
        rectangle = originalRectangle
        clipGeometry = geoJsonToEeGeometry(geometry)
    }

    if (!clipGeometry) {
        throw new Error("Invalid geometry format")
    }

    const collection = ee.ImageCollection("MODIS/061/MOD13Q1")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .map(img => {
            const qa = img.select("SummaryQA")
            const mask = qa.eq(0)
            return img.select("NDVI").multiply(0.0001).updateMask(mask).rename("NDVI")
        })

    const collectionSize = await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                reject(err)
                return
            }
            resolve(size)
        })
    })

    if (collectionSize === 0) {
        throw new Error("No images found")
    }

    const mean = collection.sort('system:time_start', false).mosaic().clip(clipGeometry)
    const vis = { min: -1, max: 1, palette: ["darkred", "orangered", "red", "yellow", "darkgreen"] }

    return await new Promise((resolve, reject) => {
        mean.getMap({
            ...vis,
            region: rectangle
        }, (mapObj, err) => {
            if (err) {
                reject(err)
                return
            }
            const tileUrl = `https://earthengine.googleapis.com/v1/${mapObj.mapid}/tiles/{z}/{x}/{y}`
            resolve(tileUrl)
        })
    })
}

export async function getAverageNdviThumbnail(start, end, bbox, cloud = DEFAULT_CLOUD_TOLERANCE, geometry = null, dimensions = 1024) {
    if (shouldUseMODIS(start)) {
        return await getAverageNdviThumbnailMODIS(start, end, bbox, geometry, dimensions)
    }

    await initEarthEngine()

    const bboxArray = Array.isArray(bbox) ? bboxToArray(bbox) : bbox.split(",").map(parseFloat)
    const [minLng, minLat, maxLng, maxLat] = bboxArray || []

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    const clipGeometry = geometry ? geoJsonToEeGeometry(geometry) : rectangle

    if (!clipGeometry) {
        throw new Error("Invalid geometry format")
    }

    const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud))
        .map(img => img.normalizedDifference(["B8", "B4"]).rename("NDVI"))

    const collectionSize = await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                const errorMsg = err.message || err.toString() || "Unknown Earth Engine error"
                reject(new Error(errorMsg))
                return
            }
            resolve(size)
        })
    })

    if (collectionSize === 0) {
        throw new Error("No images found")
    }

    const mean = collection.mean().clip(clipGeometry)
    const vis = { min: -1, max: 1, palette: ["darkred", "orangered", "red", "yellow", "darkgreen"] }

    return await new Promise((resolve, reject) => {
        mean.getThumbURL({
            dimensions: [dimensions, dimensions],
            region: rectangle,
            format: "png",
            min: vis.min,
            max: vis.max,
            palette: vis.palette
        }, (thumbUrl, err) => {
            if (err) {
                console.error("getThumbURL error details:", {
                    error: err,
                    errorType: typeof err,
                    errorMessage: err?.message || err?.toString(),
                    errorString: String(err),
                    collectionSize: collectionSize,
                    bbox: bboxArray,
                    start: start,
                    end: end,
                    cloud: cloud
                })
                reject(new Error(err?.message || err?.toString() || "Failed to generate thumbnail"))
                return
            }
            if (!thumbUrl) {
                console.error("getThumbURL returned null/undefined")
                reject(new Error("Thumbnail URL is null"))
                return
            }
            console.log("getThumbURL success:", thumbUrl.substring(0, 100) + "...")
            resolve(thumbUrl)
        })
    })
}

export async function getAverageNdviTile(start, end, bbox, cloud = DEFAULT_CLOUD_TOLERANCE, geometry = null) {
    if (shouldUseMODIS(start)) {
        return await getAverageNdviTileMODIS(start, end, bbox, geometry)
    }

    await initEarthEngine()

    const bboxArray = Array.isArray(bbox) ? bboxToArray(bbox) : bbox.split(",").map(parseFloat)
    let [minLng, minLat, maxLng, maxLat] = bboxArray || []

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const originalRectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    
    let rectangle
    let clipGeometry
    
    if (geometry === null) {
        const latDiff = maxLat - minLat
        const lngDiff = maxLng - minLng
        const buffer = Math.max(latDiff, lngDiff) * 0.2
        
        minLat -= buffer
        maxLat += buffer
        minLng -= buffer
        maxLng += buffer
        
        rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
        clipGeometry = originalRectangle
    } else {
        rectangle = originalRectangle
        clipGeometry = geoJsonToEeGeometry(geometry)
    }

    if (!clipGeometry) {
        throw new Error("Invalid geometry format")
    }

    const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud))
        .map(img => img.normalizedDifference(["B8", "B4"]).rename("NDVI"))

    const collectionSize = await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                reject(err)
                return
            }
            resolve(size)
        })
    })

    if (collectionSize === 0) {
        throw new Error("No images found")
    }

    const mean = collection.sort('system:time_start', false).mosaic().clip(clipGeometry)
    const vis = { min: -1, max: 1, palette: ["darkred", "orangered", "red", "yellow", "darkgreen"] }

    return await new Promise((resolve, reject) => {
        mean.getMap({
            ...vis,
            region: rectangle
        }, (mapObj, err) => {
            if (err) {
                reject(err)
                return
            }
            const tileUrl = `https://earthengine.googleapis.com/v1/${mapObj.mapid}/tiles/{z}/{x}/{y}`
            resolve(tileUrl)
        })
    })
}

export async function getAverageRgbTile(start, end, bbox, cloud = DEFAULT_CLOUD_TOLERANCE, geometry = null) {
    await initEarthEngine()

    const bboxArray = Array.isArray(bbox) ? bboxToArray(bbox) : bbox.split(",").map(parseFloat)
    const [minLng, minLat, maxLng, maxLat] = bboxArray || []

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    const clipGeometry = geometry ? geoJsonToEeGeometry(geometry) : rectangle

    if (!clipGeometry) {
        throw new Error("Invalid geometry format")
    }

    const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud))

    const mean = collection.mean().clip(clipGeometry)
    const vis = { min: 0, max: 3000, bands: ["B4", "B3", "B2"] }

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

export async function getNdviAtPoint(lat, lon, start, end, bbox, cloud = DEFAULT_CLOUD_TOLERANCE) {
    console.log(`[getNdviAtPoint] Called with:`, { lat, lon, start, end, cloud })
    const useMODIS = shouldUseMODIS(start)
    console.log(`[getNdviAtPoint] shouldUseMODIS(${start}) = ${useMODIS}, SENTINEL2_START_DATE = ${SENTINEL2_START_DATE}`)
    if (useMODIS) {
        console.log(`[getNdviAtPoint] Routing to MODIS`)
        return await getNdviAtPointMODIS(lat, lon, start, end)
    }
    console.log(`[getNdviAtPoint] Routing to Sentinel-2`)

    await initEarthEngine()

    if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Invalid lat or lon")
    }

    const pointBbox = createPointBbox(lat, lon, 0.01)
    const [minLat, minLon] = pointBbox[0]
    const [maxLat, maxLon] = pointBbox[1]

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLon, minLat, maxLon, maxLat])
    const point = ee.Geometry.Point([lon, lat])

    const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud))
        .map(img => img.normalizedDifference(["B8", "B4"]).rename("NDVI"))

    const collectionSize = await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                reject(err)
                return
            }
            resolve(size)
        })
    })

    if (collectionSize === 0) {
        throw new Error("No images found")
    }

    const mean = collection.mean().clip(rectangle)

    const ndviValue = mean.select("NDVI").reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: point,
        scale: 10,
        maxPixels: 1e9
    }).get("NDVI")

    return await new Promise((resolve, reject) => {
        ndviValue.getInfo((value, err) => {
            if (err) {
                const errorMsg = err.message || err.toString() || "Unknown Earth Engine error"
                reject(new Error(errorMsg))
                return
            }
            resolve(value)
        })
    })
}

export async function getNdviAtPointForMonth(lat, lon, year, month, bbox, cloud = DEFAULT_CLOUD_TOLERANCE) {
    const dateRange = getMonthDateRange(year, month)
    return await getNdviAtPoint(lat, lon, dateRange.start, dateRange.end, bbox, cloud)
}

export async function getAverageNdviForArea(start, end, bbox, cloud = DEFAULT_CLOUD_TOLERANCE, geometry = null) {
    if (shouldUseMODIS(start)) {
        return await getAverageNdviForAreaMODIS(start, end, bbox, geometry)
    }

    await initEarthEngine()

    const bboxArray = Array.isArray(bbox) ? bboxToArray(bbox) : bbox.split(",").map(parseFloat)
    const [minLng, minLat, maxLng, maxLat] = bboxArray || []

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error("Invalid bbox format")
    }

    const startDate = ee.Date(start)
    const endDate = ee.Date(end).advance(1, "day")

    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    const clipGeometry = geometry ? geoJsonToEeGeometry(geometry) : rectangle

    if (!clipGeometry) {
        throw new Error("Invalid geometry format")
    }

    const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud))
        .map(img => img.normalizedDifference(["B8", "B4"]).rename("NDVI"))

    const collectionSize = await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                reject(err)
                return
            }
            resolve(size)
        })
    })

    if (collectionSize === 0) {
        throw new Error("No images found")
    }

    const mean = collection.mean().clip(clipGeometry)

    const ndviValue = mean.select("NDVI").reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: clipGeometry,
        scale: 10,
        maxPixels: 1e9
    }).get("NDVI")

    return await new Promise((resolve, reject) => {
        ndviValue.getInfo((value, err) => {
            if (err) {
                const errorMsg = err.message || err.toString() || "Unknown Earth Engine error"
                reject(new Error(errorMsg))
                return
            }
            resolve(value)
        })
    })
}
