"use client"

export default function CompareModeSelector({ compareMode, onCompareModeChange, analysisMode }) {
    const isPointMode = analysisMode === "point"
    
    return (
        <div style={{ padding: "10px 0", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", color: "#333" }}>Compare:</span>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input
                        type="radio"
                        name="compareMode"
                        value={isPointMode ? "points" : "areas"}
                        checked={compareMode === (isPointMode ? "points" : "areas")}
                        onChange={(e) => onCompareModeChange(e.target.value)}
                    />
                    <span style={{ fontSize: "13px", color: "#333" }}>
                        {isPointMode ? "Points" : "Areas"}
                    </span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input
                        type="radio"
                        name="compareMode"
                        value="months"
                        checked={compareMode === "months"}
                        onChange={(e) => onCompareModeChange(e.target.value)}
                    />
                    <span style={{ fontSize: "13px", color: "#333" }}>Months</span>
                </label>
            </div>
        </div>
    )
}

