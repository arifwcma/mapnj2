"use client"

export default function CompareModeSelector({ compareMode, onCompareModeChange, analysisMode }) {
    const isPointMode = analysisMode === "point"
    const firstOptionValue = isPointMode ? "points" : "areas"
    const firstOptionLabel = isPointMode ? "Points" : "Areas"
    
    return (
        <div style={{ marginBottom: "15px" }}>
            <label style={{ fontSize: "13px", color: "#333", marginBottom: "5px", display: "block" }}>
                Compare:
            </label>
            <select
                value={compareMode}
                onChange={(e) => onCompareModeChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "8px",
                    fontSize: "13px",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                }}
            >
                <option value={firstOptionValue}>{firstOptionLabel}</option>
                <option value="months">Months</option>
            </select>
        </div>
    )
}

