import { useCallback } from "react"
import { bboxToString } from "@/app/lib/bboxUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"

export default function useAreaNdvi(selectedYear, selectedMonth, cloudTolerance, setSelectedAreas) {
    const loadAreaNdvi = useCallback(async (area) => {
        if (!selectedYear || !selectedMonth || !area.bounds) {
            return
        }
        
        try {
            const bboxStr = bboxToString(area.bounds)
            const dateRange = getMonthDateRange(selectedYear, selectedMonth)
            
            let tileResponse
            if (area.geometry) {
                const requestBody = {
                    start: dateRange.start,
                    end: dateRange.end,
                    bbox: bboxStr,
                    cloud: cloudTolerance.toString(),
                    geometry: area.geometry
                }
                tileResponse = await fetch(`/api/ndvi/average`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(requestBody)
                })
            } else {
                tileResponse = await fetch(`/api/ndvi/average?start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloudTolerance}`)
            }
            
            if (!tileResponse.ok) {
                const errorData = await tileResponse.json().catch(() => ({ error: `HTTP ${tileResponse.status}` }))
                const errorMessage = errorData.error || `HTTP ${tileResponse.status}`
                const isNoDataError = errorMessage.includes("No images found")
                
                if (!isNoDataError) {
                    console.error("Failed to load NDVI for area:", area.id, errorMessage)
                }
                
                setSelectedAreas(prev => prev.map(a => 
                    a.id === area.id 
                        ? { ...a, ndviTileUrl: null }
                        : a
                ))
                return
            }
            
            const tileData = await tileResponse.json()
            const tileUrl = tileData.tileUrl || null
            
            setSelectedAreas(prev => prev.map(a => 
                a.id === area.id 
                    ? { ...a, ndviTileUrl: tileUrl }
                    : a
            ))
        } catch (err) {
            console.error("Error loading NDVI for area:", area.id, err)
        }
    }, [selectedYear, selectedMonth, cloudTolerance, setSelectedAreas])
    
    return { loadAreaNdvi }
}

