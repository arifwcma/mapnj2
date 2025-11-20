"use client"
import { useEffect } from "react"
import { formatMonthLabelFull } from "@/app/lib/dateUtils"
import { useStatusMessage } from "./StatusMessage"

export default function NdviDisplay({ 
    ndvi, 
    selectedYear, 
    selectedMonth, 
    isLoading = false, 
    markerIcon = "images/marker-icon.png",
    markerAlt = "Marker"
}) {
    const timeLabel = selectedYear && selectedMonth 
        ? ` (${formatMonthLabelFull(selectedYear, selectedMonth)})`
        : ""
    const { setStatusMessage } = useStatusMessage()

    useEffect(() => {
        if (isLoading) {
            setStatusMessage("Calculating NDVI ...")
        } else {
            setStatusMessage(null)
        }
        return () => setStatusMessage(null)
    }, [isLoading, setStatusMessage])

    const hasData = ndvi !== null && ndvi !== undefined

    return (
        <div style={{ fontSize: "13px", color: "#333", marginBottom: "15px", display: "flex", alignItems: "center", gap: "5px" }}>
            <img 
                src={markerIcon}
                alt={markerAlt}
                style={{ width: "20px", height: "32px" }}
            />
            <span>NDVI{timeLabel}: {hasData ? <strong>{ndvi.toFixed(2)}</strong> : <strong>Not available. Increase cloud tolerance.</strong>}</span>
        </div>
    )
}

