"use client"

export default function InfoPanel({ lat, lon, ndvi }) {
    if (lat === null || lon === null || ndvi === null) {
        return null
    }

    return (
        <div style={{
            position: "fixed",
            right: 0,
            top: 0,
            width: "33.33%",
            height: "100vh",
            backgroundColor: "white",
            borderLeft: "1px solid #ccc",
            padding: "20px",
            boxSizing: "border-box",
            overflowY: "auto",
            zIndex: 1000
        }}>
            <div style={{ fontSize: "16px", marginBottom: "10px" }}>
                Analyse: {lat.toFixed(6)},{lon.toFixed(6)}
            </div>
            <div style={{ fontSize: "16px" }}>
                NDVI: {ndvi.toFixed(2)}
            </div>
        </div>
    )
}

