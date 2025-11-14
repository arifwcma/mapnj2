"use client"
import dynamic from "next/dynamic"
import { useEffect, useState, useRef } from "react"
import { useMap } from "react-leaflet"
import { FIELD_SELECTION_MIN_ZOOM } from "@/app/lib/config"

const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false })

const FIELDS_STYLE = {
    color: "blue",
    weight: 3,
    fillOpacity: 0,
    opacity: 1
}

const FIELDS_STYLE_HOVER = {
    color: "red",
    weight: 5,
    fillOpacity: 0,
    opacity: 1
}

function calculateBounds(feature) {
    if (!feature || !feature.geometry) {
        return null
    }

    const coords = feature.geometry.coordinates

    const extractCoords = (geometry) => {
        if (geometry.type === "Point") {
            return [[geometry.coordinates[1], geometry.coordinates[0]]]
        } else if (geometry.type === "LineString" || geometry.type === "MultiPoint") {
            return geometry.coordinates.map(c => [c[1], c[0]])
        } else if (geometry.type === "Polygon" || geometry.type === "MultiLineString") {
            return geometry.coordinates.flat().map(c => [c[1], c[0]])
        } else if (geometry.type === "MultiPolygon") {
            return geometry.coordinates.flat(2).map(c => [c[1], c[0]])
        }
        return []
    }

    const allCoords = extractCoords(feature.geometry)

    if (allCoords.length === 0) {
        return null
    }

    let minLat = allCoords[0][0]
    let maxLat = allCoords[0][0]
    let minLng = allCoords[0][1]
    let maxLng = allCoords[0][1]

    allCoords.forEach(([lat, lng]) => {
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
    })

    return [[minLat, minLng], [maxLat, maxLng]]
}

export default function FieldsLayer({ 
    fieldSelectionMode, 
    fieldsData, 
    fieldsLoading, 
    boundsSource,
    onFieldClick,
    currentZoom
}) {
    const map = useMap()
    const layerRef = useRef(null)

    const zoomSufficient = currentZoom !== null && currentZoom !== undefined && currentZoom >= FIELD_SELECTION_MIN_ZOOM
    const shouldShow = fieldSelectionMode && zoomSufficient

    useEffect(() => {
        if (layerRef.current && shouldShow && fieldsData) {
            const layer = layerRef.current.leafletElement || layerRef.current
            if (layer) {
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
    }, [shouldShow, fieldsData])

    if (!shouldShow || !fieldsData) {
        return null
    }

    const onEachFeature = (feature, layer) => {
        if (!fieldSelectionMode) {
            return
        }

        layer.on({
            mouseover: (e) => {
                const layer = e.target
                layer.setStyle(FIELDS_STYLE_HOVER)
                if (typeof layer.bringToFront === 'function') {
                    layer.bringToFront()
                }
            },
            mouseout: (e) => {
                const layer = e.target
                layer.setStyle(FIELDS_STYLE)
            },
            click: (e) => {
                e.originalEvent.stopPropagation()
                const bounds = calculateBounds(feature)
                if (bounds && onFieldClick) {
                    onFieldClick(bounds, feature)
                }
            }
        })
    }

    return (
        <GeoJSON 
            ref={layerRef} 
            data={fieldsData} 
            style={FIELDS_STYLE}
            onEachFeature={onEachFeature}
        />
    )
}
