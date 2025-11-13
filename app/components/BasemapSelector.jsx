"use client"

export default function BasemapSelector({ basemap, onBasemapChange, showFields, onShowFieldsChange }) {
    return (
        <div style={{ padding: "10px 0", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
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
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                <input
                    type="checkbox"
                    checked={showFields}
                    onChange={(e) => {
                        console.log("Checkbox changed:", e.target.checked)
                        onShowFieldsChange(e.target.checked)
                    }}
                />
                <span style={{ fontSize: "13px", color: "#333" }}>Show fields</span>
            </label>
        </div>
    )
}

