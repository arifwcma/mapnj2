import { MIN_YEAR, MIN_MONTH } from "./config"

export function getInitialVisibleRange(selectedYear, selectedMonth) {
    if (!selectedYear || !selectedMonth) {
        return null
    }
    
    const startMonth = { year: selectedYear, month: 1 }
    const endMonth = { year: selectedYear, month: 12 }
    
    return {
        startMonth,
        endMonth
    }
}

export function getAllMonthsInRange(startMonth, endMonth) {
    const months = []
    let year = startMonth.year
    let month = startMonth.month
    
    while (year < endMonth.year || (year === endMonth.year && month <= endMonth.month)) {
        if (year < MIN_YEAR || (year === MIN_YEAR && month < MIN_MONTH)) {
            break
        }
        months.push({ year, month })
        
        if (month === 12) {
            year++
            month = 1
        } else {
            month++
        }
    }
    
    return months
}

