export default function ChartNavigation({ canGoLeft, canGoRight, onLeftClick, onRightClick, yAxisRange, onYAxisToggle }) {
    return (
        <div style={{ position: "relative", marginTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px" }}>
                <button
                    onClick={onLeftClick}
                    disabled={!canGoLeft()}
                    style={{
                        padding: "8px 16px",
                        cursor: canGoLeft() ? "pointer" : "not-allowed",
                        opacity: canGoLeft() ? 1 : 0.5,
                        backgroundColor: "white",
                        color: "#333",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        fontWeight: "500"
                    }}
                >
                    ←
                </button>
                
                {onYAxisToggle && (
                    <button
                        onClick={onYAxisToggle}
                        style={{
                            padding: "8px 16px",
                            cursor: "pointer",
                            backgroundColor: "white",
                            color: "#333",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            fontWeight: "500"
                        }}
                    >
                        {yAxisRange === "0-1" ? "↓" : "↑"}
                    </button>
                )}
                
                <button
                    onClick={onRightClick}
                    disabled={!canGoRight()}
                    style={{
                        padding: "8px 16px",
                        cursor: canGoRight() ? "pointer" : "not-allowed",
                        opacity: canGoRight() ? 1 : 0.5,
                        backgroundColor: "white",
                        color: "#333",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        fontWeight: "500"
                    }}
                >
                    →
                </button>
            </div>
        </div>
    )
}

