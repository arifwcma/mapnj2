"use client"
import { useEffect, useState, useRef } from "react"
import { Marker } from "react-leaflet"
import L from "leaflet"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { validatePointInBounds } from "@/app/lib/bboxUtils"

export default function PointMonthsMarker({ position, draggable = false, onDragEnd, rectangleBounds }) {
    const [icon, setIcon] = useState(null)
    const markerRef = useRef(null)
    const previousPositionRef = useRef(null)
    const isDraggingRef = useRef(false)
    const color = getColorForIndex(0)
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('leaflet').then((L) => {
                const circleIcon = L.default.divIcon({
                    className: "point-months-marker",
                    html: `
                        <div style="
                            width: 20px;
                            height: 20px;
                            border: 2px solid ${color};
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            color: ${color};
                            background-color: white;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">1</div>
                    `,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
                setIcon(circleIcon)
            })
        }
    }, [color])
    
    useEffect(() => {
        if (markerRef.current && !isDraggingRef.current) {
            const currentPos = markerRef.current.getLatLng()
            const posLat = Array.isArray(position) ? position[0] : position.lat
            const posLng = Array.isArray(position) ? position[1] : position.lng
            
            if (Math.abs(currentPos.lat - posLat) > 0.000001 || Math.abs(currentPos.lng - posLng) > 0.000001) {
                markerRef.current.setLatLng([posLat, posLng])
            }
        }
    }, [position])
    
    if (!icon || !position) return null
    
    return (
        <Marker 
            ref={(ref) => {
                if (ref) {
                    markerRef.current = ref.leafletElement || ref
                }
            }}
            position={position}
            icon={icon}
            draggable={draggable}
            eventHandlers={{
                click: (e) => {
                    e.originalEvent.stopPropagation()
                },
                ...(draggable && onDragEnd ? {
                    dragstart: (e) => {
                        isDraggingRef.current = true
                        const marker = e.target
                        const currentPos = marker.getLatLng()
                        previousPositionRef.current = { lat: currentPos.lat, lng: currentPos.lng }
                    },
                    dragend: (e) => {
                        const marker = e.target
                        const newPosition = marker.getLatLng()
                        
                        if (rectangleBounds && !validatePointInBounds(newPosition.lat, newPosition.lng, rectangleBounds)) {
                            if (previousPositionRef.current) {
                                marker.setLatLng([previousPositionRef.current.lat, previousPositionRef.current.lng])
                            }
                            isDraggingRef.current = false
                            return
                        }
                        
                        const finalLat = newPosition.lat
                        const finalLng = newPosition.lng
                        
                        setTimeout(() => {
                            isDraggingRef.current = false
                            if (onDragEnd) {
                                onDragEnd(finalLat, finalLng)
                            }
                        }, 100)
                    }
                } : {})
            }}
        />
    )
}

