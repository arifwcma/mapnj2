import { useState, useCallback, useRef } from "react"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"
import { DEFAULT_INDEX } from "@/app/lib/indexConfig"

export function useOverlayTiles() {
    const [indexTileUrl, setIndexTileUrl] = useState(null)
    const [rgbTileUrl, setRgbTileUrl] = useState(null)
    const [overlayType, setOverlayType] = useState("INDEX")
    const [overlayLoading, setOverlayLoading] = useState(false)
    const loadingRef = useRef(false)

    const loadOverlayTile = useCallback(async (bbox, cloud, year, month, overlay, geometry = null, indexName = DEFAULT_INDEX) => {
        if (!bbox || loadingRef.current || !year || !month) {
            return
        }

        loadingRef.current = true
        setOverlayLoading(true)

        try {
            const bboxStr = bboxToString(bbox)
            const dateRange = getMonthDateRange(year, month)
            const geometryParam = geometry ? `&geometry=${encodeURIComponent(JSON.stringify(geometry))}` : ""
            
            if (overlay === "INDEX" || overlay === "NDVI") {
                const tileResponse = await fetch(`/api/index/average?start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloud}&index=${indexName}${geometryParam}`)
                if (!tileResponse.ok) throw new Error("Failed to get index tile")
                const tileData = await tileResponse.json()
                setIndexTileUrl(tileData.tileUrl)
                setRgbTileUrl(null)
            } else if (overlay === "RGB") {
                const tileResponse = await fetch(`/api/rgb/average?start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloud}${geometryParam}`)
                if (!tileResponse.ok) throw new Error("Failed to get RGB tile")
                const tileData = await tileResponse.json()
                setRgbTileUrl(tileData.tileUrl)
                setIndexTileUrl(null)
            } else {
                setIndexTileUrl(null)
                setRgbTileUrl(null)
            }
        } catch (err) {
            setIndexTileUrl(null)
            setRgbTileUrl(null)
        } finally {
            setOverlayLoading(false)
            loadingRef.current = false
        }
    }, [])

    const clearTiles = useCallback(() => {
        setIndexTileUrl(null)
        setRgbTileUrl(null)
    }, [])

    return {
        indexTileUrl,
        rgbTileUrl,
        overlayType,
        overlayLoading,
        setOverlayType,
        loadOverlayTile,
        clearTiles
    }
}
