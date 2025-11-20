"use client"
import { useEffect, useLayoutEffect } from "react"
import { FIELD_SELECTION_MIN_ZOOM } from "@/app/lib/config"
import { useStatusMessage } from "./StatusMessage"

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
            if (currentZoom === null || currentZoom === undefined || currentZoom < FIELD_SELECTION_MIN_ZOOM) {
                return "Zoom in further to see parcels"
            }
            if (!fieldsData || fieldsData.features?.length === 0) {
                return "Loading parcel data..."
            }
            return "Click the desired parcel"
        }
        return null
    }

    const message = getMessage()
    const isLoadingMessage = message === "Loading parcel data..."
    const { setStatusMessage, setDirectionalMessage } = useStatusMessage()

    useEffect(() => {
        if (isLoadingMessage) {
            setStatusMessage("Loading parcel data...")
        } else {
            setStatusMessage(null)
        }
        return () => setStatusMessage(null)
    }, [isLoadingMessage, setStatusMessage])

    useLayoutEffect(() => {
        if (!isSelectionMode) {
            setDirectionalMessage(
                <>
                    Select area by choosing a{" "}
                    <button 
                        onClick={onSelectParcel} 
                        style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            cursor: "pointer",
                            color: "#0066cc",
                            textDecoration: "none",
                            fontFamily: "inherit"
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.textDecoration = "underline"
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.textDecoration = "none"
                        }}
                    >
                        parcel
                    </button>
                    {" "}or drawing a{" "}
                    <button 
                        onClick={onDrawRectangle} 
                        style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            cursor: "pointer",
                            color: "#0066cc",
                            textDecoration: "none",
                            fontFamily: "inherit"
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.textDecoration = "underline"
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.textDecoration = "none"
                        }}
                    >
                        rectangle
                    </button>
                    .
                </>
            )
        } else if (message && !isLoadingMessage && isSelectionMode) {
            setDirectionalMessage(
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div>{message}</div>
                    <button 
                        onClick={onCancel} 
                        style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            cursor: "pointer",
                            color: "#0066cc",
                            textDecoration: "none",
                            fontFamily: "inherit"
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.textDecoration = "underline"
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.textDecoration = "none"
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )
        } else {
            setDirectionalMessage(null)
        }
        return () => setDirectionalMessage(null)
    }, [isSelectionMode, message, isLoadingMessage, onSelectParcel, onDrawRectangle, onCancel, setDirectionalMessage])

    return (
        <div className="text-sm text-gray-800 mb-4">
        </div>
    )
}

