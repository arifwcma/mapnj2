import { useCallback } from "react"
import { bboxToString } from "@/app/lib/bboxUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { getCurrentMonth } from "@/app/lib/monthUtils"
import { DEFAULT_INDEX } from "@/app/lib/indexConfig"

export default function useAreaNdvi(selectedYear, selectedMonth, cloudTolerance, setSelectedAreas, selectedIndex = DEFAULT_INDEX) {
    const loadAreaNdvi = useCallback(async (area) => {
        console.log("[useAreaNdvi] ===== loadAreaNdvi CALLED =====")
        console.log("[useAreaNdvi] area.id:", area?.id)
        console.log("[useAreaNdvi] Closure values - selectedYear:", selectedYear, "selectedMonth:", selectedMonth, "selectedIndex:", selectedIndex, "cloudTolerance:", cloudTolerance)
        
        const current = getCurrentMonth()
        const year = selectedYear || current.year
        const month = selectedMonth || current.month
        
        console.log("[useAreaNdvi] Using year:", year, "month:", month, "(fallback:", !selectedYear || !selectedMonth, ")")
        
        if (!area || !area.bounds) {
            console.log("[useAreaNdvi] SKIPPING - no area or bounds")
            return
        }
        
        try {
            const bboxStr = bboxToString(area.bounds)
            const dateRange = getMonthDateRange(year, month)
            
            console.log("[useAreaNdvi] Fetching tile - dateRange:", dateRange, "index:", selectedIndex, "cloud:", cloudTolerance)
            
            let tileResponse
            let apiUrl = ""
            if (area.geometry) {
                const requestBody = {
                    start: dateRange.start,
                    end: dateRange.end,
                    bbox: bboxStr,
                    cloud: cloudTolerance.toString(),
                    geometry: area.geometry,
                    index: selectedIndex
                }
                apiUrl = `POST /api/index/average`
                console.log("[useAreaNdvi] ===== API CALL =====")
                console.log("[useAreaNdvi] Method: POST")
                console.log("[useAreaNdvi] URL: /api/index/average")
                console.log("[useAreaNdvi] Body:", JSON.stringify(requestBody, null, 2))
                tileResponse = await fetch(`/api/index/average`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(requestBody)
                })
            } else {
                apiUrl = `/api/index/average?start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloudTolerance}&index=${selectedIndex}`
                console.log("[useAreaNdvi] ===== API CALL =====")
                console.log("[useAreaNdvi] Method: GET")
                console.log("[useAreaNdvi] Full URL:", apiUrl)
                tileResponse = await fetch(apiUrl)
            }
            
            console.log("[useAreaNdvi] Response status:", tileResponse.status, "ok:", tileResponse.ok)
            
            if (!tileResponse.ok) {
                const errorData = await tileResponse.json().catch(() => ({ error: `HTTP ${tileResponse.status}` }))
                const errorMessage = errorData.error || `HTTP ${tileResponse.status}`
                const isNoDataError = errorMessage.includes("No images found")
                
                console.log("[useAreaNdvi] ERROR response - isNoDataError:", isNoDataError, "message:", errorMessage)
                
                if (!isNoDataError) {
                    console.error("[useAreaNdvi] Failed to load index for area:", area.id, errorMessage)
                }
                
                setSelectedAreas(prev => {
                    const updated = prev.map(a => 
                        a.id === area.id 
                            ? { ...a, indexTileUrl: null }
                            : a
                    )
                    console.log("[useAreaNdvi] Set tileUrl to NULL for area:", area.id)
                    return updated
                })
                return
            }
            
            const tileData = await tileResponse.json()
            const tileUrl = tileData.tileUrl || null
            
            console.log("[useAreaNdvi] SUCCESS - tileUrl:", tileUrl ? "SET" : "NULL", "for area:", area.id)
            
            setSelectedAreas(prev => {
                const updated = prev.map(a => 
                    a.id === area.id 
                        ? { ...a, indexTileUrl: tileUrl }
                        : a
                )
                console.log("[useAreaNdvi] Updated area:", area.id, "with tileUrl:", tileUrl ? "SET" : "NULL")
                return updated
            })
        } catch (err) {
            console.error("[useAreaNdvi] EXCEPTION loading index for area:", area.id, err)
        }
    }, [selectedYear, selectedMonth, cloudTolerance, setSelectedAreas, selectedIndex])
    
    return { loadAreaNdvi }
}
