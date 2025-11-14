"use client"
import { getAllAvailableMonths, formatMonthDropdownLabel, getCurrentMonth } from "@/app/lib/monthUtils"

export default function MonthDropdown({ selectedYear, selectedMonth, onMonthChange }) {
    const months = getAllAvailableMonths()
    const current = getCurrentMonth()
    const defaultYear = selectedYear || current.year
    const defaultMonth = selectedMonth || current.month
    
    return (
        <div style={{ marginBottom: "15px" }}>
            <label style={{ fontSize: "13px", color: "#333", marginBottom: "5px", display: "block" }}>
                Select month:
            </label>
            <select
                value={`${defaultYear}-${defaultMonth}`}
                onChange={(e) => {
                    const [year, month] = e.target.value.split("-").map(Number)
                    onMonthChange(year, month)
                }}
                style={{
                    width: "100%",
                    padding: "8px",
                    fontSize: "13px",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                }}
            >
                {months.map(({ year, month }) => (
                    <option key={`${year}-${month}`} value={`${year}-${month}`}>
                        {formatMonthDropdownLabel(year, month)}
                    </option>
                ))}
            </select>
        </div>
    )
}

