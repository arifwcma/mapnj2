"use client"
import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"

export default function RectangleDrawHandler({ isDrawing, onStart, onUpdate, onEnd }) {
    const map = useMap()
    const isDraggingRef = useRef(false)
    const callbacksRef = useRef({ onStart, onUpdate, onEnd })

    useEffect(() => {
        callbacksRef.current = { onStart, onUpdate, onEnd }
    }, [onStart, onUpdate, onEnd])

    useEffect(() => {
        if (!map) return

        if (isDrawing) {
            const container = map.getContainer()
            container.style.cursor = "crosshair"
            map.dragging.disable()

            const handleMouseDown = (e) => {
                e.preventDefault()
                e.stopPropagation()
                isDraggingRef.current = true
                const latlng = map.mouseEventToLatLng(e)
                callbacksRef.current.onStart(latlng)
            }

            const handleMouseMove = (e) => {
                if (isDraggingRef.current) {
                    e.preventDefault()
                    e.stopPropagation()
                    const latlng = map.mouseEventToLatLng(e)
                    callbacksRef.current.onUpdate(latlng)
                }
            }

            const handleMouseUp = (e) => {
                if (isDraggingRef.current) {
                    e.preventDefault()
                    e.stopPropagation()
                    isDraggingRef.current = false
                    container.style.cursor = ""
                    map.dragging.enable()
                    callbacksRef.current.onEnd()
                }
            }

            container.addEventListener("mousedown", handleMouseDown, true)
            container.addEventListener("mousemove", handleMouseMove, true)
            container.addEventListener("mouseup", handleMouseUp, true)

            return () => {
                isDraggingRef.current = false
                container.style.cursor = ""
                map.dragging.enable()
                container.removeEventListener("mousedown", handleMouseDown, true)
                container.removeEventListener("mousemove", handleMouseMove, true)
                container.removeEventListener("mouseup", handleMouseUp, true)
            }
        } else {
            const container = map.getContainer()
            container.style.cursor = ""
            map.dragging.enable()
        }
    }, [map, isDrawing])

    return null
}
