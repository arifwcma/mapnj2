import { useState, useCallback } from "react"

export function useTimeSelection() {
    const [selectedYear, setSelectedYear] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(null)

    const updateSelectedMonth = useCallback((year, month) => {
        setSelectedYear(year)
        setSelectedMonth(month)
    }, [])

    const clearTime = useCallback(() => {
        setSelectedYear(null)
        setSelectedMonth(null)
    }, [])

    return {
        selectedYear,
        selectedMonth,
        updateSelectedMonth,
        clearTime
    }
}

