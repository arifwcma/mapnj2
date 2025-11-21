"use client"
import dynamic from "next/dynamic"
import { useEffect, useState, useRef } from "react"
import { useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import BoundaryLayer from "./BoundaryLayer"
import RectangleDrawHandler from "./RectangleDrawHandler"
import NdviOverlay from "./NdviOverlay"
import FieldsLayer from "./FieldsLayer"
import useBoundary from "@/app/hooks/useBoundary"
import { MAP_CENTER, MAP_ZOOM, MAP_STYLE, TILE_LAYER_STREET, TILE_LAYER_SATELLITE, TILE_LAYER_TOPOGRAPHIC, RECTANGLE_STYLE, RECTANGLE_BORDER_STYLE, DEBUG_CONFIG, FIELD_SELECTION_MIN_ZOOM } from "@/app/lib/config"
import { validatePointInBounds, getAreaCenter } from "@/app/lib/bboxUtils"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { useStatusMessage } from "./StatusMessage"

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })
const Rectangle = dynamic(() => import("react-leaflet").then(m => m.Rectangle), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false })
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false })
const TriangleMarker = dynamic(() => import("./TriangleMarker"), { ssr: false })
const PointMonthsMarker = dynamic(() => import("./PointMonthsMarker"), { ssr: false })

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
                            onDragEnd(finalLat, finalLng, false)
                        }, 10)
                    }
                } : {})
            }}
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
                            onDragEnd(finalLat, finalLng, true)
                        }, 10)
                    }
                } : {})
            }}
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

function MapBoundsTracker({ onBoundsChange }) {
    const map = useMap()
    
    useEffect(() => {
        if (!map || !onBoundsChange) return
        
        const updateBounds = () => {
            try {
                const bounds = map.getBounds()
                const sw = bounds.getSouthWest()
                const ne = bounds.getNorthEast()
                const boundsArray = [
                    [sw.lat, sw.lng],
                    [ne.lat, ne.lng]
                ]
                onBoundsChange(boundsArray)
            } catch (e) {
                console.error("[MapBoundsTracker] Error getting bounds:", e)
            }
        }
        
        const timeout = setTimeout(() => {
            updateBounds()
        }, 100)
        
        map.on("moveend", updateBounds)
        map.on("zoomend", updateBounds)
        map.on("load", updateBounds)
        
        return () => {
            clearTimeout(timeout)
            map.off("moveend", updateBounds)
            map.off("zoomend", updateBounds)
            map.off("load", updateBounds)
        }
    }, [map, onBoundsChange])
    
    return null
}

function FieldSelectionBoundsUpdater({ fieldSelectionMode, onBoundsChange }) {
    const map = useMap()
    
    useEffect(() => {
        if (!fieldSelectionMode || !map || !onBoundsChange) {
            return
        }
        
        const updateBounds = () => {
            try {
                const bounds = map.getBounds()
                if (!bounds) {
                    return
                }
                const sw = bounds.getSouthWest()
                const ne = bounds.getNorthEast()
                const boundsArray = [
                    [sw.lat, sw.lng],
                    [ne.lat, ne.lng]
                ]
                onBoundsChange(boundsArray)
            } catch (e) {
                console.error("[FieldSelectionBoundsUpdater] Error getting bounds:", e)
            }
        }
        
        updateBounds()
        
        map.on("moveend", updateBounds)
        map.on("zoomend", updateBounds)
        
        return () => {
            map.off("moveend", updateBounds)
            map.off("zoomend", updateBounds)
        }
    }, [fieldSelectionMode, map, onBoundsChange])
    
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

function ZoomLogger() {
    return null
}

function ZoomTracker({ onZoomChange }) {
    const map = useMap()
    
    useEffect(() => {
        if (!map || !onZoomChange) {
            return
        }
        
        const handleZoomEnd = () => {
            const zoom = map.getZoom()
            onZoomChange(zoom)
        }
        
        const timeout = setTimeout(() => {
            const initialZoom = map.getZoom()
            onZoomChange(initialZoom)
            map.on("zoomend", handleZoomEnd)
        }, 500)
        
        return () => {
            clearTimeout(timeout)
            map.off("zoomend", handleZoomEnd)
        }
    }, [map, onZoomChange])
    
    return null
}

function PointClickHandler({ isActive, onPointClick }) {
    const map = useMap()
    
    useEffect(() => {
        if (!map || !isActive || !onPointClick) {
            return
        }
        
        const handleClick = (e) => {
            const { lat, lng } = e.latlng
            onPointClick(lat, lng)
        }
        
        map.on("click", handleClick)
        
        return () => {
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

/**
 * @param {Object} props
 * @param {boolean} [props.isDrawing]
 * @param {any} [props.rectangleBounds]
 * @param {any} [props.currentBounds]
 * @param {any} [props.onStart]
 * @param {any} [props.onUpdate]
 * @param {any} [props.onEnd]
 * @param {any} [props.onReset]
 * @param {string|null} [props.ndviTileUrl]
 * @param {string|null} [props.rgbTileUrl]
 * @param {string} [props.overlayType]
 * @param {string} [props.basemap]
 * @param {boolean} [props.isPointClickMode]
 * @param {boolean} [props.isPointSelectMode]
 * @param {any} [props.onPointClick]
 * @param {any} [props.selectedPoint]
 * @param {Array} [props.selectedPoints]
 * @param {any} [props.secondPoint]
 * @param {boolean} [props.isMoveMode]
 * @param {any} [props.onMarkerDragEnd]
 * @param {boolean} [props.fieldSelectionMode]
 * @param {any} [props.fieldsData]
 * @param {'rectangle'|'field'|null} [props.boundsSource]
 * @param {any} [props.selectedFieldFeature]
 * @param {any} [props.onFieldClick]
 * @param {number|null} [props.currentZoom]
 * @param {any} [props.onZoomChange]
 * @param {Array} [props.selectedAreas]
 * @param {string} [props.analysisMode]
 * @param {string} [props.compareMode]
 * @param {Function} [props.onMapBoundsChange]
 */
export default function MapView({ isDrawing, rectangleBounds, currentBounds, onStart, onUpdate, onEnd, onReset, ndviTileUrl, rgbTileUrl, overlayType, basemap = "street", isPointClickMode = false, isPointSelectMode = false, onPointClick, selectedPoint = null, selectedPoints = [], secondPoint = null, isMoveMode = false, onMarkerDragEnd, fieldSelectionMode = false, fieldsData = null, fieldsLoading = false, boundsSource = null, selectedFieldFeature = null, onFieldClick, currentZoom, onZoomChange, selectedAreas = [], analysisMode = "point", compareMode = "points", onMapBoundsChange }) {
    const { boundary, loading, error } = useBoundary()
    const { setStatusMessage } = useStatusMessage()
    
    useEffect(() => {
        if (error) {
            setStatusMessage(`Error loading boundary: ${error.message}`)
        } else {
            setStatusMessage(null)
        }
        return () => setStatusMessage(null)
    }, [error, setStatusMessage])
    
    const getBasemapTileUrl = () => {
        return basemap === "satellite" 
            ? TILE_LAYER_SATELLITE 
            : basemap === "topographic" 
            ? TILE_LAYER_TOPOGRAPHIC 
            : TILE_LAYER_STREET
    }
    
    const tileUrl = getBasemapTileUrl()
    
    const getAttribution = () => {
        return basemap === "satellite" 
            ? '&copy; <a href="https://www.esri.com/">Esri</a>'
            : basemap === "topographic"
            ? '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
    
    const attribution = getAttribution()

    return (
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={MAP_STYLE}>
            <MapResize ndviTileUrl={ndviTileUrl} rgbTileUrl={rgbTileUrl} />
            <FixMarkerIcon />
            <ZoomLogger />
            {onZoomChange && <ZoomTracker onZoomChange={onZoomChange} />}
            {onMapBoundsChange && <MapBoundsTracker onBoundsChange={onMapBoundsChange} />}
            {onMapBoundsChange && <FieldSelectionBoundsUpdater fieldSelectionMode={fieldSelectionMode} onBoundsChange={onMapBoundsChange} />}
            {tileUrl && (
                <TileLayer 
                    key={basemap} 
                    url={tileUrl} 
                    attribution={attribution}
                />
            )}
            {!isDrawing && !isMoveMode && !fieldSelectionMode && <PointClickHandler isActive={isPointClickMode || isPointSelectMode} onPointClick={onPointClick || (() => {})} />}
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
            {analysisMode === "area" && selectedAreas.map((area, index) => {
                if (area.boundsSource === 'field' && area.geometry) {
                    return (
                        <GeoJSON
                            key={area.id}
                            data={{
                                type: "FeatureCollection",
                                features: [area.geometry]
                            }}
                            style={{ color: area.color, fillOpacity: 0, weight: 2 }}
                        />
                    )
                } else if (area.boundsSource === 'rectangle') {
                    return (
                        <Rectangle
                            key={area.id}
                            bounds={area.bounds}
                            pathOptions={{ color: area.color, fillOpacity: 0, weight: 2 }}
                        />
                    )
                }
                return null
            })}
            {analysisMode === "point" && rectangleBounds && boundsSource !== 'field' && (
                <>
                    <Rectangle bounds={rectangleBounds} pathOptions={RECTANGLE_BORDER_STYLE} />
                    <ZoomToRectangle bounds={rectangleBounds} />
                </>
            )}
            {analysisMode === "point" && rectangleBounds && boundsSource === 'field' && selectedFieldFeature && (
                <>
                    <GeoJSON 
                        data={{
                            type: "FeatureCollection",
                            features: [selectedFieldFeature]
                        }} 
                        style={RECTANGLE_BORDER_STYLE} 
                    />
                    <ZoomToRectangle bounds={rectangleBounds} />
                </>
            )}
            {analysisMode === "area" && (compareMode === "areas" || compareMode === "months") && selectedAreas && selectedAreas.length > 0 && selectedAreas.map((area) => {
                if (overlayType === "NDVI" && area.ndviTileUrl && area.bounds) {
                    return (
                        <NdviOverlay 
                            key={`ndvi-${area.id}-${area.ndviTileUrl}`} 
                            tileUrl={area.ndviTileUrl} 
                            bounds={area.bounds} 
                        />
                    )
                }
                if (overlayType === "RGB" && area.rgbTileUrl && area.bounds) {
                    return (
                        <NdviOverlay 
                            key={`rgb-${area.id}-${area.rgbTileUrl}`} 
                            tileUrl={area.rgbTileUrl} 
                            bounds={area.bounds} 
                        />
                    )
                }
                return null
            })}
            {analysisMode !== "area" && ndviTileUrl && rectangleBounds && overlayType === "NDVI" && (
                <NdviOverlay key={`ndvi-${basemap}-${ndviTileUrl}`} tileUrl={ndviTileUrl} bounds={rectangleBounds} />
            )}
            {analysisMode !== "area" && rgbTileUrl && rectangleBounds && overlayType === "RGB" && (
                <NdviOverlay key={`rgb-${basemap}-${rgbTileUrl}`} tileUrl={rgbTileUrl} bounds={rectangleBounds} />
            )}
            {selectedPoints && selectedPoints.length > 0 && selectedPoints.map((point, index) => (
                <TriangleMarker
                    key={point.id}
                    position={[point.lat, point.lon]}
                    color={getColorForIndex(index)}
                    index={index}
                />
            ))}
            {selectedPoint && selectedPoint.lat !== null && selectedPoint.lon !== null && (
                compareMode === "months" && analysisMode === "point" ? (
                    <PointMonthsMarker 
                        position={[selectedPoint.lat, selectedPoint.lon]}
                        draggable={isMoveMode}
                        onDragEnd={onMarkerDragEnd}
                        rectangleBounds={rectangleBounds}
                    />
                ) : !selectedPoints?.length ? (
                    <DraggableMarker 
                        position={[selectedPoint.lat, selectedPoint.lon]}
                        draggable={isMoveMode}
                        onDragEnd={onMarkerDragEnd}
                        rectangleBounds={rectangleBounds}
                    />
                ) : null
            )}
            {secondPoint && secondPoint.lat !== null && secondPoint.lon !== null && (
                <SecondPointMarker 
                    position={[secondPoint.lat, secondPoint.lon]}
                    draggable={isMoveMode}
                    onDragEnd={onMarkerDragEnd}
                    rectangleBounds={rectangleBounds}
                />
            )}
            {analysisMode === "area" && (compareMode === "areas" || compareMode === "months") && selectedAreas && selectedAreas.length > 0 && selectedAreas.map((area, index) => {
                const center = getAreaCenter(area)
                if (!center) return null
                return (
                    <TriangleMarker
                        key={area.id}
                        position={[center.lat, center.lon]}
                        color={getColorForIndex(index)}
                        index={index}
                    />
                )
            })}
            <FieldsLayer 
                fieldSelectionMode={fieldSelectionMode}
                fieldsData={fieldsData}
                fieldsLoading={fieldsLoading}
                boundsSource={boundsSource}
                onFieldClick={onFieldClick}
                currentZoom={currentZoom}
            />
        </MapContainer>
    )
}