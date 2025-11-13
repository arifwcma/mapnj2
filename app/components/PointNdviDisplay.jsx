"use client"
import NdviDisplay from "./NdviDisplay"

export default function PointNdviDisplay({ ndvi, selectedYear, selectedMonth, isLoading = false }) {
    return (
        <NdviDisplay
            ndvi={ndvi}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            isLoading={isLoading}
            markerIcon="images/marker-icon.png"
            markerAlt="Blue marker"
        />
    )
}

