"use client"
import { useEffect, useState } from "react"
import { useStatusMessage } from "./StatusMessage"
import { getColorForIndex } from "@/app/lib/colorUtils"

const BASE_TOP = 20

const toastStyle = {
    position: "fixed",
    top: `${BASE_TOP}px`,
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#333",
    color: "white",
    padding: "12px 24px",
    borderRadius: "4px",
    zIndex: 10000,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
    minWidth: "250px",
    textAlign: "center",
    transition: "top 0.2s ease"
}

const timerBarStyle = {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: "3px",
    backgroundColor: "#4CAF50",
    borderRadius: "0 0 4px 4px",
    transition: "width linear"
}

export default function ToastMessage({ message, duration = 3000, onClose, pointIndex = null }) {
    const [width, setWidth] = useState(100)
    const { registerToast, unregisterToast } = useStatusMessage()

    useEffect(() => {
        registerToast()
        return () => unregisterToast()
    }, [registerToast, unregisterToast])

    useEffect(() => {
        setWidth(100)
        const interval = setInterval(() => {
            setWidth(prev => {
                const newWidth = prev - (100 / (duration / 50))
                if (newWidth <= 0) {
                    clearInterval(interval)
                    if (onClose) {
                        setTimeout(onClose, 50)
                    }
                    return 0
                }
                return newWidth
            })
        }, 50)

        const timeout = setTimeout(() => {
            clearInterval(interval)
            if (onClose) {
                onClose()
            }
        }, duration)

        return () => {
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [message, duration, onClose])

    const displayMessage = typeof message === "string" ? message : (message?.message || message)
    const pointIdx = pointIndex !== null ? pointIndex : (typeof message === "object" && message !== null ? message.pointIndex : null)

    if (!displayMessage) return null

    const renderMessageWithIcon = () => {
        if (pointIdx !== null) {
            return (
                <>
                    {displayMessage}
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", verticalAlign: "middle", margin: "0 2px" }}>
                        <div style={{
                            width: 0,
                            height: 0,
                            borderLeft: "6px solid transparent",
                            borderRight: "6px solid transparent",
                            borderTop: "9px solid",
                            borderTopColor: getColorForIndex(pointIdx),
                            position: "relative"
                        }}>
                            <div style={{
                                position: "absolute",
                                top: "-16px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "white",
                                border: `1px solid ${getColorForIndex(pointIdx)}`,
                                borderRadius: "50%",
                                width: "14px",
                                height: "14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                fontWeight: "bold",
                                color: getColorForIndex(pointIdx)
                            }}>
                                {pointIdx + 1}
                            </div>
                        </div>
                    </span>
                    .\nConsider increasing cloud tolerance.
                </>
            )
        }
        return <span>{displayMessage}</span>
    }

    return (
        <div style={toastStyle}>
            <div style={{ whiteSpace: "pre-line", textAlign: "center" }}>
                {renderMessageWithIcon()}
            </div>
            <div style={{ ...timerBarStyle, width: `${width}%` }}></div>
        </div>
    )
}

