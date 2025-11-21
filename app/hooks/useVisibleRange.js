import { useState, useCallback, useRef } from "react"
import { getInitialVisibleRange } from "@/app/lib/rangeUtils"
import { getPreviousMonth, getNextMonth } from "@/app/lib/dateUtils"
import { getCurrentMonth } from "@/app/lib/monthUtils"
import { MIN_YEAR, MIN_MONTH, DEBOUNCE_DELAYS } from "@/app/lib/config"

export default function useVisibleRange(selectedYear, selectedMonth) {
    const [visibleRange, setVisibleRange] = useState(() => getInitialVisibleRange(selectedYear, selectedMonth))
    const leftArrowDebounceRef = useRef(null)
    const rightArrowDebounceRef = useRef(null)
    
    const updateRangeForMonth = useCallback((year, month) => {
        const newRange = getInitialVisibleRange(year, month)
        setVisibleRange(newRange)
    }, [])
    
    const canGoLeft = useCallback(() => {
        if (!visibleRange) return false
        const { year, month } = visibleRange.startMonth
        return year > MIN_YEAR || (year === MIN_YEAR && month > MIN_MONTH)
    }, [visibleRange])
    
    const canGoRight = useCallback(() => {
        if (!visibleRange) return false
        const current = getCurrentMonth()
        const { year, month } = visibleRange.endMonth
        return year < current.year || (year === current.year && month < current.month)
    }, [visibleRange])
    
    const handleLeftArrow = useCallback(() => {
        if (!canGoLeft() || !visibleRange) return
        
        if (leftArrowDebounceRef.current) {
            clearTimeout(leftArrowDebounceRef.current)
        }
        
        leftArrowDebounceRef.current = setTimeout(() => {
            const prev = getPreviousMonth(visibleRange.startMonth.year, visibleRange.startMonth.month)
            setVisibleRange({
                startMonth: prev,
                endMonth: visibleRange.endMonth
            })
        }, DEBOUNCE_DELAYS.CHART_ARROWS)
    }, [visibleRange, canGoLeft])
    
    const handleRightArrow = useCallback(() => {
        if (!canGoRight() || !visibleRange) return
        
        if (rightArrowDebounceRef.current) {
            clearTimeout(rightArrowDebounceRef.current)
        }
        
        rightArrowDebounceRef.current = setTimeout(() => {
            const nextEnd = getNextMonth(visibleRange.endMonth.year, visibleRange.endMonth.month)
            const current = getCurrentMonth()
            
            if (nextEnd.year > current.year || (nextEnd.year === current.year && nextEnd.month > current.month)) {
                return
            }
            
            setVisibleRange({
                startMonth: visibleRange.startMonth,
                endMonth: nextEnd
            })
        }, DEBOUNCE_DELAYS.CHART_ARROWS)
    }, [visibleRange, canGoRight])
    
    return {
        visibleRange,
        setVisibleRange,
        updateRangeForMonth,
        canGoLeft,
        canGoRight,
        handleLeftArrow,
        handleRightArrow
    }
}

