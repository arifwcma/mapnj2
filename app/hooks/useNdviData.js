import { useState, useCallback, useRef } from "react"
import { getMonthDateRange } from "@/app/lib/earthengineUtils"

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const MIN_YEAR = 2019
const MIN_MONTH = 1

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
    const [endMonth, setEndMonth] = useState(null)
    const [endYear, setEndYear] = useState(null)
    const [endMonthNum, setEndMonthNum] = useState(null)
    const [imageCount, setImageCount] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [cloudTolerance, setCloudTolerance] = useState(30)
    const [selectedYear, setSelectedYear] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(null)
    const loadingRef = useRef(false)

    const loadNdviData = useCallback(async (bbox, cloud = 30, year = null, month = null) => {
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

            const tileResponse = await fetch(`/api/ndvi/average?start=${monthData.start}&end=${monthData.end}&bbox=${bboxStr}&cloud=${cloud}`)
            if (!tileResponse.ok) throw new Error("Failed to get NDVI tile")
            const tileData = await tileResponse.json()

            setEndMonth(`${monthData.monthName} ${monthData.year}`)
            setEndYear(monthData.year)
            setEndMonthNum(monthData.month)
            setImageCount(monthData.count)
            
            if (!year || !month) {
                setSelectedYear(monthData.year)
                setSelectedMonth(monthData.month)
            }
            
            if (monthData.count > 0) {
                setNdviTileUrl(tileData.tileUrl)
            } else {
                setNdviTileUrl(null)
            }
        } catch (err) {
            setError(err.message)
            setNdviTileUrl(null)
            setEndMonth(null)
            setEndYear(null)
            setEndMonthNum(null)
            setImageCount(null)
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
        setEndMonth(null)
        setEndYear(null)
        setEndMonthNum(null)
        setImageCount(null)
        setSelectedYear(null)
        setSelectedMonth(null)
        setError(null)
    }, [])

    const isImageAvailable = useCallback(() => {
        return imageCount !== null && imageCount > 0
    }, [imageCount])

    const getMaxSliderValue = useCallback(() => {
        if (!endYear || !endMonthNum) return 0
        return monthYearToSliderValue(endYear, endMonthNum)
    }, [endYear, endMonthNum])

    const getCurrentSliderValue = useCallback(() => {
        if (!selectedYear || !selectedMonth) return 0
        return monthYearToSliderValue(selectedYear, selectedMonth)
    }, [selectedYear, selectedMonth])

    return {
        ndviTileUrl,
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
        isImageAvailable,
        getMaxSliderValue,
        getCurrentSliderValue,
        sliderValueToMonthYear,
        monthYearToSliderValue
    }
}
