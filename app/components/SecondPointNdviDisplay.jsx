"use client"
import { formatMonthLabelFull } from "@/app/lib/dateUtils"

export default function SecondPointNdviDisplay({ secondPoint, secondPlotData, selectedYear, selectedMonth }) {
    if (!secondPoint || !secondPoint.lat || !secondPoint.lon || secondPlotData.length === 0) {
        return null
    }

    const timeLabel = selectedYear && selectedMonth 
        ? ` (${formatMonthLabelFull(selectedYear, selectedMonth)})`
        : ""
    const secondNdviData = secondPlotData.find(d => d.year === selectedYear && d.month === selectedMonth)
    const secondNdvi = secondNdviData?.ndvi

    const displayValue = secondNdvi === null || secondNdvi === undefined 
        ? "Unavailable" 
        : secondNdvi.toFixed(2)

    return (
        <div style={{ fontSize: "13px", color: "#333", marginBottom: "15px", display: "flex", alignItems: "center", gap: "5px" }}>
            <img 
                src="images/marker-icon-red.png" 
                alt="Red marker" 
                style={{ width: "20px", height: "32px" }}
            />
            <span>NDVI{timeLabel}: <strong>{displayValue}</strong></span>
        </div>
    )
}

