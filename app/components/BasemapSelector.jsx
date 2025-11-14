"use client"

export default function BasemapSelector({ basemap, onBasemapChange }) {
    return (
        <div style={{ padding: "10px 0", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", color: "#333" }}>Basemap:</span>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input
                        type="radio"
                        name="basemap"
                        value="street"
                        checked={basemap === "street"}
                        onChange={(e) => onBasemapChange(e.target.value)}
                    />
                    <span style={{ fontSize: "13px", color: "#333" }}>Street</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input
                        type="radio"
                        name="basemap"
                        value="satellite"
                        checked={basemap === "satellite"}
                        onChange={(e) => onBasemapChange(e.target.value)}
                    />
                    <span style={{ fontSize: "13px", color: "#333" }}>Satellite</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input
                        type="radio"
                        name="basemap"
                        value="topographic"
                        checked={basemap === "topographic"}
                        onChange={(e) => onBasemapChange(e.target.value)}
                    />
                    <span style={{ fontSize: "13px", color: "#333" }}>Topographic</span>
                </label>
            </div>
        </div>
    )
}

