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
            container.style.setProperty("cursor", "crosshair", "important")
            map.dragging.disable()
            map.doubleClickZoom.disable()
            map.scrollWheelZoom.disable()

            const styleId = "leaflet-drawing-cursor"
            let styleEl = document.getElementById(styleId)
            if (!styleEl) {
                styleEl = document.createElement("style")
                styleEl.id = styleId
                styleEl.textContent = `
                    .leaflet-container.leaflet-drawing,
                    .leaflet-container.leaflet-drawing *,
                    .leaflet-container.leaflet-drawing svg,
                    .leaflet-container.leaflet-drawing svg * {
                        cursor: crosshair !important;
                    }
                `
                document.head.appendChild(styleEl)
            }
            container.classList.add("leaflet-drawing")

            const handleMouseDown = (e) => {
                e.preventDefault()
                e.stopPropagation()
                e.stopImmediatePropagation()
                isDraggingRef.current = true
                const latlng = map.mouseEventToLatLng(e)
                callbacksRef.current.onStart(latlng)
            }

            const handleMouseMove = (e) => {
                if (isDraggingRef.current) {
                    e.preventDefault()
                    e.stopPropagation()
                    e.stopImmediatePropagation()
                    const latlng = map.mouseEventToLatLng(e)
                    callbacksRef.current.onUpdate(latlng)
                }
            }

            const handleMouseUp = (e) => {
                if (isDraggingRef.current) {
                    e.preventDefault()
                    e.stopPropagation()
                    e.stopImmediatePropagation()
                    isDraggingRef.current = false
                    container.style.cursor = ""
                    container.classList.remove("leaflet-drawing")
                    const styleEl = document.getElementById("leaflet-drawing-cursor")
                    if (styleEl) {
                        styleEl.remove()
                    }
                    map.dragging.enable()
                    map.doubleClickZoom.enable()
                    map.scrollWheelZoom.enable()
                    callbacksRef.current.onEnd()
                }
            }

            container.addEventListener("mousedown", handleMouseDown, true)
            container.addEventListener("mousemove", handleMouseMove, true)
            container.addEventListener("mouseup", handleMouseUp, true)

            return () => {
                isDraggingRef.current = false
                const container = map.getContainer()
                container.style.cursor = ""
                container.classList.remove("leaflet-drawing")
                const styleEl = document.getElementById("leaflet-drawing-cursor")
                if (styleEl) {
                    styleEl.remove()
                }
                map.dragging.enable()
                map.doubleClickZoom.enable()
                map.scrollWheelZoom.enable()
                container.removeEventListener("mousedown", handleMouseDown, true)
                container.removeEventListener("mousemove", handleMouseMove, true)
                container.removeEventListener("mouseup", handleMouseUp, true)
            }
        } else {
            const container = map.getContainer()
            container.style.cursor = ""
            container.classList.remove("leaflet-drawing")
            const styleEl = document.getElementById("leaflet-drawing-cursor")
            if (styleEl) {
                styleEl.remove()
            }
            map.dragging.enable()
            map.doubleClickZoom.enable()
            map.scrollWheelZoom.enable()
        }
    }, [map, isDrawing])

    return null
}
