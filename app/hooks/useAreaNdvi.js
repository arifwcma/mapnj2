import { useCallback } from "react"
import { bboxToString } from "@/app/lib/bboxUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { getCurrentMonth } from "@/app/lib/monthUtils"
import { DEFAULT_INDEX } from "@/app/lib/indexConfig"

export default function useAreaNdvi(selectedYear, selectedMonth, cloudTolerance, setSelectedAreas, selectedIndex = DEFAULT_INDEX) {
    const loadAreaNdvi = useCallback(async (area) => {
        const current = getCurrentMonth()
        const year = selectedYear || current.year
        const month = selectedMonth || current.month
        
        if (!area || !area.bounds) {
            return
        }
        
        try {
            const bboxStr = bboxToString(area.bounds)
            const dateRange = getMonthDateRange(year, month)
            
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
                    console.error("Failed to load index for area:", area.id, errorMessage)
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
            
            if (tileUrl) {
                console.log("OVERLAY SUCCESS - area.id:", area.id, "index:", selectedIndex, "year:", year, "month:", month)
            }
            
            setSelectedAreas(prev => prev.map(a => 
                a.id === area.id 
                    ? { ...a, indexTileUrl: tileUrl }
                    : a
            ))
        } catch (err) {
            console.error("Error loading index for area:", area.id, err)
        }
    }, [selectedYear, selectedMonth, cloudTolerance, setSelectedAreas, selectedIndex])
    
    return { loadAreaNdvi }
}
