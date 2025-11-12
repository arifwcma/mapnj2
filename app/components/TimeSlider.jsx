"use client"

export default function TimeSlider({ sliderValue, maxValue, label, onTimeChange, onTimeButtonClick }) {
    return (
        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
            <button
                onClick={() => onTimeButtonClick(-1)}
                disabled={sliderValue === 0}
                style={{
                    width: "30px",
                    height: "30px",
                    fontSize: "13px",
                    cursor: sliderValue === 0 ? "not-allowed" : "pointer",
                    opacity: sliderValue === 0 ? 0.5 : 1,
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    background: "white"
                }}
            >
                -
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "13px", display: "block" }}>
                    {label}
                </label>
                <input
                    type="range"
                    min="0"
                    max={maxValue}
                    value={sliderValue}
                    onChange={(e) => onTimeChange(parseInt(e.target.value))}
                    style={{ width: "200px" }}
                />
            </div>
            <button
                onClick={() => onTimeButtonClick(1)}
                disabled={sliderValue >= maxValue}
                style={{
                    width: "30px",
                    height: "30px",
                    fontSize: "13px",
                    cursor: sliderValue >= maxValue ? "not-allowed" : "pointer",
                    opacity: sliderValue >= maxValue ? 0.5 : 1,
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    background: "white"
                }}
            >
                +
            </button>
        </div>
    )
}

