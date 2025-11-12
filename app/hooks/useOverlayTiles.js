import { useState, useCallback, useRef } from "react"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"

export function useOverlayTiles() {
    const [ndviTileUrl, setNdviTileUrl] = useState(null)
    const [rgbTileUrl, setRgbTileUrl] = useState(null)
    const [overlayType, setOverlayType] = useState("NDVI")
    const [overlayLoading, setOverlayLoading] = useState(false)
    const loadingRef = useRef(false)

    const loadOverlayTile = useCallback(async (bbox, cloud, year, month, overlay) => {
        if (!bbox || loadingRef.current || !year || !month) {
            return
        }

        loadingRef.current = true
        setOverlayLoading(true)

        try {
            const bboxStr = bboxToString(bbox)
            const dateRange = getMonthDateRange(year, month)
            
            if (overlay === "NDVI") {
                const tileResponse = await fetch(`/api/ndvi/average?start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloud}`)
                if (!tileResponse.ok) throw new Error("Failed to get NDVI tile")
                const tileData = await tileResponse.json()
                setNdviTileUrl(tileData.tileUrl)
                setRgbTileUrl(null)
            } else if (overlay === "RGB") {
                const tileResponse = await fetch(`/api/rgb/average?start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloud}`)
                if (!tileResponse.ok) throw new Error("Failed to get RGB tile")
                const tileData = await tileResponse.json()
                setRgbTileUrl(tileData.tileUrl)
                setNdviTileUrl(null)
            } else {
                setNdviTileUrl(null)
                setRgbTileUrl(null)
            }
        } catch (err) {
            setNdviTileUrl(null)
            setRgbTileUrl(null)
        } finally {
            setOverlayLoading(false)
            loadingRef.current = false
        }
    }, [])

    const clearTiles = useCallback(() => {
        setNdviTileUrl(null)
        setRgbTileUrl(null)
    }, [])

    return {
        ndviTileUrl,
        rgbTileUrl,
        overlayType,
        overlayLoading,
        setOverlayType,
        loadOverlayTile,
        clearTiles
    }
}

