"use client"
import { useEffect, useState } from "react"

const toastStyle = {
    fontSize: "13px",
    color: "white",
    backgroundColor: "#333",
    border: "1px solid #555",
    borderRadius: "4px",
    padding: "10px 15px",
    marginTop: "20px",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    position: "relative",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)"
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

