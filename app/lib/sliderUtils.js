import { MIN_YEAR, MIN_MONTH } from "./constants"

export function monthYearToSliderValue(year, month) {
    return (year - MIN_YEAR) * 12 + (month - MIN_MONTH)
}

export function sliderValueToMonthYear(value) {
    const totalMonths = Math.floor(value)
    const year = MIN_YEAR + Math.floor(totalMonths / 12)
    const month = (totalMonths % 12) + 1
    return { year, month }
}

