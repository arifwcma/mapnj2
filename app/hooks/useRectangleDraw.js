import { useState, useCallback } from "react"

export default function useRectangleDraw() {
    const [isDrawing, setIsDrawing] = useState(false)
    const [rectangleBounds, setRectangleBounds] = useState(null)
    const [startPoint, setStartPoint] = useState(null)
    const [currentBounds, setCurrentBounds] = useState(null)

    const startDrawing = useCallback(() => {
        setIsDrawing(true)
        setRectangleBounds(null)
        setStartPoint(null)
        setCurrentBounds(null)
    }, [])

    const stopDrawing = useCallback(() => {
        setIsDrawing(false)
        setStartPoint(null)
        setCurrentBounds(null)
    }, [])

    const resetRectangle = useCallback(() => {
        setRectangleBounds(null)
        setIsDrawing(false)
        setStartPoint(null)
        setCurrentBounds(null)
    }, [])

    const setStart = useCallback((latlng) => {
        setStartPoint(latlng)
    }, [])

    const updateBounds = useCallback((endLatlng) => {
        if (!startPoint) return
        const bounds = [
            [Math.min(startPoint.lat, endLatlng.lat), Math.min(startPoint.lng, endLatlng.lng)],
            [Math.max(startPoint.lat, endLatlng.lat), Math.max(startPoint.lng, endLatlng.lng)]
        ]
        setCurrentBounds(bounds)
    }, [startPoint])

    const finalizeRectangle = useCallback(() => {
        if (currentBounds) {
            setRectangleBounds(currentBounds)
        }
        stopDrawing()
    }, [currentBounds, stopDrawing])

    const setBounds = useCallback((bounds) => {
        setRectangleBounds(bounds)
        setIsDrawing(false)
        setStartPoint(null)
        setCurrentBounds(null)
    }, [])

    return {
        isDrawing,
        rectangleBounds,
        currentBounds,
        startPoint,
        startDrawing,
        stopDrawing,
        resetRectangle,
        setStart,
        updateBounds,
        finalizeRectangle,
        setBounds
    }
}

