"use client"
import { useEffect, useMemo, useRef } from "react"
import { Marker, Tooltip } from "react-leaflet"
import { getColorForIndex } from "@/app/lib/colorUtils"

export default function PointMonthsMarker({ position }) {
    const markerRef = useRef(null)
    const color = getColorForIndex(0)
    
    const icon = useMemo(() => {
        if (typeof window === 'undefined') return null
        try {
            const L = require('leaflet')
            return L.default.divIcon({
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
        } catch (e) {
            return null
        }
    }, [color])
    
    useEffect(() => {
        if (markerRef.current && position) {
            const currentPos = markerRef.current.getLatLng()
            const posLat = Array.isArray(position) ? position[0] : position.lat
            const posLng = Array.isArray(position) ? position[1] : position.lng
            
            if (Math.abs(currentPos.lat - posLat) > 0.000001 || Math.abs(currentPos.lng - posLng) > 0.000001) {
                markerRef.current.setLatLng([posLat, posLng])
            }
        }
    }, [position])
    
    if (!position) return null
    
    const posLat = Array.isArray(position) ? position[0] : position.lat
    const posLng = Array.isArray(position) ? position[1] : position.lng
    
    return (
        <Marker 
            ref={(ref) => {
                if (ref) {
                    markerRef.current = ref.leafletElement || ref
                }
            }}
            position={position}
            {...(icon ? { icon } : {})}
            eventHandlers={{
                click: (e) => {
                    e.originalEvent.stopPropagation()
                }
            }}
        >
            <Tooltip>
                {posLat.toFixed(6)}, {posLng.toFixed(6)}
            </Tooltip>
        </Marker>
    )
}

