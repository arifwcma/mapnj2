"use client"
import dynamic from "next/dynamic"
import { useEffect } from "react"
import { useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import BoundaryLayer from "./BoundaryLayer"
import RectangleDrawHandler from "./RectangleDrawHandler"
import NdviOverlay from "./NdviOverlay"
import useBoundary from "@/app/hooks/useBoundary"
import { MAP_CENTER, MAP_ZOOM, MAP_STYLE, MAP_STYLE_WITH_PANEL, TILE_LAYER_STREET, TILE_LAYER_SATELLITE, RECTANGLE_STYLE, RECTANGLE_BORDER_STYLE } from "@/app/lib/mapConfig"

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })
const Rectangle = dynamic(() => import("react-leaflet").then(m => m.Rectangle), { ssr: false })

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
        if (!map || !isActive) return
        
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

export default function MapView({ isDrawing, rectangleBounds, currentBounds, onStart, onUpdate, onEnd, onReset, ndviTileUrl, basemap = "street", isPointAnalysisMode = false, onPointClick, showInfoPanel = false }) {
    const { boundary, loading, error } = useBoundary()
    const tileUrl = basemap === "satellite" ? TILE_LAYER_SATELLITE : TILE_LAYER_STREET
    const attribution = basemap === "satellite" 
        ? '&copy; <a href="https://www.esri.com/">Esri</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    const mapStyle = showInfoPanel ? MAP_STYLE_WITH_PANEL : MAP_STYLE

    if (error) {
        return <div>Error loading boundary: {error.message}</div>
    }

    return (
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={mapStyle}>
            <TileLayer key={basemap} url={tileUrl} attribution={attribution} />
            <PointClickHandler isActive={isPointAnalysisMode} onPointClick={onPointClick || (() => {})} />
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
            {ndviTileUrl && rectangleBounds && (
                <NdviOverlay tileUrl={ndviTileUrl} bounds={rectangleBounds} />
            )}
        </MapContainer>
    )
}