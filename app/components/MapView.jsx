"use client"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
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
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false })

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

function SecondPointMarker({ position, children }) {
    const [icon, setIcon] = useState(null)
    
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
    
    if (!icon || !position) return null
    
    return <Marker position={position} icon={icon}>{children}</Marker>
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

export default function MapView({ isDrawing, rectangleBounds, currentBounds, onStart, onUpdate, onEnd, onReset, ndviTileUrl, rgbTileUrl, overlayType, basemap = "street", isPointAnalysisMode = false, onPointClick, selectedPoint = null, secondPoint = null }) {
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
            {!isDrawing && <PointClickHandler isActive={isPointAnalysisMode} onPointClick={onPointClick || (() => {})} />}
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
                <Marker position={[selectedPoint.lat, selectedPoint.lon]}>
                    {selectedPoint.ndvi !== null && selectedPoint.ndvi !== undefined && (
                        <Popup>
                            NDVI: {selectedPoint.ndvi.toFixed(2)}
                        </Popup>
                    )}
                </Marker>
            )}
            {secondPoint && secondPoint.lat !== null && secondPoint.lon !== null && (
                <SecondPointMarker position={[secondPoint.lat, secondPoint.lon]}>
                    <Popup>
                        Second point: {secondPoint.lat.toFixed(6)}, {secondPoint.lon.toFixed(6)}
                    </Popup>
                </SecondPointMarker>
            )}
        </MapContainer>
    )
}