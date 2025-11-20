"use client"

const RELIABILITY_OPTIONS = [
    { value: 0, label: "Good data" },
    { value: 1, label: "Marginal data" },
    { value: 2, label: "Snow/Ice" },
    { value: 3, label: "Cloudy" }
]

export default function ReliabilityDropdown({ reliability, onReliabilityChange }) {
    return (
        <div style={{ marginTop: "10px" }}>
            <label style={{ display: "block", textAlign: "left", marginBottom: "5px" }}>
                Reliability:
            </label>
            <select
                value={reliability}
                onChange={(e) => onReliabilityChange(parseInt(e.target.value))}
                style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer"
                }}
            >
                {RELIABILITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

