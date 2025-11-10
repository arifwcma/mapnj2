import { useState, useCallback, useRef } from "react"

export default function useNdviData() {
    const [ndviTileUrl, setNdviTileUrl] = useState(null)
    const [endMonth, setEndMonth] = useState(null)
    const [imageCount, setImageCount] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [cloudTolerance, setCloudTolerance] = useState(30)
    const loadingRef = useRef(false)

    const loadNdviData = useCallback(async (bbox, cloud = 30) => {
        if (!bbox || loadingRef.current) {
            return
        }

        loadingRef.current = true
        setLoading(true)
        setError(null)

        try {
            const bboxStr = `${bbox[0][1]},${bbox[0][0]},${bbox[1][1]},${bbox[1][0]}`
            
            const monthResponse = await fetch(`/api/find_month?bbox=${bboxStr}&cloud=${cloud}`)
            if (!monthResponse.ok) throw new Error("Failed to find available month")
            const monthData = await monthResponse.json()

            const tileResponse = await fetch(`/api/ndvi/average?start=${monthData.start}&end=${monthData.end}&bbox=${bboxStr}&cloud=${cloud}`)
            if (!tileResponse.ok) throw new Error("Failed to get NDVI tile")
            const tileData = await tileResponse.json()

            setEndMonth(`${monthData.monthName} ${monthData.year}`)
            setImageCount(monthData.count)
            if (monthData.count > 0) {
                setNdviTileUrl(tileData.tileUrl)
            } else {
                setNdviTileUrl(null)
            }
        } catch (err) {
            setError(err.message)
            setNdviTileUrl(null)
            setEndMonth(null)
            setImageCount(null)
        } finally {
            setLoading(false)
            loadingRef.current = false
        }
    }, [])

    const updateCloudTolerance = useCallback((cloud) => {
        setCloudTolerance(cloud)
    }, [])

    const clearNdvi = useCallback(() => {
        setNdviTileUrl(null)
        setEndMonth(null)
        setImageCount(null)
        setError(null)
    }, [])

    const isImageAvailable = useCallback(() => {
        return imageCount !== null && imageCount > 0
    }, [imageCount])

    return {
        ndviTileUrl,
        endMonth,
        imageCount,
        loading,
        error,
        cloudTolerance,
        loadNdviData,
        updateCloudTolerance,
        clearNdvi,
        isImageAvailable
    }
}

