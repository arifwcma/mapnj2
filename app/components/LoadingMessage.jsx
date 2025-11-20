"use client"
import { useEffect } from "react"
import { formatMonthLabelFull } from "@/app/lib/dateUtils"
import { useStatusMessage } from "./StatusMessage"

export default function LoadingMessage({ loading, overlayLoading, overlayType, selectedYear, selectedMonth, endMonth, cloudTolerance }) {
    const { setStatusMessage } = useStatusMessage()

    useEffect(() => {
        if (loading || overlayLoading) {
            const displayMonth = selectedYear && selectedMonth 
                ? formatMonthLabelFull(selectedYear, selectedMonth)
                : endMonth
            const overlayTypeText = overlayType === "RGB" ? "RGB" : "NDVI"
            
            if (displayMonth) {
                setStatusMessage(`Loading ${overlayTypeText} data for ${displayMonth} (less than ${cloudTolerance}% cloud)...`)
            } else {
                setStatusMessage(`Loading ${overlayTypeText} data ...`)
            }
        } else {
            setStatusMessage(null)
        }
        return () => setStatusMessage(null)
    }, [loading, overlayLoading, overlayType, selectedYear, selectedMonth, endMonth, cloudTolerance, setStatusMessage])

    return null
}

