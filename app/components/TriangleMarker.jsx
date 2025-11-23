"use client"
import { useEffect, useState } from "react"
import { Marker, Tooltip } from "react-leaflet"
import L from "leaflet"

export default function TriangleMarker({ position, color, index }) {
    const [icon, setIcon] = useState(null)
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('leaflet').then((L) => {
                const triangleIcon = L.default.divIcon({
                    className: "triangle-marker",
                    html: `
                        <div style="
                            width: 0;
                            height: 0;
                            border-left: 8px solid transparent;
                            border-right: 8px solid transparent;
                            border-top: 12px solid ${color};
                            position: relative;
                        ">
                            <div style="
                                position: absolute;
                                top: -20px;
                                left: 50%;
                                transform: translateX(-50%);
                                background: white;
                                border: 1px solid ${color};
                                border-radius: 50%;
                                width: 18px;
                                height: 18px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: bold;
                                color: ${color};
                            ">${index + 1}</div>
                        </div>
                    `,
                    iconSize: [16, 16],
                    iconAnchor: [8, 12]
                })
                setIcon(triangleIcon)
            })
        }
    }, [color, index])
    
    if (!icon || !position) return null
    
    const lat = Array.isArray(position) ? position[0] : position.lat
    const lon = Array.isArray(position) ? position[1] : position.lng
    
    return (
        <Marker
            position={position}
            icon={icon}
        >
            <Tooltip>
                {lat.toFixed(6)}, {lon.toFixed(6)}
            </Tooltip>
        </Marker>
    )
}

