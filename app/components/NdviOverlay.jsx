"use client"
import dynamic from "next/dynamic"

const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })

export default function NdviOverlay({ tileUrl, bounds }) {
    if (!tileUrl || !bounds) return null

    return <TileLayer url={tileUrl} opacity={0.7} />
}

