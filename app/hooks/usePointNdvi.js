import { useState, useEffect, useRef } from "react"

export default function usePointNdvi(point, fetchPointNdvi, rectangleBounds, selectedYear, selectedMonth, cloudTolerance, isImageAvailable) {
    const [ndvi, setNdvi] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const fetchingRef = useRef(false)
    const previousPointRef = useRef(null)
    const previousFiltersRef = useRef({ cloudTolerance: null, selectedYear: null, selectedMonth: null })

    useEffect(() => {
        if (!point || point.lat === null || point.lon === null) {
            setNdvi(null)
            setIsLoading(false)
            previousPointRef.current = null
            fetchingRef.current = false
            previousFiltersRef.current = { cloudTolerance: null, selectedYear: null, selectedMonth: null }
            return
        }

        const currentPointKey = `${point.lat},${point.lon}`
        const previousPointKey = previousPointRef.current 
            ? `${previousPointRef.current.lat},${previousPointRef.current.lon}`
            : null

        const filtersChanged = 
            previousFiltersRef.current.cloudTolerance !== cloudTolerance ||
            previousFiltersRef.current.selectedYear !== selectedYear ||
            previousFiltersRef.current.selectedMonth !== selectedMonth

        const pointChanged = currentPointKey !== previousPointKey

        if (!pointChanged && !filtersChanged) {
            return
        }

        if (!rectangleBounds || !selectedYear || !selectedMonth || !isImageAvailable()) {
            setNdvi(null)
            setIsLoading(false)
            if (pointChanged) {
                previousPointRef.current = { lat: point.lat, lon: point.lon }
            }
            previousFiltersRef.current = { cloudTolerance, selectedYear, selectedMonth }
            return
        }

        if (fetchingRef.current) {
            return
        }

        fetchingRef.current = true
        setIsLoading(true)
        if (pointChanged) {
            setNdvi(null)
            previousPointRef.current = { lat: point.lat, lon: point.lon }
        }
        previousFiltersRef.current = { cloudTolerance, selectedYear, selectedMonth }

        fetchPointNdvi(point.lat, point.lon).then(result => {
            setNdvi(result)
            setIsLoading(false)
            fetchingRef.current = false
        }).catch(() => {
            setNdvi(null)
            setIsLoading(false)
            fetchingRef.current = false
        })
    }, [point?.lat, point?.lon, rectangleBounds, selectedYear, selectedMonth, cloudTolerance, isImageAvailable, fetchPointNdvi])

    return { ndvi, isLoading }
}

