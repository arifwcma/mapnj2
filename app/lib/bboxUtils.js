export function bboxToString(bbox) {
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 2) {
        return null
    }
    return `${bbox[0][1]},${bbox[0][0]},${bbox[1][1]},${bbox[1][0]}`
}

export function bboxToArray(bbox) {
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 2) {
        return null
    }
    return [bbox[0][1], bbox[0][0], bbox[1][1], bbox[1][0]]
}

export function validatePointInBounds(lat, lon, bounds) {
    if (!bounds || !Array.isArray(bounds) || bounds.length !== 2) {
        return false
    }
    const [minLat, minLng] = bounds[0]
    const [maxLat, maxLng] = bounds[1]
    return lat >= minLat && lat <= maxLat && lon >= minLng && lon <= maxLng
}

export function getAreaCenter(area) {
    if (area.bounds) {
        const centerLat = (area.bounds[0][0] + area.bounds[1][0]) / 2
        const centerLon = (area.bounds[0][1] + area.bounds[1][1]) / 2
        return { lat: centerLat, lon: centerLon }
    }
    if (area.geometry?.geometry?.type === "Polygon" && area.geometry.geometry.coordinates?.[0]) {
        const coords = area.geometry.geometry.coordinates[0]
        let sumLat = 0, sumLon = 0
        for (let i = 0; i < coords.length - 1; i++) {
            sumLon += coords[i][0]
            sumLat += coords[i][1]
        }
        return {
            lat: sumLat / (coords.length - 1),
            lon: sumLon / (coords.length - 1)
        }
    }
    return null
}

export function createPointBbox(lat, lon, bufferDegrees = 0.01) {
    return [
        [lat - bufferDegrees, lon - bufferDegrees],
        [lat + bufferDegrees, lon + bufferDegrees]
    ]
}

function extractCoordinates(geometry) {
    if (geometry.type === "Point") {
        return [[geometry.coordinates[1], geometry.coordinates[0]]]
    } else if (geometry.type === "LineString" || geometry.type === "MultiPoint") {
        return geometry.coordinates.map(c => [c[1], c[0]])
    } else if (geometry.type === "Polygon" || geometry.type === "MultiLineString") {
        return geometry.coordinates.flat().map(c => [c[1], c[0]])
    } else if (geometry.type === "MultiPolygon") {
        return geometry.coordinates.flat(2).map(c => [c[1], c[0]])
    }
    return []
}

function getFeatureBounds(feature) {
    if (!feature || !feature.geometry) {
        return null
    }
    const coords = extractCoordinates(feature.geometry)
    if (coords.length === 0) {
        return null
    }
    let minLat = coords[0][0]
    let maxLat = coords[0][0]
    let minLng = coords[0][1]
    let maxLng = coords[0][1]
    coords.forEach(([lat, lng]) => {
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
    })
    return [[minLat, minLng], [maxLat, maxLng]]
}

export function featureIntersectsBbox(feature, bbox) {
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 2) {
        return false
    }
    const featureBounds = getFeatureBounds(feature)
    if (!featureBounds) {
        return false
    }
    const [bboxMinLat, bboxMinLng] = bbox[0]
    const [bboxMaxLat, bboxMaxLng] = bbox[1]
    const [featMinLat, featMinLng] = featureBounds[0]
    const [featMaxLat, featMaxLng] = featureBounds[1]
    
    return !(featMaxLat < bboxMinLat || featMinLat > bboxMaxLat || 
             featMaxLng < bboxMinLng || featMinLng > bboxMaxLng)
}

