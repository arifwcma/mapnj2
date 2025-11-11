"use client"

export default function InfoPanel({ lat, lon, ndvi, isReloading = false }) {
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
            {isReloading ? (
                <div style={{ fontSize: "16px" }}>
                    Reloading ...
                </div>
            ) : ndvi !== null && ndvi !== undefined ? (
                <div style={{ fontSize: "16px" }}>
                    NDVI: {ndvi.toFixed(2)}
                </div>
            ) : null}
        </div>
    )
}

