"use client"

export default function CloudToleranceSlider({ cloudTolerance, onCloudChange, onCloudButtonClick, onCloudButtonRelease }) {
    return (
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <label style={{ fontSize: "13px", display: "block", textAlign: "center" }}>
                Cloud tolerance (%): <strong>{cloudTolerance}</strong>
            </label>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <button
                    onClick={() => onCloudButtonClick(1)}
                    onMouseUp={onCloudButtonRelease}
                    disabled={cloudTolerance === 100}
                    style={{
                        width: "30px",
                        height: "30px",
                        fontSize: "13px",
                        cursor: cloudTolerance === 100 ? "not-allowed" : "pointer",
                        opacity: cloudTolerance === 100 ? 0.5 : 1,
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        background: "white"
                    }}
                >
                    +
                </button>
                <div style={{ 
                    height: "150px",
                    width: "20px",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <div style={{
                        position: "absolute",
                        width: "4px",
                        height: "150px",
                        background: "#ddd",
                        borderRadius: "2px"
                    }} />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={cloudTolerance}
                        onChange={(e) => onCloudChange(parseInt(e.target.value))}
                        onMouseUp={onCloudButtonRelease}
                        style={{ 
                            width: "150px",
                            height: "20px",
                            transform: "rotate(-90deg)",
                            cursor: "pointer",
                            position: "absolute"
                        }}
                    />
                </div>
                <button
                    onClick={() => onCloudButtonClick(-1)}
                    onMouseUp={onCloudButtonRelease}
                    disabled={cloudTolerance === 0}
                    style={{
                        width: "30px",
                        height: "30px",
                        fontSize: "13px",
                        cursor: cloudTolerance === 0 ? "not-allowed" : "pointer",
                        opacity: cloudTolerance === 0 ? 0.5 : 1,
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        background: "white"
                    }}
                >
                    -
                </button>
            </div>
        </div>
    )
}

