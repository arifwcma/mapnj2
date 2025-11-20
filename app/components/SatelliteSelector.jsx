"use client"

export default function SatelliteSelector({ satellite, onSatelliteChange }) {
    return (
        <div style={{ marginBottom: "15px" }}>
            <label style={{ color: "#333", marginBottom: "5px", display: "block" }}>
                Satellite:
            </label>
            <select
                value={satellite}
                onChange={(e) => onSatelliteChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                }}
            >
                <option value="sentinel2">Sentinel-2</option>
                <option value="modis">MODIS</option>
            </select>
        </div>
    )
}

