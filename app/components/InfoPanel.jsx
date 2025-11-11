"use client"

export default function InfoPanel({ lat, lon, ndvi, isReloading = false, pointInfoPanel = null }) {
    console.log("InfoPanel render:", { lat, lon, ndvi, latType: typeof lat, lonType: typeof lon, ndviType: typeof ndvi, isReloading })
    if (lat === null || lon === null) {
        console.log("InfoPanel returning null because:", { latIsNull: lat === null, lonIsNull: lon === null })
        return null
    }

    return (
        <div>
            <div style={{ fontSize: "16px", marginBottom: "10px" }}>
                Analyse: {lat.toFixed(6)},{lon.toFixed(6)}
            </div>
            {pointInfoPanel}
        </div>
    )
}

