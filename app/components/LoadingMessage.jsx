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
        <div className="text-sm text-gray-800 bg-blue-50 border border-blue-200 rounded p-2.5 mb-4 text-center flex items-center justify-center gap-2">
            <div className="inline-block w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin-custom"></div>
            <span className="animate-blink text-red-600">
                {displayMonth ? (
                    <>Loading {overlayTypeText} data for <strong>{displayMonth}</strong> (less than <strong>{cloudTolerance}%</strong> cloud)...</>
                ) : (
                    <>Loading {overlayTypeText} data ...</>
                )}
            </span>
        </div>
    )
}

