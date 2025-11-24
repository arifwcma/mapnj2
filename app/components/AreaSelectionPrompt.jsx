"use client"
import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { FIELD_SELECTION_MIN_ZOOM } from "@/app/lib/config"
import { MESSAGES } from "@/app/lib/messageConstants"
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
            return MESSAGES.AREA_DRAW_RECTANGLE
        }
        if (fieldSelectionMode) {
            if (currentZoom === null || currentZoom === undefined || currentZoom < FIELD_SELECTION_MIN_ZOOM) {
                return MESSAGES.AREA_ZOOM_INSUFFICIENT
            }
            if (!fieldsData || fieldsData.features?.length === 0) {
                return MESSAGES.AREA_LOADING_PARCELS
            }
            return MESSAGES.AREA_CLICK_PARCEL
        }
        return null
    }

    const message = getMessage()
    const isLoadingMessage = message === MESSAGES.AREA_LOADING_PARCELS
    const { setStatusMessage, setDirectionalMessage } = useStatusMessage()

    useEffect(() => {
        if (isLoadingMessage) {
            setStatusMessage(MESSAGES.AREA_LOADING_PARCELS)
        } else {
            setStatusMessage(null)
        }
        return () => setStatusMessage(null)
    }, [isLoadingMessage, setStatusMessage])

    const callbacksRef = useRef({ onSelectParcel, onDrawRectangle, onCancel })
    
    useEffect(() => {
        callbacksRef.current = { onSelectParcel, onDrawRectangle, onCancel }
    }, [onSelectParcel, onDrawRectangle, onCancel])

    const promptMessage = useMemo(() => {
        if (!isSelectionMode) {
            const parts = MESSAGES.AREA_SELECT_PROMPT.split(/(parcel|rectangle)/)
            return (
                <>
                    {parts.map((part, idx) => {
                        if (part === "parcel") {
                            return (
                                <button 
                                    key={idx}
                                    onClick={() => callbacksRef.current.onSelectParcel()} 
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
                                    {part}
                                </button>
                            )
                        } else if (part === "rectangle") {
                            return (
                                <button 
                                    key={idx}
                                    onClick={() => callbacksRef.current.onDrawRectangle()} 
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
                                    {part}
                                </button>
                            )
                        }
                        return <span key={idx}>{part}</span>
                    })}
                </>
            )
        }
        return null
    }, [isSelectionMode])

    const selectionMessage = useMemo(() => {
        if (message && !isLoadingMessage && isSelectionMode) {
            return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div>{message}</div>
                    <button 
                        onClick={() => callbacksRef.current.onCancel()} 
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
                        Done
                    </button>
                </div>
            )
        }
        return null
    }, [message, isLoadingMessage, isSelectionMode])

    useLayoutEffect(() => {
        if (!isSelectionMode) {
            setDirectionalMessage(promptMessage)
        } else if (selectionMessage) {
            setDirectionalMessage(selectionMessage)
        } else {
            setDirectionalMessage(null)
        }
    }, [isSelectionMode, promptMessage, selectionMessage, setDirectionalMessage])

    return (
        <div className="text-sm text-gray-800 mb-4">
        </div>
    )
}

