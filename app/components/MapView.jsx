"use client"
import dynamic from "next/dynamic"
import { useEffect } from "react"
import { useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import BoundaryLayer from "./BoundaryLayer"
import RectangleDrawHandler from "./RectangleDrawHandler"
import useBoundary from "@/app/hooks/useBoundary"
import { MAP_CENTER, MAP_ZOOM, MAP_STYLE, TILE_LAYER_URL, RECTANGLE_STYLE } from "@/app/lib/mapConfig"

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

export default function MapView({ isDrawing, rectangleBounds, currentBounds, onStart, onUpdate, onEnd, onReset }) {
    const { boundary, loading, error } = useBoundary()

    if (error) {
        return <div>Error loading boundary: {error.message}</div>
    }

    return (
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={MAP_STYLE}>
            <TileLayer url={TILE_LAYER_URL} />
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
                    <Rectangle bounds={rectangleBounds} pathOptions={RECTANGLE_STYLE} />
                    <ZoomToRectangle bounds={rectangleBounds} />
                </>
            )}
        </MapContainer>
    )
}