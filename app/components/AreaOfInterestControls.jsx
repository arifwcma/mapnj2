"use client"
import { FIELD_SELECTION_MIN_ZOOM } from "@/app/lib/config"

const linkStyle = {
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
}

const messageStyle = {
    marginTop: "10px",
    fontSize: "13px",
    color: "#dc2626",
    backgroundColor: "#f8f9fa",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    padding: "8px 12px",
    textAlign: "center"
}

const buttonContainerStyle = {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginTop: "10px"
}

const cancelButtonStyle = {
    background: "#dc3545",
    border: "none",
    color: "white",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "inherit"
}

export default function AreaOfInterestControls({ 
    isDrawing, 
    rectangleBounds, 
    fieldSelectionMode,
    fieldsData,
    currentZoom,
    analysisMode,
    onStartDrawing, 
    onStartFieldSelection,
    onCancelDrawing,
    onCancelFieldSelection,
    onReset 
}) {
    if (isDrawing) {
        return (
            <div>
                <div style={messageStyle}>
                    Click and drag to draw area
                </div>
                <div style={buttonContainerStyle}>
                    <button
                        onClick={onCancelDrawing}
                        style={cancelButtonStyle}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#c82333"
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "#dc3545"
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )
    }

    if (fieldSelectionMode) {
        const zoomSufficient = currentZoom !== null && currentZoom !== undefined && currentZoom >= FIELD_SELECTION_MIN_ZOOM
        const fieldsLoaded = fieldsData !== null
        
        return (
            <>
                <div>
                    <div className="mt-2.5 text-sm bg-gray-50 border border-gray-200 rounded p-2 text-center">
                        {!fieldsLoaded ? (
                            <span className="animate-blink text-red-600">Loading parcels ...</span>
                        ) : <span className="text-red-600">{zoomSufficient ? "Click parcel to select" : "Zoom in further to see parcels"}</span>}
                    </div>
                {fieldsLoaded && zoomSufficient && (
                    <div style={buttonContainerStyle}>
                        <button
                            onClick={onCancelFieldSelection}
                            style={cancelButtonStyle}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = "#c82333"
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = "#dc3545"
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                )}
                </div>
            </>
        )
    }

    if (analysisMode === "area") {
        return (
            <div>
                <button
                    onClick={onStartDrawing}
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
                    Select area of interest
                </button>
                <button
                    onClick={onStartFieldSelection}
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
                    Select parcel
                </button>
                {rectangleBounds && (
                    <button
                        onClick={onReset}
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
                        Reset area of interest
                    </button>
                )}
            </div>
        )
    }

    if (!rectangleBounds) {
        return (
            <div>
                <button
                    onClick={onStartDrawing}
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
                    Select area of interest
                </button>
                <button
                    onClick={onStartFieldSelection}
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
                    Select parcel
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={onReset}
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
            Reset area of interest
        </button>
    )
}
