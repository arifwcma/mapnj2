"use client"

export default function AnalysisModeSelector({ analysisMode, onAnalysisModeChange }) {
    return (
        <div style={{ padding: "10px 0", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", color: "#333" }}>Analyse:</span>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input
                        type="radio"
                        name="analysisMode"
                        value="point"
                        checked={analysisMode === "point"}
                        onChange={(e) => onAnalysisModeChange(e.target.value)}
                    />
                    <span style={{ fontSize: "13px", color: "#333" }}>Point</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input
                        type="radio"
                        name="analysisMode"
                        value="area"
                        checked={analysisMode === "area"}
                        onChange={(e) => onAnalysisModeChange(e.target.value)}
                    />
                    <span style={{ fontSize: "13px", color: "#333" }}>Area</span>
                </label>
            </div>
        </div>
    )
}

