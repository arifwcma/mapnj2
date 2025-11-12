import { useState, useCallback, useRef } from "react"

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const MIN_YEAR = 2019
const MIN_MONTH = 1

function getMonthDateRange(year, month) {
    const start = `${year}-${String(month).padStart(2, "0")}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    return { start, end }
}

function monthYearToSliderValue(year, month) {
    return (year - MIN_YEAR) * 12 + (month - MIN_MONTH)
}

function sliderValueToMonthYear(value) {
    const totalMonths = Math.floor(value)
    const year = MIN_YEAR + Math.floor(totalMonths / 12)
    const month = (totalMonths % 12) + 1
    return { year, month }
}

export default function useNdviData() {
    const [ndviTileUrl, setNdviTileUrl] = useState(null)
    const [rgbTileUrl, setRgbTileUrl] = useState(null)
    const [overlayType, setOverlayType] = useState("NDVI")
    const [endMonth, setEndMonth] = useState(null)
    const [endYear, setEndYear] = useState(null)
    const [endMonthNum, setEndMonthNum] = useState(null)
    const [initialEndYear, setInitialEndYear] = useState(null)
    const [initialEndMonthNum, setInitialEndMonthNum] = useState(null)
    const [imageCount, setImageCount] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [cloudTolerance, setCloudTolerance] = useState(30)
    const [selectedYear, setSelectedYear] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(null)
    const loadingRef = useRef(false)

    const loadNdviData = useCallback(async (bbox, cloud = 30, year = null, month = null, overlay = "NDVI") => {
        if (!bbox || loadingRef.current) {
            return
        }

        loadingRef.current = true
        setLoading(true)
        setError(null)

        try {
            const bboxStr = `${bbox[0][1]},${bbox[0][0]},${bbox[1][1]},${bbox[1][0]}`
            
            let monthData
            if (year && month) {
                const dateRange = getMonthDateRange(year, month)
                const countResponse = await fetch(`/api/count_available?start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloud}`)
                if (!countResponse.ok) throw new Error("Failed to count images")
                const countData = await countResponse.json()
                
                monthData = {
                    year,
                    month,
                    monthName: MONTH_NAMES[month - 1],
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
                if (overlay === "NDVI") {
                    const tileResponse = await fetch(`/api/ndvi/average?start=${monthData.start}&end=${monthData.end}&bbox=${bboxStr}&cloud=${cloud}`)
                    if (!tileResponse.ok) throw new Error("Failed to get NDVI tile")
                    const tileData = await tileResponse.json()
                    setNdviTileUrl(tileData.tileUrl)
                    setRgbTileUrl(null)
                } else if (overlay === "RGB") {
                    const tileResponse = await fetch(`/api/rgb/average?start=${monthData.start}&end=${monthData.end}&bbox=${bboxStr}&cloud=${cloud}`)
                    if (!tileResponse.ok) throw new Error("Failed to get RGB tile")
                    const tileData = await tileResponse.json()
                    setRgbTileUrl(tileData.tileUrl)
                    setNdviTileUrl(null)
                } else {
                    setNdviTileUrl(null)
                    setRgbTileUrl(null)
                }
            } else {
                setNdviTileUrl(null)
                setRgbTileUrl(null)
            }

            setEndMonth(`${monthData.monthName} ${monthData.year}`)
            setEndYear(monthData.year)
            setEndMonthNum(monthData.month)
            setImageCount(monthData.count)
            
            if (!year || !month) {
                setSelectedYear(monthData.year)
                setSelectedMonth(monthData.month)
                if (!initialEndYear || !initialEndMonthNum) {
                    setInitialEndYear(monthData.year)
                    setInitialEndMonthNum(monthData.month)
                }
            } else {
                setEndMonth(`${monthData.monthName} ${monthData.year}`)
            }
        } catch (err) {
            setError(err.message)
            setNdviTileUrl(null)
            setRgbTileUrl(null)
            setEndMonth(null)
            setEndYear(null)
            setEndMonthNum(null)
            setImageCount(null)
            setInitialEndYear(null)
            setInitialEndMonthNum(null)
        } finally {
            setLoading(false)
            loadingRef.current = false
        }
    }, [])

    const updateCloudTolerance = useCallback((cloud) => {
        setCloudTolerance(cloud)
    }, [])

    const updateSelectedMonth = useCallback((year, month) => {
        setSelectedYear(year)
        setSelectedMonth(month)
    }, [])

    const clearNdvi = useCallback(() => {
        setNdviTileUrl(null)
        setRgbTileUrl(null)
        setEndMonth(null)
        setEndYear(null)
        setEndMonthNum(null)
        setImageCount(null)
        setSelectedYear(null)
        setSelectedMonth(null)
        setInitialEndYear(null)
        setInitialEndMonthNum(null)
        setError(null)
    }, [])

    const setOverlayTypeState = useCallback((type) => {
        setOverlayType(type)
    }, [])

    const isImageAvailable = useCallback(() => {
        return imageCount !== null && imageCount > 0
    }, [imageCount])

    const getMaxSliderValue = useCallback(() => {
        if (!initialEndYear || !initialEndMonthNum) return 0
        return monthYearToSliderValue(initialEndYear, initialEndMonthNum)
    }, [initialEndYear, initialEndMonthNum])

    const getCurrentSliderValue = useCallback(() => {
        if (!selectedYear || !selectedMonth) return 0
        return monthYearToSliderValue(selectedYear, selectedMonth)
    }, [selectedYear, selectedMonth])

    const getCurrentDateRange = useCallback(() => {
        if (!selectedYear || !selectedMonth) return null
        return getMonthDateRange(selectedYear, selectedMonth)
    }, [selectedYear, selectedMonth])

    return {
        ndviTileUrl,
        rgbTileUrl,
        overlayType,
        endMonth,
        endYear,
        endMonthNum,
        imageCount,
        loading,
        error,
        cloudTolerance,
        selectedYear,
        selectedMonth,
        loadNdviData,
        updateCloudTolerance,
        updateSelectedMonth,
        clearNdvi,
        setOverlayType: setOverlayTypeState,
        isImageAvailable,
        getMaxSliderValue,
        getCurrentSliderValue,
        sliderValueToMonthYear,
        monthYearToSliderValue,
        getCurrentDateRange
    }
}
