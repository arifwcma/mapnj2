"use client"
import NdviDisplay from "./NdviDisplay"

export default function SecondPointNdviDisplay({ secondPoint, secondNdvi, selectedYear, selectedMonth, isLoading = false }) {
    if (!secondPoint || !secondPoint.lat || !secondPoint.lon) {
        return null
    }

    return (
        <NdviDisplay
            ndvi={secondNdvi}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            isLoading={isLoading}
            markerIcon="images/marker-icon-red.png"
            markerAlt="Red marker"
        />
    )
}

