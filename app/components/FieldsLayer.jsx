"use client"
import dynamic from "next/dynamic"
import { useEffect, useState, useRef } from "react"
import { useMap } from "react-leaflet"

const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false })

const FIELDS_STYLE = {
    color: "yellow",
    weight: 3,
    fillOpacity: 0,
    opacity: 1
}

export default function FieldsLayer({ showFields }) {
    console.log("FieldsLayer component rendered, showFields:", showFields)
    const map = useMap()
    const [geoJsonData, setGeoJsonData] = useState(null)
    const layerRef = useRef(null)

    useEffect(() => {
        if (!showFields) {
            setGeoJsonData(null)
            return
        }

        if (geoJsonData) {
            return
        }

        fetch("/api/fields/geojson")
            .then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
                    throw new Error(errorData.error || errorData.details || "Failed to fetch fields data")
                }
                return response.json()
            })
            .then(data => {
                console.log("Fields data loaded:", data)
                console.log("Number of features:", data.features?.length || 0)
                setGeoJsonData(data)
            })
            .catch(err => {
                console.error("Error loading fields:", err.message || err)
            })
    }, [showFields, geoJsonData])

    useEffect(() => {
        if (layerRef.current && showFields && geoJsonData) {
            const layer = layerRef.current.leafletElement || layerRef.current
            if (layer) {
                console.log("Bringing fields layer to front")
                if (typeof layer.bringToFront === 'function') {
                    layer.bringToFront()
                }
                if (typeof layer.eachLayer === 'function') {
                    layer.eachLayer((l) => {
                        if (typeof l.bringToFront === 'function') {
                            l.bringToFront()
                        }
                    })
                }
            }
        }
    }, [showFields, geoJsonData])

    useEffect(() => {
        console.log("FieldsLayer render state:", { showFields, hasData: !!geoJsonData, featuresCount: geoJsonData?.features?.length })
    }, [showFields, geoJsonData])

    if (!showFields || !geoJsonData) {
        return null
    }

    console.log("Rendering GeoJSON layer with", geoJsonData.features?.length || 0, "features")
    return <GeoJSON ref={layerRef} data={geoJsonData} style={FIELDS_STYLE} />
}

