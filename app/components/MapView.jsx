"use client"
import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import "leaflet/dist/leaflet.css"

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false })

export default function MapView() {
    const [boundary, setBoundary] = useState(null)

    useEffect(() => {
        fetch("/data/boundary_4326.geojson")
            .then(res => res.json())
            .then(setBoundary)
    }, [])

    return (
        <MapContainer center={[40.0, -74.5]} zoom={10} style={{ height: "90vh", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {boundary && <GeoJSON data={boundary} style={{ color: "black", weight: 2, fillOpacity: 0 }} />}
        </MapContainer>
    )
}