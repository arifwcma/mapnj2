"use client"
import { getAllAvailableMonths, formatMonthDropdownLabel, getCurrentMonth } from "@/app/lib/monthUtils"

export default function MonthDropdown({ selectedYear, selectedMonth, onMonthChange, excludedMonths = [] }) {
    const allMonths = getAllAvailableMonths()
    const current = getCurrentMonth()
    const defaultYear = selectedYear || current.year
    const defaultMonth = selectedMonth || current.month
    
    const excludedKeys = new Set(excludedMonths.map(m => `${m.year}-${m.month}`))
    const availableMonths = allMonths.filter(({ year, month }) => !excludedKeys.has(`${year}-${month}`))
    
    const currentKey = `${defaultYear}-${defaultMonth}`
    const isCurrentExcluded = excludedKeys.has(currentKey)
    const displayYear = isCurrentExcluded && availableMonths.length > 0 ? availableMonths[0].year : defaultYear
    const displayMonth = isCurrentExcluded && availableMonths.length > 0 ? availableMonths[0].month : defaultMonth
    
    return (
        <div style={{ marginBottom: "15px" }}>
            <label style={{ color: "#333", marginBottom: "5px", display: "block" }}>
                Select month:
            </label>
            <select
                value={`${displayYear}-${displayMonth}`}
                onChange={(e) => {
                    const [year, month] = e.target.value.split("-").map(Number)
                    onMonthChange(year, month)
                }}
                style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                }}
            >
                {availableMonths.map(({ year, month }) => (
                    <option key={`${year}-${month}`} value={`${year}-${month}`}>
                        {formatMonthDropdownLabel(year, month)}
                    </option>
                ))}
            </select>
        </div>
    )
}

