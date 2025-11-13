"use client"
import { formatMonthLabelFull } from "@/app/lib/dateUtils"

const statusMessageStyle = {
    fontSize: "13px",
    color: "#333",
    backgroundColor: "#f0f8ff",
    border: "1px solid #b3d9ff",
    borderRadius: "4px",
    padding: "10px 15px",
    marginBottom: "15px",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
}

const spinnerStyle = {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border: "2px solid #b3d9ff",
    borderTop: "2px solid #0066cc",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
}

export default function PointNdviDisplay({ ndvi, selectedYear, selectedMonth, isLoading = false }) {
    const timeLabel = selectedYear && selectedMonth 
        ? ` (${formatMonthLabelFull(selectedYear, selectedMonth)})`
        : ""

    if (isLoading) {
        return (
            <>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <div style={statusMessageStyle}>
                    <img 
                        src="images/marker-icon.png" 
                        alt="Blue marker" 
                        style={{ width: "20px", height: "32px" }}
                    />
                    <div style={spinnerStyle}></div>
                    <span>Calculating NDVI ...</span>
                </div>
            </>
        )
    }

    const hasData = ndvi !== null && ndvi !== undefined

    return (
        <div style={{ fontSize: "13px", color: "#333", marginBottom: "15px", display: "flex", alignItems: "center", gap: "5px" }}>
            <img 
                src="images/marker-icon.png" 
                alt="Blue marker" 
                style={{ width: "20px", height: "32px" }}
            />
            <span>NDVI{timeLabel}: {hasData ? <strong>{ndvi.toFixed(2)}</strong> : <strong>Not available. Increase cloud tolerance.</strong>}</span>
        </div>
    )
}

