"use client"
import { useEffect, useState } from "react"

const toastStyle = {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#333",
    color: "white",
    padding: "12px 24px",
    borderRadius: "4px",
    fontSize: "13px",
    zIndex: 10000,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
    minWidth: "250px",
    textAlign: "center"
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

export default function ToastMessage({ message, duration = 3000, onClose }) {
    const [width, setWidth] = useState(100)

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

    if (!message) return null

    return (
        <div style={toastStyle}>
            {message}
            <div style={{ ...timerBarStyle, width: `${width}%` }}></div>
        </div>
    )
}

