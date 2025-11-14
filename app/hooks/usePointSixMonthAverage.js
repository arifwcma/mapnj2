import { useState, useCallback, useEffect, useRef } from "react"
import { bboxToString } from "@/app/lib/bboxUtils"
import { getSixMonthsBackFrom } from "@/app/lib/monthUtils"
import { monthKey } from "@/app/lib/dateUtils"

export default function usePointSixMonthAverage(point, selectedYear, selectedMonth, rectangleBounds, cloudTolerance) {
    const [averageNdvi, setAverageNdvi] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const fetchingRef = useRef(false)
    
    const fetchAverage = useCallback(async () => {
        if (!point || point.lat === null || point.lon === null || !selectedYear || !selectedMonth || !rectangleBounds) {
            setAverageNdvi(null)
            return
        }
        
        if (fetchingRef.current) {
            return
        }
        
        fetchingRef.current = true
        setIsLoading(true)
        
        try {
            const months = getSixMonthsBackFrom(selectedYear, selectedMonth)
            const bboxStr = bboxToString(rectangleBounds)
            
            const promises = months.map(({ year, month }) => {
                const params = new URLSearchParams({
                    lat: point.lat.toString(),
                    lon: point.lon.toString(),
                    year: year.toString(),
                    month: month.toString(),
                    bbox: bboxStr,
                    cloud: cloudTolerance.toString()
                })
                
                return fetch(`/api/ndvi/point/month?${params.toString()}`)
                    .then(res => res.ok ? res.json() : { ndvi: null })
                    .then(data => data.ndvi)
                    .catch(() => null)
            })
            
            const results = await Promise.all(promises)
            const validResults = results.filter(v => v !== null && v !== undefined)
            
            if (validResults.length === 0) {
                setAverageNdvi(null)
            } else {
                const sum = validResults.reduce((acc, val) => acc + val, 0)
                const avg = sum / validResults.length
                setAverageNdvi(parseFloat(avg.toFixed(2)))
            }
        } catch (error) {
            console.error("Error fetching 6-month average:", error)
            setAverageNdvi(null)
        } finally {
            setIsLoading(false)
            fetchingRef.current = false
        }
    }, [point, selectedYear, selectedMonth, rectangleBounds, cloudTolerance])
    
    useEffect(() => {
        fetchAverage()
    }, [fetchAverage])
    
    return { averageNdvi, isLoading }
}

