import { MIN_YEAR, MIN_MONTH, DEFAULT_SATELLITE, getSatelliteConfig } from "./config"

export function monthYearToSliderValue(year, month, satellite = DEFAULT_SATELLITE) {
    const satelliteConfig = getSatelliteConfig(satellite)
    const minYear = satelliteConfig.minYear
    const minMonth = satelliteConfig.minMonth
    return (year - minYear) * 12 + (month - minMonth)
}

export function sliderValueToMonthYear(value, satellite = DEFAULT_SATELLITE) {
    const satelliteConfig = getSatelliteConfig(satellite)
    const minYear = satelliteConfig.minYear
    const minMonth = satelliteConfig.minMonth
    const totalMonths = Math.floor(value)
    const year = minYear + Math.floor(totalMonths / 12)
    const month = (totalMonths % 12) + 1
    return { year, month }
}

