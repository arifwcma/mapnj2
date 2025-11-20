"use client"
import { FIELD_SELECTION_MIN_ZOOM } from "@/app/lib/config"

const linkStyle = {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    fontSize: "13px",
    color: "#0066cc",
    textDecoration: "none",
    fontFamily: "inherit",
    display: "inline"
}

const messageStyle = {
    marginTop: "10px",
    fontSize: "13px",
    color: "#555",
    backgroundColor: "#f8f9fa",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    padding: "8px 12px",
    textAlign: "center"
}

export default function AreaSelectionPrompt({ 
    onSelectParcel, 
    onDrawRectangle, 
    isSelectionMode, 
    onCancel,
    isDrawing,
    fieldSelectionMode,
    currentZoom,
    fieldsData
}) {
    const getMessage = () => {
        if (isDrawing) {
            return "Click and drag to draw a rectangle"
        }
        if (fieldSelectionMode) {
            if (!fieldsData) {
                return "Loading parcel data..."
            }
            const zoomSufficient = currentZoom !== null && currentZoom !== undefined && currentZoom >= FIELD_SELECTION_MIN_ZOOM
            return zoomSufficient ? "Click the desired parcel" : "Zoom further to view parcels"
        }
        return null
    }

    const message = getMessage()
    const isLoadingMessage = message === "Loading parcel data..."

    return (
        <>
            <style>{`
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
            <div style={{ fontSize: "13px", color: "#333", marginBottom: "15px" }}>
                Select area by choosing a{" "}
                <button onClick={onSelectParcel} style={linkStyle}>
                    parcel
                </button>
                {" "}or drawing a{" "}
                <button onClick={onDrawRectangle} style={linkStyle}>
                    rectangle
                </button>
                .
                {isSelectionMode && (
                    <>
                        {message && (
                            <div style={messageStyle}>
                                <span style={isLoadingMessage ? { animation: "blink 1.5s ease-in-out infinite" } : {}}>
                                    {message}
                                </span>
                            </div>
                        )}
                        <div style={{ marginTop: "10px" }}>
                            <button onClick={onCancel} style={linkStyle}>
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}

