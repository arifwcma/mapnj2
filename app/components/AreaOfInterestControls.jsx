"use client"

export default function AreaOfInterestControls({ isDrawing, rectangleBounds, onStartDrawing, onReset }) {
    if (isDrawing) {
        return (
            <div style={{ 
                marginTop: "10px", 
                fontSize: "13px", 
                color: "#555",
                backgroundColor: "#f8f9fa",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                padding: "8px 12px",
                textAlign: "center"
            }}>
                Click and drag to draw area
            </div>
        )
    }

    if (!rectangleBounds) {
        return (
            <button
                onClick={onStartDrawing}
                style={{
                    background: "none",
                    border: "none",
                    padding: "10px 0",
                    margin: "0 0 10px 0",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#0066cc",
                    textDecoration: "none",
                    fontFamily: "inherit",
                    display: "block"
                }}
                onMouseEnter={(e) => {
                    const target = e.target
                    if (target instanceof HTMLElement) {
                        target.style.textDecoration = "underline"
                    }
                }}
                onMouseLeave={(e) => {
                    const target = e.target
                    if (target instanceof HTMLElement) {
                        target.style.textDecoration = "none"
                    }
                }}
            >
                Select area of interest
            </button>
        )
    }

    return (
        <button
            onClick={onReset}
            style={{
                background: "none",
                border: "none",
                padding: "10px 0",
                margin: "0 0 10px 0",
                cursor: "pointer",
                fontSize: "13px",
                color: "#0066cc",
                textDecoration: "none",
                fontFamily: "inherit",
                display: "block"
            }}
            onMouseEnter={(e) => {
                const target = e.target
                if (target instanceof HTMLElement) {
                    target.style.textDecoration = "underline"
                }
            }}
            onMouseLeave={(e) => {
                const target = e.target
                if (target instanceof HTMLElement) {
                    target.style.textDecoration = "none"
                }
            }}
        >
            Reset area of interest
        </button>
    )
}

