import { useState, useCallback, useRef } from "react"
import { useOverlayTiles } from "./useOverlayTiles"
import { useTimeSelection } from "./useTimeSelection"
import { useImageFilters } from "./useImageFilters"
import { MONTH_NAMES_FULL, DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"

export default function useNdviData() {
    const overlayTiles = useOverlayTiles()
    const timeSelection = useTimeSelection()
    const imageFilters = useImageFilters()
    
    const [endMonth, setEndMonth] = useState(null)
    const [endYear, setEndYear] = useState(null)
    const [endMonthNum, setEndMonthNum] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const loadingRef = useRef(false)
    
    const overlayTilesRef = useRef(overlayTiles)
    const timeSelectionRef = useRef(timeSelection)
    const imageFiltersRef = useRef(imageFilters)
    
    overlayTilesRef.current = overlayTiles
    timeSelectionRef.current = timeSelection
    imageFiltersRef.current = imageFilters

    const loadNdviData = useCallback(async (bbox, cloud = DEFAULT_CLOUD_TOLERANCE, year = null, month = null, overlay = "NDVI", geometry = null) => {
        if (!bbox || loadingRef.current) {
            return
        }

        loadingRef.current = true
        setLoading(true)
        setError(null)

        try {
            const bboxStr = bboxToString(bbox)
            
            let monthData
            if (year && month) {
                const dateRange = getMonthDateRange(year, month)
                const countResponse = await fetch(`/api/count_available?start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloud}`)
                if (!countResponse.ok) throw new Error("Failed to count images")
                const countData = await countResponse.json()
                
                monthData = {
                    year,
                    month,
                    monthName: MONTH_NAMES_FULL[month - 1],
                    count: countData.count,
                    start: dateRange.start,
                    end: dateRange.end
                }
            } else {
                const monthResponse = await fetch(`/api/find_month?bbox=${bboxStr}&cloud=${cloud}`)
                if (!monthResponse.ok) throw new Error("Failed to find available month")
                monthData = await monthResponse.json()
            }

            if (monthData.count > 0) {
                await overlayTilesRef.current.loadOverlayTile(bbox, cloud, monthData.year, monthData.month, overlay, geometry)
            } else {
                overlayTilesRef.current.clearTiles()
            }

            setEndMonth(`${monthData.monthName} ${monthData.year}`)
            setEndYear(monthData.year)
            setEndMonthNum(monthData.month)
            imageFiltersRef.current.setImageCount(monthData.count)
            
            if (!year || !month) {
                timeSelectionRef.current.updateSelectedMonth(monthData.year, monthData.month)
            } else {
                setEndMonth(`${monthData.monthName} ${monthData.year}`)
            }
        } catch (err) {
            setError(err.message)
            overlayTilesRef.current.clearTiles()
            setEndMonth(null)
            setEndYear(null)
            setEndMonthNum(null)
            imageFiltersRef.current.setImageCount(null)
            timeSelectionRef.current.clearTime()
        } finally {
            setLoading(false)
            loadingRef.current = false
        }
    }, [])

    const clearNdvi = useCallback(() => {
        overlayTilesRef.current.clearTiles()
        setEndMonth(null)
        setEndYear(null)
        setEndMonthNum(null)
        imageFiltersRef.current.clearFilters()
        timeSelectionRef.current.clearTime()
        setError(null)
    }, [])

    return {
        ndviTileUrl: overlayTiles.ndviTileUrl,
        rgbTileUrl: overlayTiles.rgbTileUrl,
        overlayType: overlayTiles.overlayType,
        endMonth,
        endYear,
        endMonthNum,
        imageCount: imageFilters.imageCount,
        loading,
        overlayLoading: overlayTiles.overlayLoading,
        error,
        cloudTolerance: imageFilters.cloudTolerance,
        selectedYear: timeSelection.selectedYear,
        selectedMonth: timeSelection.selectedMonth,
        loadNdviData,
        updateCloudTolerance: imageFilters.updateCloudTolerance,
        updateSelectedMonth: timeSelection.updateSelectedMonth,
        clearNdvi,
        setOverlayType: overlayTiles.setOverlayType,
        loadOverlayTileOnly: overlayTiles.loadOverlayTile,
        isImageAvailable: imageFilters.isImageAvailable
    }
}
