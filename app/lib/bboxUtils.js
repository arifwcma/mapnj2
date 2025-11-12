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

