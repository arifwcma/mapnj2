"use client"
import { formatMonthLabelFull } from "@/app/lib/dateUtils"

export default function PointNdviDisplay({ ndvi, selectedYear, selectedMonth }) {
    const timeLabel = selectedYear && selectedMonth 
        ? ` (${formatMonthLabelFull(selectedYear, selectedMonth)})`
        : ""

    const hasData = ndvi !== null && ndvi !== undefined

    return (
        <div style={{ fontSize: "13px", color: "#333", marginBottom: "15px", display: "flex", alignItems: "center", gap: "5px" }}>
            <img 
                src="images/marker-icon.png" 
                alt="Blue marker" 
                style={{ width: "20px", height: "32px" }}
            />
            <span>NDVI{timeLabel}: {hasData ? <strong>{ndvi.toFixed(2)}</strong> : <strong>Not available.</strong>}</span>
        </div>
    )
}

