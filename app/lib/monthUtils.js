import { MONTH_NAMES_FULL, MIN_YEAR, MIN_MONTH, DEFAULT_SATELLITE, getSatelliteConfig } from "./config"

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

export function getAllAvailableMonths(satellite = DEFAULT_SATELLITE) {
    const satelliteConfig = getSatelliteConfig(satellite)
    const minYear = satelliteConfig.minYear
    const minMonth = satelliteConfig.minMonth
    
    const months = []
    const current = getCurrentMonth()
    let year = current.year
    let month = current.month
    
    while (year > minYear || (year === minYear && month >= minMonth)) {
        months.push({ year, month })
        
        if (month === minMonth && year === minYear) {
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

export function getSixMonthsBackFrom(selectedYear, selectedMonth, satellite = DEFAULT_SATELLITE) {
    const satelliteConfig = getSatelliteConfig(satellite)
    const minYear = satelliteConfig.minYear
    const minMonth = satelliteConfig.minMonth
    
    const months = []
    let year = selectedYear
    let month = selectedMonth
    
    for (let i = 0; i < 6; i++) {
        if (year < minYear || (year === minYear && month < minMonth)) {
            break
        }
        
        months.unshift({ year, month })
        
        if (month === 1) {
            year--
            month = 12
        } else {
            month--
        }
    }
    
    return months
}

