"use client"
import { useEffect, useState, useRef } from "react"

const toastStyle = {
    backgroundColor: "#333",
    color: "white",
    padding: "12px 24px",
    borderRadius: "4px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
    minWidth: "250px",
    textAlign: "center",
    position: "relative"
}

const containerStyle = {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10000,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px"
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

function ToastItem({ id, message, duration, onRemove }) {
    const [width, setWidth] = useState(100)
    const startTimeRef = useRef(null)
    const intervalRef = useRef(null)
    const timeoutRef = useRef(null)

    useEffect(() => {
        if (startTimeRef.current === null) {
            startTimeRef.current = Date.now()
        }
        
        const elapsed = Date.now() - startTimeRef.current
        const remaining = Math.max(0, duration - elapsed)
        
        if (remaining <= 0) {
            onRemove(id)
            return
        }

        const initialWidth = (remaining / duration) * 100
        setWidth(initialWidth)

        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        intervalRef.current = setInterval(() => {
            setWidth(prev => {
                const elapsedNow = Date.now() - startTimeRef.current
                const remainingNow = Math.max(0, duration - elapsedNow)
                const newWidth = (remainingNow / duration) * 100
                
                if (newWidth <= 0) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current)
                    }
                    onRemove(id)
                    return 0
                }
                return newWidth
            })
        }, 50)

        timeoutRef.current = setTimeout(() => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            onRemove(id)
        }, remaining)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [id, onRemove])

    return (
        <div style={toastStyle}>
            <div style={{ whiteSpace: "pre-line" }}>{message}</div>
            <div style={{ ...timerBarStyle, width: `${width}%` }}></div>
        </div>
    )
}

export default function ToastContainer({ toasts, onRemove }) {
    return (
        <div style={containerStyle}>
            {toasts.map((toast, index) => (
                <ToastItem
                    key={toast.id}
                    id={toast.id}
                    message={toast.message}
                    duration={toast.duration}
                    onRemove={onRemove}
                />
            ))}
        </div>
    )
}

