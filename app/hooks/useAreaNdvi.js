import { useCallback } from "react"
import { bboxToString } from "@/app/lib/bboxUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { getCurrentMonth } from "@/app/lib/monthUtils"
import { DEFAULT_INDEX } from "@/app/lib/indexConfig"

export default function useAreaNdvi(selectedYear, selectedMonth, cloudTolerance, setSelectedAreas, selectedIndex = DEFAULT_INDEX) {
    const loadAreaNdvi = useCallback(async (area) => {
        let year = selectedYear
        let month = selectedMonth
        
        if (!year || !month) {
            const current = getCurrentMonth()
            year = current.year
            month = current.month
            console.log("[useAreaNdvi] Year/month were null, defaulting to current:", year, month)
        }
        
        if (!area.bounds) {
            console.log("[useAreaNdvi] No area.bounds, skipping load for area:", area.id)
            return
        }
        
        console.log("[useAreaNdvi] Loading overlay for area:", area.id, "year:", year, "month:", month, "index:", selectedIndex)
        
        try {
            const bboxStr = bboxToString(area.bounds)
            const dateRange = getMonthDateRange(year, month)
            
            console.log("[useAreaNdvi] Fetching from API - dateRange:", dateRange, "bbox:", bboxStr.substring(0, 50))
            
            let tileResponse
            if (area.geometry) {
                const requestBody = {
                    start: dateRange.start,
                    end: dateRange.end,
                    bbox: bboxStr,
                    cloud: cloudTolerance.toString(),
                    geometry: area.geometry,
                    index: selectedIndex
                }
                tileResponse = await fetch(`/api/index/average`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(requestBody)
                })
            } else {
                tileResponse = await fetch(`/api/index/average?start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloudTolerance}&index=${selectedIndex}`)
            }
            
            if (!tileResponse.ok) {
                const errorData = await tileResponse.json().catch(() => ({ error: `HTTP ${tileResponse.status}` }))
                const errorMessage = errorData.error || `HTTP ${tileResponse.status}`
                const isNoDataError = errorMessage.includes("No images found")
                
                if (!isNoDataError) {
                    console.error("[useAreaNdvi] Failed to load index for area:", area.id, errorMessage)
                }
                
                setSelectedAreas(prev => prev.map(a => 
                    a.id === area.id 
                        ? { ...a, indexTileUrl: null }
                        : a
                ))
                return
            }
            
            const tileData = await tileResponse.json()
            const tileUrl = tileData.tileUrl || null
            
            console.log("[useAreaNdvi] API response for area:", area.id, "tileUrl:", tileUrl ? "SUCCESS" : "NULL")
            
            setSelectedAreas(prev => prev.map(a => 
                a.id === area.id 
                    ? { ...a, indexTileUrl: tileUrl }
                    : a
            ))
        } catch (err) {
            console.error("[useAreaNdvi] Error loading index for area:", area.id, err)
        }
    }, [selectedYear, selectedMonth, cloudTolerance, setSelectedAreas, selectedIndex])
    
    return { loadAreaNdvi }
}
