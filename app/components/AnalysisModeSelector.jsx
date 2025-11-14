"use client"

export default function AnalysisModeSelector({ analysisMode, onAnalysisModeChange }) {
    return (
        <div style={{ marginBottom: "15px" }}>
            <label style={{ fontSize: "13px", color: "#333", marginBottom: "5px", display: "block" }}>
                Analyse:
            </label>
            <select
                value={analysisMode}
                onChange={(e) => onAnalysisModeChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "8px",
                    fontSize: "13px",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                }}
            >
                <option value="point">Point</option>
                <option value="area">Area</option>
            </select>
        </div>
    )
}

