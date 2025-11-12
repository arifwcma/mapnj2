import { useState, useCallback } from "react"
import { monthYearToSliderValue, sliderValueToMonthYear } from "@/app/lib/sliderUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"

export function useTimeSelection() {
    const [selectedYear, setSelectedYear] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(null)
    const [initialEndYear, setInitialEndYear] = useState(null)
    const [initialEndMonthNum, setInitialEndMonthNum] = useState(null)

    const updateSelectedMonth = useCallback((year, month) => {
        setSelectedYear(year)
        setSelectedMonth(month)
    }, [])

    const setInitialTime = useCallback((year, month) => {
        if (!initialEndYear || !initialEndMonthNum) {
            setInitialEndYear(year)
            setInitialEndMonthNum(month)
        }
    }, [initialEndYear, initialEndMonthNum])

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

    const clearTime = useCallback(() => {
        setSelectedYear(null)
        setSelectedMonth(null)
        setInitialEndYear(null)
        setInitialEndMonthNum(null)
    }, [])

    return {
        selectedYear,
        selectedMonth,
        initialEndYear,
        initialEndMonthNum,
        updateSelectedMonth,
        setInitialTime,
        getMaxSliderValue,
        getCurrentSliderValue,
        getCurrentDateRange,
        sliderValueToMonthYear,
        monthYearToSliderValue,
        clearTime
    }
}

