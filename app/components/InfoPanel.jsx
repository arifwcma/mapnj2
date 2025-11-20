"use client"

export default function InfoPanel({ lat, lon, secondPoint = null }) {
    if (lat === null || lon === null) {
        return null
    }

    return (
        <div>
            <div style={{ color: "#333", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                <img 
                    src="images/marker-icon.png" 
                    alt="Blue marker" 
                    style={{ width: "20px", height: "32px" }}
                />
                <span> {lat.toFixed(6)},{lon.toFixed(6)}</span>
            </div>
            {secondPoint && secondPoint.lat !== null && secondPoint.lon !== null && (
                <div style={{ color: "#333", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <img 
                        src="images/marker-icon-red.png" 
                        alt="Red marker" 
                        style={{ width: "20px", height: "32px" }}
                    />
                    <span> {secondPoint.lat.toFixed(6)},{secondPoint.lon.toFixed(6)}</span>
                </div>
            )}
        </div>
    )
}
