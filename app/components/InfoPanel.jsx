"use client"

export default function InfoPanel({ lat, lon, ndvi, isReloading = false, pointInfoPanel = null, secondPoint = null }) {
    console.log("InfoPanel render:", { lat, lon, ndvi, latType: typeof lat, lonType: typeof lon, ndviType: typeof ndvi, isReloading })
    if (lat === null || lon === null) {
        console.log("InfoPanel returning null because:", { latIsNull: lat === null, lonIsNull: lon === null })
        return null
    }

    return (
        <div>
            <div style={{ fontSize: "13px", color: "#333", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                <img 
                    src="images/marker-icon.png" 
                    alt="Blue marker" 
                    style={{ width: "20px", height: "32px" }}
                />
                <span>: {lat.toFixed(6)},{lon.toFixed(6)}</span>
            </div>
            {secondPoint && secondPoint.lat !== null && secondPoint.lon !== null && (
                <div style={{ fontSize: "13px", color: "#333", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <img 
                        src="images/marker-icon-red.png" 
                        alt="Red marker" 
                        style={{ width: "20px", height: "32px" }}
                    />
                    <span>: {secondPoint.lat.toFixed(6)},{secondPoint.lon.toFixed(6)}</span>
                </div>
            )}
            {pointInfoPanel}
        </div>
    )
}

