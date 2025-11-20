export const SATELLITES = {
    sentinel2: {
        id: "sentinel2",
        name: "Sentinel-2",
        collectionId: "COPERNICUS/S2_SR_HARMONIZED",
        minYear: 2019,
        minMonth: 1,
        cloudFilterProperty: "CLOUDY_PIXEL_PERCENTAGE",
        getCollection: (ee) => {
            return ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        },
        calculateNDVI: (image) => {
            return image.normalizedDifference(["B8", "B4"]).rename("NDVI")
        },
        getCloudFilter: (ee, cloud) => {
            return ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud)
        },
        getScale: () => {
            return 10
        },
        getRgbBands: () => {
            return ["B4", "B3", "B2"]
        },
        getRgbVis: () => {
            return { min: 0, max: 3000, bands: ["B4", "B3", "B2"] }
        }
    },
    modis: {
        id: "modis",
        name: "MODIS",
        collectionId: "MODIS/061/MOD13Q1",
        minYear: 2001,
        minMonth: 1,
        cloudFilterProperty: "SummaryQA",
        getCollection: (ee) => {
            return ee.ImageCollection("MODIS/061/MOD13Q1")
        },
        calculateNDVI: (image, reliability = 0) => {
            const ndvi = image.select("NDVI").multiply(0.0001)
            const mask = image.select("SummaryQA").eq(reliability)
            return ndvi.updateMask(mask).rename("NDVI")
        },
        getCloudFilter: (ee, reliability) => {
            return ee.Filter.eq("SummaryQA", reliability)
        },
        getReliabilityMask: (image, reliability) => {
            const qa = image.select("SummaryQA")
            const mask = qa.eq(reliability)
            return mask
        },
        getScale: () => {
            return 250
        },
        getRgbBands: () => {
            return ["sur_refl_b02", "sur_refl_b01", "sur_refl_b03"]
        },
        getRgbVis: () => {
            return { min: 0, max: 3000, bands: ["sur_refl_b02", "sur_refl_b01", "sur_refl_b03"] }
        }
    }
}

export const DEFAULT_SATELLITE = "sentinel2"

export function getSatelliteConfig(satelliteId) {
    return SATELLITES[satelliteId] || SATELLITES[DEFAULT_SATELLITE]
}

