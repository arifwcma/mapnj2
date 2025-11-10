"use client"
import dynamic from "next/dynamic"
import { useEffect } from "react"

const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false })

export default function BoundaryLayer({ data }) {
    const { useMap } = require("react-leaflet")
    const map = useMap()
    useEffect(() => {
        if (data) {
            const L = require("leaflet")
            const layer = new L.GeoJSON(data)
            map.fitBounds(layer.getBounds())
        }
    }, [data, map])
    return <GeoJSON data={data} style={{ color: "black", weight: 2, fillOpacity: 0 }} />
}

