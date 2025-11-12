"use client"

export default function InfoPanel({ lat, lon, ndvi, isReloading = false, pointInfoPanel = null }) {
    console.log("InfoPanel render:", { lat, lon, ndvi, latType: typeof lat, lonType: typeof lon, ndviType: typeof ndvi, isReloading })
    if (lat === null || lon === null) {
        console.log("InfoPanel returning null because:", { latIsNull: lat === null, lonIsNull: lon === null })
        return null
    }

    return (
        <div>
            <div style={{ fontSize: "13px", color: "#333", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                <img 
                    src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png" 
                    alt="Blue marker" 
                    style={{ width: "20px", height: "32px" }}
                />
                <span>: {lat.toFixed(6)},{lon.toFixed(6)}</span>
            </div>
            {pointInfoPanel}
        </div>
    )
}

