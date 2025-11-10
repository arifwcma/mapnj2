"use client"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"
import BoundaryLayer from "./BoundaryLayer"
import useBoundary from "@/hooks/useBoundary"
import { MAP_CENTER, MAP_ZOOM, MAP_STYLE } from "@/lib/mapConfig"

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })

export default function MapView() {
    const boundary = useBoundary()

    return (
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={MAP_STYLE}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {boundary && <BoundaryLayer data={boundary} />}
        </MapContainer>
    )
}