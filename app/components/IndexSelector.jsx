"use client"
import { INDEX_LIST, DEFAULT_INDEX } from "@/app/lib/indexConfig"

export default function IndexSelector({ selectedIndex = DEFAULT_INDEX, onIndexChange }) {
    return (
        <div style={{ marginTop: "10px" }}>
            <label style={{ display: "block", textAlign: "left", marginBottom: "5px" }}>
                Index:
            </label>
            <select
                value={selectedIndex}
                onChange={(e) => onIndexChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer"
                }}
            >
                {INDEX_LIST.map(index => (
                    <option key={index} value={index}>
                        {index}
                    </option>
                ))}
            </select>
        </div>
    )
}

