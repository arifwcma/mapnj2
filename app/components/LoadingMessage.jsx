"use client"
import { formatMonthLabelFull } from "@/app/lib/dateUtils"

export default function LoadingMessage({ loading, overlayLoading, overlayType, selectedYear, selectedMonth, endMonth, cloudTolerance }) {
    if (!loading && !overlayLoading) {
        return null
    }

    const displayMonth = selectedYear && selectedMonth 
        ? formatMonthLabelFull(selectedYear, selectedMonth)
        : endMonth
    const overlayTypeText = overlayType === "RGB" ? "RGB" : "NDVI"

    return (
        <>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
            <div style={{
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
            }}>
                <div style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "2px solid #b3d9ff",
                    borderTop: "2px solid #0066cc",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                }}></div>
                <span style={{ animation: "blink 1.5s ease-in-out infinite" }}>
                    {displayMonth ? (
                        <>Loading {overlayTypeText} data for <strong>{displayMonth}</strong> (less than <strong>{cloudTolerance}%</strong> cloud)...</>
                    ) : (
                        <>Loading {overlayTypeText} data ...</>
                    )}
                </span>
            </div>
        </>
    )
}

