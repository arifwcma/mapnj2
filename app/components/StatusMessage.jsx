"use client"
import { createContext, useContext, useState } from "react"

const BASE_TOP = 20
const GAP = 10
const TOAST_HEIGHT = 60
const STATUS_HEIGHT = 50
const DIRECTIONAL_HEIGHT = 45

const StatusMessageContext = createContext({
    statusMessage: null,
    setStatusMessage: () => {},
    directionalMessage: null,
    setDirectionalMessage: () => {},
    registerToast: () => {},
    unregisterToast: () => {}
})

function calculateTopPosition(index, hasToast, hasStatusMessage) {
    let top = BASE_TOP
    if (index === 1) {
        if (hasToast) top += TOAST_HEIGHT + GAP
        return top
    }
    if (index === 2) {
        if (hasToast) top += TOAST_HEIGHT + GAP
        if (hasStatusMessage) top += STATUS_HEIGHT + GAP
        return top
    }
    return top
}

export const StatusMessageProvider = ({ children }) => {
    const [statusMessage, setStatusMessage] = useState(null)
    const [directionalMessage, setDirectionalMessage] = useState(null)
    const [hasToast, setHasToast] = useState(false)

    const registerToast = () => setHasToast(true)
    const unregisterToast = () => setHasToast(false)

    const hasStatusMessage = statusMessage !== null
    const hasDirectionalMessage = directionalMessage !== null

    return (
        <StatusMessageContext.Provider value={{ 
            statusMessage, 
            setStatusMessage,
            directionalMessage,
            setDirectionalMessage,
            registerToast,
            unregisterToast
        }}>
            {children}
            {statusMessage && (
                <div style={{
                    position: "fixed",
                    top: `${calculateTopPosition(1, hasToast, hasStatusMessage)}px`,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 10000,
                    pointerEvents: "none",
                    transition: "top 0.2s ease"
                }}>
                    <div className="text-sm text-gray-800 bg-blue-50 border border-blue-200 rounded p-2.5 text-center flex items-center justify-center gap-2">
                        <div className="inline-block w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin-custom"></div>
                        <span className="animate-blink text-red-600">
                            {statusMessage}
                        </span>
                    </div>
                </div>
            )}
            {directionalMessage && (
                <div style={{
                    position: "fixed",
                    top: `${calculateTopPosition(2, hasToast, hasStatusMessage)}px`,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 10000,
                    pointerEvents: "none",
                    transition: "top 0.2s ease"
                }}>
                    <div style={{
                        fontSize: "13px",
                        color: "#dc2626",
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        textAlign: "center",
                        pointerEvents: "auto"
                    }}>
                        {directionalMessage}
                    </div>
                </div>
            )}
        </StatusMessageContext.Provider>
    )
}

export const useStatusMessage = () => {
    const context = useContext(StatusMessageContext)
    if (!context) {
        throw new Error("useStatusMessage must be used within StatusMessageProvider")
    }
    return context
}

