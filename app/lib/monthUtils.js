import { MONTH_NAMES_FULL, MIN_YEAR, MIN_MONTH } from "./config"

export function getCurrentMonth() {
    const now = new Date()
    return {
        year: now.getFullYear(),
        month: now.getMonth() + 1
    }
}

export function getPreviousCalendarMonth() {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    
    if (currentMonth === 1) {
        return { year: currentYear - 1, month: 12 }
    }
    return { year: currentYear, month: currentMonth - 1 }
}

export function getAllAvailableMonths() {
    const months = []
    const current = getCurrentMonth()
    let year = current.year
    let month = current.month
    
    while (year > MIN_YEAR || (year === MIN_YEAR && month >= MIN_MONTH)) {
        months.push({ year, month })
        
        if (month === MIN_MONTH && year === MIN_YEAR) {
            break
        }
        
        if (month === 1) {
            year--
            month = 12
        } else {
            month--
        }
    }
    
    return months
}

export function formatMonthDropdownLabel(year, month) {
    return `${year} ${MONTH_NAMES_FULL[month - 1]}`
}

export function isMonthInFuture(year, month) {
    const current = getCurrentMonth()
    if (year > current.year) return true
    if (year === current.year && month > current.month) return true
    return false
}

