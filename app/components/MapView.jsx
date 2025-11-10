"use client"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"
import BoundaryLayer from "./BoundaryLayer"
import useBoundary from "@/app/hooks/useBoundary"
import { MAP_CENTER, MAP_ZOOM, MAP_STYLE, TILE_LAYER_URL } from "@/app/lib/mapConfig"

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })

export default function MapView() {
    const { boundary, loading, error } = useBoundary()

    if (error) {
        return <div>Error loading boundary: {error.message}</div>
    }

    return (
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={MAP_STYLE}>
            <TileLayer url={TILE_LAYER_URL} />
            {boundary && <BoundaryLayer data={boundary} />}
        </MapContainer>
    )
}