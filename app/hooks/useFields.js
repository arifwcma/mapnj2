import { useState, useRef, useCallback, useEffect } from "react"
import { bboxToString } from "@/app/lib/bboxUtils"
import { FIELD_SELECTION_MIN_ZOOM, DEBOUNCE_DELAYS } from "@/app/lib/config"

export default function useFields() {
    const [fieldsData, setFieldsData] = useState(null)
    const [fieldsLoading, setFieldsLoading] = useState(false)
    const fieldsDebounceTimeoutRef = useRef(null)
    const previousFieldsBoundsRef = useRef(null)
    const previousFieldsZoomRef = useRef(null)
    
    const loadFieldsForBounds = useCallback((bounds, zoom) => {
        if (zoom < FIELD_SELECTION_MIN_ZOOM) {
            setFieldsData(null)
            setFieldsLoading(false)
            return
        }
        
        previousFieldsBoundsRef.current = bounds
        previousFieldsZoomRef.current = zoom
        
        if (fieldsDebounceTimeoutRef.current) {
            clearTimeout(fieldsDebounceTimeoutRef.current)
        }
        
        fieldsDebounceTimeoutRef.current = setTimeout(() => {
            const bboxStr = bboxToString(bounds)
            setFieldsLoading(true)
            
            fetch(`/api/fields/geojson?bbox=${bboxStr}&zoom=${zoom}`)
                .then(async response => {
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
                        throw new Error(errorData.error || errorData.details || "Failed to fetch fields data")
                    }
                    return response.json()
                })
                .then(data => {
                    setFieldsData((prevData) => {
                        if (!prevData || !prevData.features || prevData.features.length === 0) {
                            return data
                        }
                        
                        const existingFeatureIds = new Set()
                        prevData.features.forEach((f) => {
                            if (f.id) {
                                existingFeatureIds.add(f.id)
                            } else if (f.properties && f.properties.id) {
                                existingFeatureIds.add(f.properties.id)
                            } else {
                                const geomStr = JSON.stringify(f.geometry)
                                existingFeatureIds.add(geomStr)
                            }
                        })
                        
                        const newFeatures = data.features.filter((f) => {
                            if (f.id && existingFeatureIds.has(f.id)) return false
                            if (f.properties && f.properties.id && existingFeatureIds.has(f.properties.id)) return false
                            const geomStr = JSON.stringify(f.geometry)
                            if (existingFeatureIds.has(geomStr)) return false
                            return true
                        })
                        
                        const mergedFeatures = [...prevData.features, ...newFeatures]
                        
                        return {
                            ...prevData,
                            features: mergedFeatures
                        }
                    })
                })
                .catch(err => {
                    console.error("Error loading fields:", err.message || err)
                    setFieldsData(null)
                })
                .finally(() => {
                    setFieldsLoading(false)
                })
        }, DEBOUNCE_DELAYS.FIELD_LOADING)
    }, [])
    
    useEffect(() => {
        return () => {
            if (fieldsDebounceTimeoutRef.current) {
                clearTimeout(fieldsDebounceTimeoutRef.current)
            }
        }
    }, [])
    
    return {
        fieldsData,
        fieldsLoading,
        loadFieldsForBounds
    }
}

