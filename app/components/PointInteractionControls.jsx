"use client"

const linkStyle = {
    background: "none",
    border: "none",
    padding: "10px 0",
    margin: "10px 0 0 0",
    cursor: "pointer",
    fontSize: "13px",
    color: "#0066cc",
    textDecoration: "none",
    fontFamily: "inherit",
    display: "block"
}

const directionMessageStyle = {
    marginTop: "10px",
    fontSize: "13px",
    color: "#dc2626",
    backgroundColor: "#f8f9fa",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    padding: "8px 12px",
    textAlign: "center"
}

export default function PointInteractionControls({ 
    isImageAvailable, 
    pointLoaded, 
    secondPointSelection, 
    isMoveMode, 
    secondPoint,
    onMoveModeClick,
    onCancelMove,
    onCompareClick
}) {
    if (!isImageAvailable) {
        return null
    }

    if (isMoveMode) {
        return (
            <>
                <div style={directionMessageStyle}>
                    Drag a marker to move
                </div>
                <button
                    onClick={onCancelMove}
                    style={linkStyle}
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
                    Cancel move
                </button>
            </>
        )
    }

    if (secondPointSelection) {
        return (
            <>
                {pointLoaded && (
                    <button
                        onClick={onMoveModeClick}
                        style={linkStyle}
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
                        Move point marker
                    </button>
                )}
                {(!secondPoint || secondPoint.lat === null || secondPoint.lon === null) && (
                    <div style={directionMessageStyle}>
                        Click to choose the second point
                    </div>
                )}
            </>
        )
    }

    return (
        <>
            {pointLoaded ? (
                <>
                    <button
                        onClick={onMoveModeClick}
                        style={linkStyle}
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
                        Move point marker
                    </button>
                    <button
                        onClick={onCompareClick}
                        style={linkStyle}
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
                        Compare with another point
                    </button>
                </>
            ) : (
                <div style={directionMessageStyle}>
                    Click a point to analyse
                </div>
            )}
        </>
    )
}

