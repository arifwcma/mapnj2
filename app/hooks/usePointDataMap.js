import { useState, useRef, useCallback, useEffect } from "react"
import { bboxToString } from "@/app/lib/bboxUtils"
import { monthKey, parseMonthKey } from "@/app/lib/dateUtils"

export default function usePointDataMap(point, rectangleBounds, cloudTolerance, pointType = "", requestTracker = null) {
    const [dataMap, setDataMap] = useState(new Map())
    const dataMapRef = useRef(new Map())
    const fetchingMonthsRef = useRef(new Set())
    const previousPointRef = useRef(null)
    const previousCloudToleranceRef = useRef(cloudTolerance)

    const fetchSingleMonth = useCallback(async (year, month, pointLat, pointLon, pointType = "") => {
        if (!rectangleBounds) {
            return null
        }

        const bboxStr = bboxToString(rectangleBounds)
        const params = new URLSearchParams({
            lat: pointLat.toString(),
            lon: pointLon.toString(),
            year: year.toString(),
            month: month.toString(),
            bbox: bboxStr,
            cloud: cloudTolerance.toString()
        })

        try {
            const response = await fetch(`/api/ndvi/point/month?${params.toString()}`)

            if (!response.ok) {
                throw new Error("Failed to fetch month data")
            }

            const data = await response.json()
            return data
        } catch (error) {
            console.error(`Error fetching NDVI for ${year}-${month}:`, error)
            return { year, month, ndvi: null }
        }
    }, [rectangleBounds, cloudTolerance])

    const reset = useCallback(() => {
        const emptyMap = new Map()
        setDataMap(emptyMap)
        dataMapRef.current = emptyMap
        fetchingMonthsRef.current.clear()
        previousPointRef.current = null
        previousCloudToleranceRef.current = cloudTolerance
    }, [cloudTolerance])

    useEffect(() => {
        dataMapRef.current = dataMap
    }, [dataMap])

    useEffect(() => {
        if (!point || point.lat === null || point.lon === null) {
            if (previousPointRef.current !== null) {
                reset()
            }
            return
        }

        const currentPointKey = `${point.lat},${point.lon}`
        const previousPointKey = previousPointRef.current 
            ? `${previousPointRef.current.lat},${previousPointRef.current.lon}`
            : null

        if (currentPointKey !== previousPointKey) {
            reset()
            previousPointRef.current = { lat: point.lat, lon: point.lon }
        }

        if (previousCloudToleranceRef.current !== cloudTolerance) {
            reset()
            previousCloudToleranceRef.current = cloudTolerance
        }
    }, [point?.lat, point?.lon, cloudTolerance, reset])

    const fetchMissingMonths = useCallback(async (monthKeys) => {
        if (!point || point.lat === null || point.lon === null || !rectangleBounds) {
            return
        }

        const monthsToFetch = monthKeys
            .filter(key => {
                if (fetchingMonthsRef.current.has(key)) {
                    return false
                }
                if (dataMapRef.current.has(key)) {
                    return false
                }
                return true
            })
            .map(key => parseMonthKey(key))

        if (monthsToFetch.length === 0) {
            return
        }

        monthsToFetch.forEach(m => {
            fetchingMonthsRef.current.add(monthKey(m.year, m.month))
        })

        const fetchPromises = monthsToFetch.map(async (m) => {
            const key = monthKey(m.year, m.month)
            const requestKey = `${pointType}-${key}`
            
            if (requestTracker) {
                console.log('Registering request:', requestKey)
                requestTracker.registerRequest(requestKey)
            }
            
            try {
                const result = await fetchSingleMonth(m.year, m.month, point.lat, point.lon, pointType)
                fetchingMonthsRef.current.delete(key)
                
                setDataMap(prev => {
                    const newMap = new Map(prev)
                    if (result) {
                        newMap.set(key, result.ndvi)
                    } else {
                        newMap.set(key, null)
                    }
                    dataMapRef.current = newMap
                    return newMap
                })
                
                return result
            } finally {
                if (requestTracker) {
                    console.log('Unregistering request:', requestKey)
                    requestTracker.unregisterRequest(requestKey)
                }
            }
        })

        await Promise.allSettled(fetchPromises)
    }, [point, rectangleBounds, fetchSingleMonth, requestTracker])

    const isLoading = fetchingMonthsRef.current.size > 0

    return { dataMap, fetchMissingMonths, reset, isLoading }
}

