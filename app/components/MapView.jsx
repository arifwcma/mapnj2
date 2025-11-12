"use client"
import dynamic from "next/dynamic"
import { useEffect, useState, useRef } from "react"
import { useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import BoundaryLayer from "./BoundaryLayer"
import RectangleDrawHandler from "./RectangleDrawHandler"
import NdviOverlay from "./NdviOverlay"
import useBoundary from "@/app/hooks/useBoundary"
import { MAP_CENTER, MAP_ZOOM, MAP_STYLE, TILE_LAYER_STREET, TILE_LAYER_SATELLITE, RECTANGLE_STYLE, RECTANGLE_BORDER_STYLE } from "@/app/lib/mapConfig"

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })
const Rectangle = dynamic(() => import("react-leaflet").then(m => m.Rectangle), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false })

function FixMarkerIcon() {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('leaflet').then((L) => {
                delete L.default.Icon.Default.prototype._getIconUrl
                L.default.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'images/marker-icon-2x.png',
                    iconUrl: 'images/marker-icon.png',
                    shadowUrl: 'images/marker-shadow.png',
                })
            })
        }
    }, [])
    return null
}

function DraggableMarker({ position, children, draggable = false, onDragEnd, rectangleBounds }) {
    const previousPositionRef = useRef(null)
    const isDraggingRef = useRef(false)
    const markerRef = useRef(null)
    
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
    
    return (
        <Marker 
            ref={(ref) => {
                if (ref) {
                    markerRef.current = ref.leafletElement || ref
                }
            }}
            position={position}
            draggable={draggable}
            eventHandlers={draggable && onDragEnd ? {
                dragstart: (e) => {
                    isDraggingRef.current = true
                    const marker = e.target
                    const currentPos = marker.getLatLng()
                    previousPositionRef.current = { lat: currentPos.lat, lng: currentPos.lng }
                },
                dragend: (e) => {
                    const marker = e.target
                    const newPosition = marker.getLatLng()
                    
                    if (rectangleBounds) {
                        const bounds = rectangleBounds
                        const [minLat, minLng] = bounds[0]
                        const [maxLat, maxLng] = bounds[1]
                        
                        if (newPosition.lat < minLat || newPosition.lat > maxLat || 
                            newPosition.lng < minLng || newPosition.lng > maxLng) {
                            if (previousPositionRef.current) {
                                marker.setLatLng([previousPositionRef.current.lat, previousPositionRef.current.lng])
                            }
                            isDraggingRef.current = false
                            return
                        }
                    }
                    
                    const finalLat = newPosition.lat
                    const finalLng = newPosition.lng
                    
                    setTimeout(() => {
                        isDraggingRef.current = false
                        onDragEnd(finalLat, finalLng, false)
                    }, 10)
                }
            } : {}}
        >
            {children}
        </Marker>
    )
}

function SecondPointMarker({ position, children, draggable = false, onDragEnd, rectangleBounds }) {
    const [icon, setIcon] = useState(null)
    const previousPositionRef = useRef(null)
    const isDraggingRef = useRef(false)
    const markerRef = useRef(null)
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('leaflet').then((L) => {
                const redIcon = L.default.icon({
                    iconUrl: 'images/marker-icon-red.png',
                    iconRetinaUrl: 'images/marker-icon-2x-red.png',
                    shadowUrl: 'images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
                setIcon(redIcon)
            })
        }
    }, [])
    
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
            eventHandlers={draggable && onDragEnd ? {
                dragstart: (e) => {
                    isDraggingRef.current = true
                    const marker = e.target
                    const currentPos = marker.getLatLng()
                    previousPositionRef.current = { lat: currentPos.lat, lng: currentPos.lng }
                },
                dragend: (e) => {
                    const marker = e.target
                    const newPosition = marker.getLatLng()
                    
                    if (rectangleBounds) {
                        const bounds = rectangleBounds
                        const [minLat, minLng] = bounds[0]
                        const [maxLat, maxLng] = bounds[1]
                        
                        if (newPosition.lat < minLat || newPosition.lat > maxLat || 
                            newPosition.lng < minLng || newPosition.lng > maxLng) {
                            if (previousPositionRef.current) {
                                marker.setLatLng([previousPositionRef.current.lat, previousPositionRef.current.lng])
                            }
                            isDraggingRef.current = false
                            return
                        }
                    }
                    
                    const finalLat = newPosition.lat
                    const finalLng = newPosition.lng
                    marker.setLatLng([finalLat, finalLng])
                    
                    setTimeout(() => {
                        isDraggingRef.current = false
                        onDragEnd(finalLat, finalLng, true)
                    }, 0)
                }
            } : {}}
        >
            {children}
        </Marker>
    )
}

function MapResize({ ndviTileUrl, rgbTileUrl }) {
    const map = useMap()
    useEffect(() => {
        if (map) {
            setTimeout(() => {
                map.invalidateSize()
            }, 100)
        }
    }, [map, ndviTileUrl, rgbTileUrl])
    return null
}

function ZoomToRectangle({ bounds }) {
    const map = useMap()
    useEffect(() => {
        if (bounds && map) {
            map.fitBounds(bounds)
        }
    }, [bounds, map])
    return null
}

function PointClickHandler({ isActive, onPointClick }) {
    const map = useMap()
    
    useEffect(() => {
        if (!map || !isActive || !onPointClick) {
            console.log("PointClickHandler inactive:", { map: !!map, isActive, hasCallback: !!onPointClick })
            return
        }
        
        console.log("PointClickHandler active, setting up listener")
        const handleClick = (e) => {
            console.log("Map click detected:", e.latlng)
            const { lat, lng } = e.latlng
            onPointClick(lat, lng)
        }
        
        map.on("click", handleClick)
        
        return () => {
            console.log("Removing click listener")
            map.off("click", handleClick)
        }
    }, [map, isActive, onPointClick])
    
    return null
}

function MoveModeHandler({ isActive, onMarkerDragEnd }) {
    const map = useMap()
    
    useEffect(() => {
        if (!map) return
        
        if (isActive) {
            const container = map.getContainer()
            container.style.cursor = "move"
            container.style.setProperty("cursor", "move", "important")
            map.dragging.disable()
            map.doubleClickZoom.disable()
            map.scrollWheelZoom.disable()
            
            const styleId = "leaflet-move-cursor"
            let styleEl = document.getElementById(styleId)
            if (!styleEl) {
                styleEl = document.createElement("style")
                styleEl.id = styleId
                styleEl.textContent = `
                    .leaflet-container.leaflet-move-mode,
                    .leaflet-container.leaflet-move-mode *,
                    .leaflet-container.leaflet-move-mode svg,
                    .leaflet-container.leaflet-move-mode svg * {
                        cursor: move !important;
                    }
                    .leaflet-container.leaflet-move-mode .leaflet-marker-icon {
                        cursor: move !important;
                    }
                `
                document.head.appendChild(styleEl)
            }
            container.classList.add("leaflet-move-mode")
        } else {
            const container = map.getContainer()
            container.style.cursor = ""
            container.style.removeProperty("cursor")
            map.dragging.enable()
            map.doubleClickZoom.enable()
            map.scrollWheelZoom.enable()
            container.classList.remove("leaflet-move-mode")
        }
        
        return () => {
            if (isActive) {
                const container = map.getContainer()
                container.style.cursor = ""
                container.style.removeProperty("cursor")
                map.dragging.enable()
                map.doubleClickZoom.enable()
                map.scrollWheelZoom.enable()
                container.classList.remove("leaflet-move-mode")
            }
        }
    }, [map, isActive])
    
    return null
}

export default function MapView({ isDrawing, rectangleBounds, currentBounds, onStart, onUpdate, onEnd, onReset, ndviTileUrl, rgbTileUrl, overlayType, basemap = "street", isPointAnalysisMode = false, onPointClick, selectedPoint = null, secondPoint = null, isMoveMode = false, onMarkerDragEnd }) {
    const { boundary, loading, error } = useBoundary()
    const tileUrl = basemap === "satellite" ? TILE_LAYER_SATELLITE : TILE_LAYER_STREET
    const attribution = basemap === "satellite" 
        ? '&copy; <a href="https://www.esri.com/">Esri</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

    if (error) {
        return <div>Error loading boundary: {error.message}</div>
    }

    return (
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={MAP_STYLE}>
            <MapResize ndviTileUrl={ndviTileUrl} rgbTileUrl={rgbTileUrl} />
            <FixMarkerIcon />
            <TileLayer key={basemap} url={tileUrl} attribution={attribution} />
            {!isDrawing && !isMoveMode && <PointClickHandler isActive={isPointAnalysisMode} onPointClick={onPointClick || (() => {})} />}
            {isMoveMode && <MoveModeHandler isActive={isMoveMode} onMarkerDragEnd={onMarkerDragEnd} />}
            {boundary && <BoundaryLayer data={boundary} />}
            {isDrawing && (
                <RectangleDrawHandler
                    isDrawing={isDrawing}
                    onStart={onStart}
                    onUpdate={onUpdate}
                    onEnd={onEnd}
                />
            )}
            {currentBounds && <Rectangle bounds={currentBounds} pathOptions={RECTANGLE_STYLE} />}
            {rectangleBounds && (
                <>
                    <Rectangle bounds={rectangleBounds} pathOptions={RECTANGLE_BORDER_STYLE} />
                    <ZoomToRectangle bounds={rectangleBounds} />
                </>
            )}
            {ndviTileUrl && rectangleBounds && overlayType === "NDVI" && (
                <NdviOverlay key={`ndvi-${basemap}-${ndviTileUrl}`} tileUrl={ndviTileUrl} bounds={rectangleBounds} />
            )}
            {rgbTileUrl && rectangleBounds && overlayType === "RGB" && (
                <NdviOverlay key={`rgb-${basemap}-${rgbTileUrl}`} tileUrl={rgbTileUrl} bounds={rectangleBounds} />
            )}
            {selectedPoint && selectedPoint.lat !== null && selectedPoint.lon !== null && (
                <DraggableMarker 
                    position={[selectedPoint.lat, selectedPoint.lon]}
                    draggable={isMoveMode}
                    onDragEnd={onMarkerDragEnd}
                    rectangleBounds={rectangleBounds}
                />
            )}
            {secondPoint && secondPoint.lat !== null && secondPoint.lon !== null && (
                <SecondPointMarker 
                    position={[secondPoint.lat, secondPoint.lon]}
                    draggable={isMoveMode}
                    onDragEnd={onMarkerDragEnd}
                    rectangleBounds={rectangleBounds}
                />
            )}
        </MapContainer>
    )
}