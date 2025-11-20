"use client"
import { useEffect } from "react"
import { useStatusMessage } from "./StatusMessage"

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
    const { setDirectionalMessage } = useStatusMessage()

    useEffect(() => {
        if (!isImageAvailable) {
            setDirectionalMessage(null)
            return
        }

        if (isMoveMode) {
            setDirectionalMessage("Drag a marker to move")
        } else if (secondPointSelection && (!secondPoint || secondPoint.lat === null || secondPoint.lon === null)) {
            setDirectionalMessage("Click to choose the second point")
        } else if (!pointLoaded) {
            setDirectionalMessage("Click a point to analyse")
        } else {
            setDirectionalMessage(null)
        }

        return () => setDirectionalMessage(null)
    }, [isImageAvailable, isMoveMode, secondPointSelection, secondPoint, pointLoaded, setDirectionalMessage])

    if (!isImageAvailable) {
        return null
    }

    if (isMoveMode) {
        return (
            <>
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
            ) : null}
        </>
    )
}

