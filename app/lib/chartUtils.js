import { formatMonthLabel, monthKey } from "./dateUtils"

export function buildDisplayDataItem(month, dataMap) {
    const key = monthKey(month.year, month.month)
    const ndvi = dataMap.get(key)
    return {
        label: formatMonthLabel(month.year, month.month),
        ndvi: ndvi !== null && ndvi !== undefined ? ndvi : null,
        year: month.year,
        month: month.month
    }
}

export function registerChartJS() {
    const {
        Chart as ChartJS,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend
    } = require("chart.js")
    
    ChartJS.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend
    )
}

