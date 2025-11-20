"use client"

export default function CloudToleranceDropdown({ cloudTolerance, onCloudChange }) {
    const options = []
    for (let i = 0; i <= 100; i++) {
        options.push(i)
    }
    
    return (
        <div style={{ marginTop: "10px" }}>
            <label style={{ fontSize: "13px", display: "block", textAlign: "left", marginBottom: "5px" }}>
                Cloud tolerance (%):
            </label>
            <select
                value={cloudTolerance}
                onChange={(e) => onCloudChange(parseInt(e.target.value))}
                style={{
                    width: "100%",
                    padding: "8px",
                    fontSize: "13px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer"
                }}
            >
                {options.map(value => (
                    <option key={value} value={value}>
                        {value}
                    </option>
                ))}
            </select>
        </div>
    )
}

