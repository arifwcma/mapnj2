import { useState, useRef, useCallback, useEffect } from "react"
import { bboxToString } from "@/app/lib/bboxUtils"
import { monthKey, parseMonthKey } from "@/app/lib/dateUtils"

export default function useAreaDataMap(area, rectangleBounds, cloudTolerance, areaId = "", requestTracker = null) {
    const [dataMap, setDataMap] = useState(new Map())
    const dataMapRef = useRef(new Map())
    const fetchingMonthsRef = useRef(new Set())
    const previousAreaRef = useRef(null)
    const previousCloudToleranceRef = useRef(cloudTolerance)

    const fetchSingleMonth = useCallback(async (year, month, areaGeometry, areaId = "") => {
        if (!rectangleBounds) {
            return null
        }
        
        if (!areaGeometry && !area.bounds) {
            return null
        }
        
        const geometryToUse = areaGeometry || (area.bounds ? {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [area.bounds[0][1], area.bounds[0][0]],
                    [area.bounds[1][1], area.bounds[0][0]],
                    [area.bounds[1][1], area.bounds[1][0]],
                    [area.bounds[0][1], area.bounds[1][0]],
                    [area.bounds[0][1], area.bounds[0][0]]
                ]]
            }
        } : null)
        
        if (!geometryToUse) {
            return null
        }

        const bboxStr = bboxToString(rectangleBounds)
        const params = new URLSearchParams({
            geometry: JSON.stringify(geometryToUse),
            year: year.toString(),
            month: month.toString(),
            bbox: bboxStr,
            cloud: cloudTolerance.toString()
        })

        try {
            const url = `/api/ndvi/area/month?${params.toString()}`
            console.log(`[HOOK] useAreaDataMap - Calling: ${url}`)
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error("Failed to fetch month data")
            }

            const data = await response.json()
            return data
        } catch (error) {
            console.error(`Error fetching area NDVI for ${year}-${month}:`, error)
            return { year, month, ndvi: null }
        }
    }, [rectangleBounds, cloudTolerance])

    const reset = useCallback(() => {
        const emptyMap = new Map()
        setDataMap(emptyMap)
        dataMapRef.current = emptyMap
        fetchingMonthsRef.current.clear()
        previousAreaRef.current = null
        previousCloudToleranceRef.current = cloudTolerance
    }, [cloudTolerance])

    useEffect(() => {
        dataMapRef.current = dataMap
    }, [dataMap])

    useEffect(() => {
        if (!area || (!area.geometry && !area.bounds)) {
            if (previousAreaRef.current !== null) {
                reset()
            }
            return
        }

        const currentAreaKey = area.id || JSON.stringify(area.geometry || area.bounds)
        const previousAreaKey = previousAreaRef.current 
            ? (previousAreaRef.current.id || JSON.stringify(previousAreaRef.current.geometry || previousAreaRef.current.bounds))
            : null

        if (currentAreaKey !== previousAreaKey) {
            reset()
            previousAreaRef.current = area
        }

        if (previousCloudToleranceRef.current !== cloudTolerance) {
            reset()
            previousCloudToleranceRef.current = cloudTolerance
        }
    }, [area?.id, area?.geometry, area?.bounds, cloudTolerance, reset])

    const fetchMissingMonths = useCallback(async (monthKeys) => {
        if (!area || (!area.geometry && !area.bounds) || !rectangleBounds) {
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
            const requestKey = `${areaId}-${key}`
            
            if (requestTracker) {
                console.log('Registering request:', requestKey)
                requestTracker.registerRequest(requestKey)
            }
            
            try {
                const result = await fetchSingleMonth(m.year, m.month, area.geometry || null, areaId)
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
    }, [area, rectangleBounds, fetchSingleMonth, requestTracker, areaId])

    const isLoading = fetchingMonthsRef.current.size > 0

    return { dataMap, fetchMissingMonths, reset, isLoading }
}

