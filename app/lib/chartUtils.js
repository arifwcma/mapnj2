import { formatMonthLabel, monthKey } from "./dateUtils"
import {
    Chart,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from "chart.js"

Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
)

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
}

