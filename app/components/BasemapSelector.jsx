"use client"

export default function BasemapSelector({ basemap, onBasemapChange }) {
    return (
        <div style={{ marginBottom: "15px" }}>
            <label style={{ fontSize: "13px", color: "#333", marginBottom: "5px", display: "block" }}>
                Basemap:
            </label>
            <select
                value={basemap}
                onChange={(e) => onBasemapChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "8px",
                    fontSize: "13px",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                }}
            >
                <option value="street">Street</option>
                <option value="satellite">Satellite</option>
                <option value="topographic">Topographic</option>
            </select>
        </div>
    )
}

