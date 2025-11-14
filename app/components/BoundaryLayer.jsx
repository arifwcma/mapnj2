"use client"
import dynamic from "next/dynamic"
import { useEffect } from "react"
import { useMap } from "react-leaflet"
import { BOUNDARY_STYLE } from "@/app/lib/config"

const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false })

export default function BoundaryLayer({ data }) {
    const map = useMap()
    useEffect(() => {
        if (data) {
            const L = require("leaflet")
            const layer = new L.GeoJSON(data)
            map.fitBounds(layer.getBounds())
        }
    }, [data, map])
    return <GeoJSON data={data} style={BOUNDARY_STYLE} />
}

