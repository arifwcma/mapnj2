"use client"
import dynamic from "next/dynamic"
import { useEffect, useRef, useLayoutEffect, useState } from "react"
import { useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import BoundaryLayer from "./BoundaryLayer"
import RectangleDrawHandler from "./RectangleDrawHandler"
import NdviOverlay from "./NdviOverlay"
import FieldsLayer from "./FieldsLayer"
import useBoundary from "@/app/hooks/useBoundary"
import { MAP_CENTER, MAP_ZOOM, MAP_STYLE, TILE_LAYER_STREET, TILE_LAYER_SATELLITE, TILE_LAYER_TOPOGRAPHIC, RECTANGLE_STYLE, RECTANGLE_BORDER_STYLE } from "@/app/lib/config"
import { getAreaCenter } from "@/app/lib/bboxUtils"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { useStatusMessage } from "./StatusMessage"
import { preloadLeaflet } from "@/app/lib/leafletCache"

preloadLeaflet()

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })
const Rectangle = dynamic(() => import("react-leaflet").then(m => m.Rectangle), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false })
const Tooltip = dynamic(() => import("react-leaflet").then(m => m.Tooltip), { ssr: false })
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false })
const IndexedMarker = dynamic(() => import("./IndexedMarker"), { ssr: false })


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

function StaticMarker({ position, children }) {
    const markerRef = useRef(null)
    
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
            eventHandlers={{
                click: (e) => {
                    e.originalEvent.stopPropagation()
                }
            }}
        >
            <Tooltip>
                {posLat.toFixed(6)}, {posLng.toFixed(6)}
            </Tooltip>
            {children}
        </Marker>
    )
}

function MapResize({ indexTileUrl, rgbTileUrl }) {
    const map = useMap()
    useEffect(() => {
        if (map) {
            setTimeout(() => {
                map.invalidateSize()
            }, 100)
        }
    }, [map, indexTileUrl, rgbTileUrl])
    return null
}

function MapRestore({ initialZoom, initialBounds, onZoomChange, onMapBoundsChange }) {
    const map = useMap()
    const restoredRef = useRef(false)
    const lastValuesRef = useRef({ zoom: null, bounds: null })
    
    useEffect(() => {
        if (!map) return
        
        const hasValues = (initialZoom !== null && initialZoom !== undefined) || initialBounds !== null
        const valuesChanged = 
            lastValuesRef.current.zoom !== initialZoom || 
            JSON.stringify(lastValuesRef.current.bounds) !== JSON.stringify(initialBounds)
        
        if (!hasValues) {
            lastValuesRef.current = { zoom: initialZoom, bounds: initialBounds }
            return
        }
        
        if (!valuesChanged && restoredRef.current) {
            return
        }
        
        if (valuesChanged) {
            restoredRef.current = false
            lastValuesRef.current = { zoom: initialZoom, bounds: initialBounds }
        }
        
        const restore = () => {
            const shouldRestoreZoom = initialZoom !== null && initialZoom !== undefined
            const shouldRestoreBounds = initialBounds !== null
            
            if (shouldRestoreZoom) {
                map.setZoom(initialZoom, { animate: false })
                if (onZoomChange) {
                    onZoomChange(initialZoom)
                }
            }
            
            if (shouldRestoreBounds) {
                const [[swLat, swLng], [neLat, neLng]] = initialBounds
                const bounds = [[swLat, swLng], [neLat, neLng]]
                map.fitBounds(bounds, { animate: false })
                if (onMapBoundsChange) {
                    setTimeout(() => {
                        const mapBounds = map.getBounds()
                        const sw = mapBounds.getSouthWest()
                        const ne = mapBounds.getNorthEast()
                        onMapBoundsChange([
                            [sw.lat, sw.lng],
                            [ne.lat, ne.lng]
                        ])
                    }, 100)
                }
            }
            
            if (shouldRestoreZoom || shouldRestoreBounds) {
                restoredRef.current = true
            }
        }
        
        const tryRestore = () => {
            if (map._loaded) {
                setTimeout(() => restore(), 100)
            } else {
                map.whenReady(() => {
                    setTimeout(() => restore(), 100)
                })
            }
        }
        
        tryRestore()
    }, [map, initialZoom, initialBounds, onZoomChange, onMapBoundsChange])
    
    return null
}

function MapBoundsTracker({ onBoundsChange }) {
    const map = useMap()
    const onBoundsChangeRef = useRef(onBoundsChange)
    
    useLayoutEffect(() => {
        onBoundsChangeRef.current = onBoundsChange
    })
    
    useEffect(() => {
        if (!map) return
        
        const updateBounds = () => {
            try {
                const bounds = map.getBounds()
                const sw = bounds.getSouthWest()
                const ne = bounds.getNorthEast()
                const boundsArray = [
                    [sw.lat, sw.lng],
                    [ne.lat, ne.lng]
                ]
                onBoundsChangeRef.current?.(boundsArray)
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
    }, [map])
    
    return null
}

function FieldSelectionBoundsUpdater({ fieldSelectionMode, onBoundsChange }) {
    const map = useMap()
    const onBoundsChangeRef = useRef(onBoundsChange)
    
    useLayoutEffect(() => {
        onBoundsChangeRef.current = onBoundsChange
    })
    
    useEffect(() => {
        if (!fieldSelectionMode || !map) {
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
                onBoundsChangeRef.current?.(boundsArray)
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
    }, [fieldSelectionMode, map])
    
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

function PanToLocation({ position }) {
    const map = useMap()
    useEffect(() => {
        if (position && map) {
            map.panTo(position)
        }
    }, [position, map])
    return null
}

function MaxBoundsSetter({ bounds }) {
    const map = useMap()
    
    useEffect(() => {
        if (map && bounds) {
            try {
                const L = require("leaflet")
                const latLngBounds = L.latLngBounds(bounds)
                map.setMaxBounds(latLngBounds)
            } catch (err) {
                console.error("Error setting maxBounds:", err)
            }
        } else if (map) {
            map.setMaxBounds(null)
        }
    }, [map, bounds])
    
    return null
}

function GoToXYHandler({ position, onComplete }) {
    const map = useMap()
    useEffect(() => {
        if (position && map) {
            map.panTo(position)
            if (onComplete) {
                setTimeout(() => {
                    onComplete()
                }, 100)
            }
        }
    }, [position, map, onComplete])
    return null
}

function ZoomTracker({ onZoomChange }) {
    const map = useMap()
    const onZoomChangeRef = useRef(onZoomChange)
    
    useLayoutEffect(() => {
        onZoomChangeRef.current = onZoomChange
    })
    
    useEffect(() => {
        if (!map) {
            return
        }
        
        const handleZoomEnd = () => {
            const zoom = map.getZoom()
            onZoomChangeRef.current?.(zoom)
        }
        
        const timeout = setTimeout(() => {
            const initialZoom = map.getZoom()
            onZoomChangeRef.current?.(initialZoom)
            map.on("zoomend", handleZoomEnd)
        }, 500)
        
        return () => {
            clearTimeout(timeout)
            map.off("zoomend", handleZoomEnd)
        }
    }, [map])
    
    return null
}

function CrosshairCursor() {
    const map = useMap()
    
    useEffect(() => {
        if (!map) {
            return
        }
        
        const container = map.getContainer()
        container.style.cursor = "crosshair"
        container.style.setProperty("cursor", "crosshair", "important")
        
        const styleId = "leaflet-copy-coordinate-cursor"
        let styleEl = document.getElementById(styleId)
        if (!styleEl) {
            styleEl = document.createElement("style")
            styleEl.id = styleId
            styleEl.textContent = `
                .leaflet-container.leaflet-copy-coordinate,
                .leaflet-container.leaflet-copy-coordinate *,
                .leaflet-container.leaflet-copy-coordinate svg,
                .leaflet-container.leaflet-copy-coordinate svg *,
                .leaflet-container.leaflet-copy-coordinate path {
                    cursor: crosshair !important;
                }
            `
            document.head.appendChild(styleEl)
        }
        container.classList.add("leaflet-copy-coordinate")
        
        return () => {
            container.style.cursor = ""
            container.style.removeProperty("cursor")
            container.classList.remove("leaflet-copy-coordinate")
        }
    }, [map])
    
    return null
}

function PointClickHandler({ isActive, onPointClick }) {
    const map = useMap()
    const onPointClickRef = useRef(onPointClick)
    
    useLayoutEffect(() => {
        onPointClickRef.current = onPointClick
    })
    
    useEffect(() => {
        if (!map || !isActive) {
            return
        }
        
        const handleClick = (e) => {
            const { lat, lng } = e.latlng
            onPointClickRef.current?.(lat, lng)
        }
        
        map.on("click", handleClick)
        
        return () => {
            map.off("click", handleClick)
        }
    }, [map, isActive])
    
    return null
}

const EMPTY_POINTS_ARRAY = /** @type {Array<{ id: string, lat: number, lon: number }>} */ ([])
const EMPTY_AREAS_ARRAY = /** @type {Array<{ id: string, geometry: any, bounds: [[number, number], [number, number]], label: string, boundsSource: 'rectangle' | 'field' }>} */ ([])

export default function MapView({ isDrawing, rectangleBounds, currentBounds, onStart, onUpdate, onEnd, onReset = undefined, indexTileUrl, rgbTileUrl, overlayType, basemap = "street", isPointClickMode = false, isPointSelectMode = false, onPointClick, selectedPoint = /** @type {null | { lat: number | null, lon: number | null }} */ (null), selectedPoints = EMPTY_POINTS_ARRAY, fieldSelectionMode = false, fieldsData = null, fieldsLoading = false, boundsSource = /** @type {null | 'rectangle' | 'field'} */ (null), selectedFieldFeature = null, onFieldClick, currentZoom, onZoomChange, selectedAreas = EMPTY_AREAS_ARRAY, analysisMode = "point", compareMode = "points", onMapBoundsChange, initialZoom = /** @type {null | number} */ (null), initialBounds = /** @type {null | [[number, number], [number, number]]} */ (null), focusPointIndex = /** @type {null | number} */ (null), focusAreaIndex = /** @type {null | number} */ (null), copyCoordinateMode = false, goToXYPosition = /** @type {null | [number, number]} */ (null), onGoToXYComplete = () => {}, selectedIndex = "NDVI", selectedYear = null, selectedMonth = null, cloudTolerance = 50 }) {
    const { boundary, loading, error } = useBoundary()
    const { setStatusMessage } = useStatusMessage()
    const [boundaryBounds, setBoundaryBounds] = useState(null)
    
    useEffect(() => {
        if (error) {
            setStatusMessage(`Error loading boundary: ${error.message}`)
        } else {
            setStatusMessage(null)
        }
        return () => setStatusMessage(null)
    }, [error, setStatusMessage])
    
    useEffect(() => {
        if (boundary) {
            try {
                const L = require("leaflet")
                const layer = new L.GeoJSON(boundary)
                const bounds = layer.getBounds()
                if (bounds && bounds.isValid && bounds.isValid()) {
                    const sw = bounds.getSouthWest()
                    const ne = bounds.getNorthEast()
                    setBoundaryBounds([
                        [sw.lat, sw.lng],
                        [ne.lat, ne.lng]
                    ])
                }
            } catch (err) {
                console.error("Error calculating boundary bounds:", err)
            }
        } else {
            setBoundaryBounds(null)
        }
    }, [boundary])
    
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

    const mapCenter = initialBounds ? [
        (initialBounds[0][0] + initialBounds[1][0]) / 2,
        (initialBounds[0][1] + initialBounds[1][1]) / 2
    ] : MAP_CENTER
    const mapZoom = initialZoom !== null && initialZoom !== undefined ? initialZoom : MAP_ZOOM
    
    return (
        <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            style={MAP_STYLE}
            maxBoundsViscosity={1.0}
        >
            <MaxBoundsSetter bounds={boundaryBounds} />
            <MapResize indexTileUrl={indexTileUrl} rgbTileUrl={rgbTileUrl} />
            <FixMarkerIcon />
            <MapRestore initialZoom={initialZoom} initialBounds={initialBounds} onZoomChange={onZoomChange} onMapBoundsChange={onMapBoundsChange} />
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
            {!isDrawing && !fieldSelectionMode && <PointClickHandler isActive={isPointClickMode || isPointSelectMode || copyCoordinateMode} onPointClick={onPointClick || (() => {})} />}
            {copyCoordinateMode && <CrosshairCursor />}
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
            {analysisMode === "area" && (compareMode === "areas" || compareMode === "months") && selectedAreas && selectedAreas.length > 0 && selectedAreas.map((area, idx) => {
                const elements = []
                
                if (overlayType === "INDEX" && area.indexTileUrl && area.bounds) {
                    elements.push(
                        <NdviOverlay 
                            key={`index-${area.id}-${selectedIndex}-${selectedYear}-${selectedMonth}-${cloudTolerance}-${area.indexTileUrl}`} 
                            tileUrl={area.indexTileUrl} 
                            bounds={area.bounds} 
                        />
                    )
                }
                if (overlayType === "RGB" && area.rgbTileUrl && area.bounds) {
                    elements.push(
                        <NdviOverlay 
                            key={`rgb-${area.id}-${selectedYear}-${selectedMonth}-${cloudTolerance}-${area.rgbTileUrl}`} 
                            tileUrl={area.rgbTileUrl} 
                            bounds={area.bounds} 
                        />
                    )
                }
                
                if (area.bounds) {
                    if (area.boundsSource === 'field' && area.geometry) {
                        elements.push(
                            <GeoJSON 
                                key={`border-${area.id}`}
                                data={{
                                    type: "FeatureCollection",
                                    features: [area.geometry]
                                }}
                                style={{ color: "#22c55e", weight: 3, fillOpacity: 0, opacity: 1 }}
                            />
                        )
                    } else {
                        elements.push(
                            <Rectangle 
                                key={`border-${area.id}`}
                                bounds={area.bounds}
                                pathOptions={{ color: "#22c55e", weight: 3, fillOpacity: 0, opacity: 1 }}
                            />
                        )
                    }
                }
                
                return elements.length > 0 ? elements : null
            })}
            {analysisMode !== "area" && indexTileUrl && rectangleBounds && overlayType === "INDEX" && (
                <NdviOverlay key={`index-${basemap}-${selectedIndex}-${selectedYear}-${selectedMonth}-${cloudTolerance}-${indexTileUrl}`} tileUrl={indexTileUrl} bounds={rectangleBounds} />
            )}
            {analysisMode !== "area" && rgbTileUrl && rectangleBounds && overlayType === "RGB" && (
                <NdviOverlay key={`rgb-${basemap}-${selectedYear}-${selectedMonth}-${cloudTolerance}-${rgbTileUrl}`} tileUrl={rgbTileUrl} bounds={rectangleBounds} />
            )}
            {selectedPoints && selectedPoints.length > 0 && selectedPoints.map((point, index) => (
                <IndexedMarker
                    key={point.id}
                    position={[point.lat, point.lon]}
                    color={getColorForIndex(index)}
                    index={index}
                />
            ))}
            {selectedPoint && selectedPoint.lat !== null && selectedPoint.lon !== null && (
                compareMode === "months" && analysisMode === "point" ? (
                    <IndexedMarker 
                        position={[selectedPoint.lat, selectedPoint.lon]}
                        color={getColorForIndex(0)}
                        index={0}
                    />
                ) : !selectedPoints?.length ? (
                    <StaticMarker 
                        position={[selectedPoint.lat, selectedPoint.lon]}
                    />
                ) : null
            )}
            {analysisMode === "area" && (compareMode === "areas" || compareMode === "months") && selectedAreas && selectedAreas.length > 0 && selectedAreas.map((area, index) => {
                const center = getAreaCenter(area)
                if (!center) return null
                return (
                    <IndexedMarker
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
            {focusPointIndex !== null && focusPointIndex >= 0 && focusPointIndex < selectedPoints.length && (
                <PanToLocation position={[selectedPoints[focusPointIndex].lat, selectedPoints[focusPointIndex].lon]} />
            )}
            {focusAreaIndex !== null && focusAreaIndex >= 0 && focusAreaIndex < selectedAreas.length && (() => {
                const area = selectedAreas[focusAreaIndex]
                const center = getAreaCenter(area)
                return center ? <PanToLocation position={[center.lat, center.lon]} /> : null
            })()}
            {goToXYPosition && <GoToXYHandler position={goToXYPosition} onComplete={onGoToXYComplete} />}
        </MapContainer>
    )
}