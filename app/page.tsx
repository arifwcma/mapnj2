"use client"
import { useState, useCallback, useRef, useEffect } from "react"
import MapView from "@/app/components/MapView"
import BasemapSelector from "@/app/components/BasemapSelector"
import AnalysisModeSelector from "@/app/components/AnalysisModeSelector"
import CompareModeSelector from "@/app/components/CompareModeSelector"
import AreaSelectionPrompt from "@/app/components/AreaSelectionPrompt"
import CloudToleranceSlider from "@/app/components/CloudToleranceSlider"
import PointsModePanel from "@/app/components/PointsModePanel"
import PointMonthsModePanel from "@/app/components/PointMonthsModePanel"
import AreasModePanel from "@/app/components/AreasModePanel"
import AreaMonthsModePanel from "@/app/components/AreaMonthsModePanel"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { getCurrentMonth } from "@/app/lib/monthUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"
import useRectangleDraw from "@/app/hooks/useRectangleDraw"
import useNdviData from "@/app/hooks/useNdviData"

export default function Page() {
    const [basemap, setBasemap] = useState("street")
    const [recentNdviTileUrl, setRecentNdviTileUrl] = useState<string | null>(null)
    const [recentNdviLoading, setRecentNdviLoading] = useState(false)
    const [recentNdviError, setRecentNdviError] = useState<string | null>(null)
    const [analysisMode, setAnalysisMode] = useState<"point" | "area">("point")
    const [compareMode, setCompareMode] = useState<"points" | "areas" | "months">("points")
    const [cloudTolerance, setCloudTolerance] = useState(DEFAULT_CLOUD_TOLERANCE)
    const [selectedPoints, setSelectedPoints] = useState<Array<{ id: string, lat: number, lon: number }>>([])
    const [selectedPoint, setSelectedPoint] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null })
    const [selectedAreas, setSelectedAreas] = useState<Array<{ id: string, geometry: any, bounds: [[number, number], [number, number]], color: string, label: string, boundsSource: 'rectangle' | 'field', ndviTileUrl?: string | null, rgbTileUrl?: string | null }>>([])
    const [fieldSelectionMode, setFieldSelectionMode] = useState(false)
    const [fieldsData, setFieldsData] = useState<any>(null)
    const [boundsSource, setBoundsSource] = useState<'rectangle' | 'field' | null>(null)
    const [selectedFieldFeature, setSelectedFieldFeature] = useState<any>(null)
    const [currentZoom, setCurrentZoom] = useState<number | null>(null)
    const [selectedYear, setSelectedYear] = useState<number | null>(null)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
    const [mapBounds, setMapBounds] = useState<[[number, number], [number, number]] | null>(null)
    
    useEffect(() => {
        if (!selectedYear || !selectedMonth) {
            const current = getCurrentMonth()
            setSelectedYear(current.year)
            setSelectedMonth(current.month)
        }
    }, [selectedYear, selectedMonth])
    
    const {
        isDrawing,
        rectangleBounds,
        currentBounds,
        resetRectangle,
        setStart,
        updateBounds,
        finalizeRectangle,
        startDrawing,
        stopDrawing,
        setBounds
    } = useRectangleDraw()
    
    const {
        ndviTileUrl,
        rgbTileUrl,
        overlayType,
        loadNdviData,
        updateCloudTolerance,
        clearNdvi,
        setOverlayType,
        isImageAvailable,
        loadOverlayTileOnly
    } = useNdviData()
    
    const loadAreaNdvi = useCallback(async (area: { id: string, geometry: any, bounds: [[number, number], [number, number]], color: string, label: string, boundsSource: 'rectangle' | 'field', ndviTileUrl?: string | null, rgbTileUrl?: string | null }) => {
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
                
                if (isNoDataError) {
                    console.log("No images found for area:", area.id, "- No overlay will be displayed")
                } else {
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
    }, [selectedYear, selectedMonth, cloudTolerance])
    
    const cloudToleranceRef = useRef(cloudTolerance)
    const sliderDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    
    useEffect(() => {
        cloudToleranceRef.current = cloudTolerance
    }, [cloudTolerance])
    
    const handleAnalysisModeChange = useCallback((mode: "point" | "area") => {
        setAnalysisMode(mode)
        resetRectangle()
        clearNdvi()
        setSelectedPoints([])
        setSelectedPoint({ lat: null, lon: null })
        setSelectedAreas([])
        setFieldSelectionMode(false)
        setBoundsSource(null)
        setSelectedFieldFeature(null)
        setSelectedYear(null)
        setSelectedMonth(null)
        setCompareMode(mode === "point" ? "points" : "areas")
    }, [resetRectangle, clearNdvi])
    
    const handleCompareModeChange = useCallback((mode: "points" | "areas" | "months") => {
        setCompareMode(mode)
        resetRectangle()
        clearNdvi()
        setSelectedPoints([])
        setSelectedPoint({ lat: null, lon: null })
        setSelectedAreas([])
        setFieldSelectionMode(false)
        setBoundsSource(null)
        setSelectedFieldFeature(null)
        setSelectedYear(null)
        setSelectedMonth(null)
    }, [resetRectangle, clearNdvi])
    
    const handleCloudChange = (newValue: number) => {
        cloudToleranceRef.current = newValue
        setCloudTolerance(newValue)
        
        if (sliderDebounceTimeoutRef.current) {
            clearTimeout(sliderDebounceTimeoutRef.current)
        }
        
        sliderDebounceTimeoutRef.current = setTimeout(() => {
            updateCloudTolerance(newValue)
        }, 1000)
    }
    
    const loadRecentNdvi = useCallback(async (bbox: [[number, number], [number, number]]) => {
        if (!bbox) return
        
        setRecentNdviLoading(true)
        setRecentNdviError(null)
        
        try {
            const bboxStr = `${bbox[0][1]},${bbox[0][0]},${bbox[1][1]},${bbox[1][0]}`
            const response = await fetch(`/api/ndvi/recent?bbox=${bboxStr}`)
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
                throw new Error(errorData.error || `Failed to load recent NDVI`)
            }
            
            const data = await response.json()
            setRecentNdviTileUrl(data.tileUrl)
        } catch (err: any) {
            console.error("Error loading recent NDVI:", err)
            setRecentNdviError(err.message || "Failed to load recent NDVI")
            setRecentNdviTileUrl(null)
        } finally {
            setRecentNdviLoading(false)
        }
    }, [])
    
    const handleBasemapChange = useCallback((newBasemap: string) => {
        setBasemap(newBasemap)
        
        if (newBasemap === "ndvi-recent") {
            if (mapBounds) {
                loadRecentNdvi(mapBounds)
            } else {
                setRecentNdviError("Map bounds not available")
            }
        } else {
            setRecentNdviTileUrl(null)
            setRecentNdviError(null)
        }
    }, [mapBounds, loadRecentNdvi])
    
    useEffect(() => {
        if (basemap === "ndvi-recent" && mapBounds && !recentNdviTileUrl && !recentNdviLoading && !recentNdviError) {
            loadRecentNdvi(mapBounds)
        }
    }, [basemap, mapBounds, recentNdviTileUrl, recentNdviLoading, recentNdviError, loadRecentNdvi])
    
    const handlePointClick = useCallback((lat: number, lon: number) => {
        if (analysisMode === "point" && compareMode === "points") {
            const newPoint = {
                id: `point_${Date.now()}_${Math.random()}`,
                lat,
                lon
            }
            setSelectedPoints(prev => [...prev, newPoint])
        } else if (analysisMode === "point" && compareMode === "months") {
            setSelectedPoint({ lat, lon })
        }
    }, [analysisMode, compareMode])
    
    const handleRemovePoint = useCallback((index: number) => {
        setSelectedPoints(prev => prev.filter((_, i) => i !== index))
    }, [])
    
    const handleMonthChange = useCallback((year: number, month: number) => {
        setSelectedYear(year)
        setSelectedMonth(month)
    }, [])
    
    const handleStartFieldSelection = useCallback(() => {
        if (isDrawing) {
            stopDrawing()
            resetRectangle()
            setBoundsSource(null)
        }
        setFieldSelectionMode(true)
        if (fieldsData) {
            return
        }
        fetch("/api/fields/geojson")
            .then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
                    throw new Error(errorData.error || errorData.details || "Failed to fetch fields data")
                }
                return response.json()
            })
            .then(data => {
                setFieldsData(data)
            })
            .catch(err => {
                console.error("Error loading fields:", err.message || err)
                setFieldSelectionMode(false)
            })
    }, [fieldsData, isDrawing, stopDrawing, resetRectangle])
    
    const handleCancelFieldSelection = useCallback(() => {
        setFieldSelectionMode(false)
    }, [])
    
    const handleCancelSelection = useCallback(() => {
        setFieldSelectionMode(false)
        stopDrawing()
        resetRectangle()
        setSelectedFieldFeature(null)
        setBoundsSource(null)
    }, [stopDrawing, resetRectangle])
    
    const handleFieldClick = useCallback((bounds: [[number, number], [number, number]], feature: any) => {
        if (analysisMode === "area" && compareMode === "areas") {
            const newArea = {
                id: `area_${Date.now()}_${Math.random()}`,
                geometry: feature,
                bounds: bounds,
                color: getColorForIndex(selectedAreas.length),
                label: `Area ${selectedAreas.length + 1}`,
                boundsSource: 'field' as const,
                ndviTileUrl: null,
                rgbTileUrl: null
            }
            setSelectedAreas(prev => [...prev, newArea])
            setBounds(bounds)
            setBoundsSource('field')
            setSelectedFieldFeature(feature)
            setFieldSelectionMode(false)
            if (selectedYear && selectedMonth) {
                loadAreaNdvi(newArea)
            }
        } else if (analysisMode === "area" && compareMode === "months") {
            const newArea = {
                id: `area_${Date.now()}_${Math.random()}`,
                geometry: feature,
                bounds: bounds,
                color: getColorForIndex(0),
                label: `Area 1`,
                boundsSource: 'field' as const,
                ndviTileUrl: null,
                rgbTileUrl: null
            }
            setSelectedAreas([newArea])
            setBounds(bounds)
            setBoundsSource('field')
            setSelectedFieldFeature(feature)
            setFieldSelectionMode(false)
        }
    }, [analysisMode, compareMode, selectedAreas.length, setBounds, selectedYear, selectedMonth, loadAreaNdvi])
    
    const handleStartDrawing = useCallback(() => {
        if (fieldSelectionMode) {
            setFieldSelectionMode(false)
            setSelectedFieldFeature(null)
            setBoundsSource(null)
        }
        startDrawing()
        setBoundsSource('rectangle')
    }, [startDrawing, fieldSelectionMode])
    
    const handleFinalize = useCallback(() => {
        if (analysisMode === "area" && compareMode === "areas" && currentBounds) {
            const newArea = {
                id: `area_${Date.now()}_${Math.random()}`,
                geometry: null,
                bounds: currentBounds,
                color: getColorForIndex(selectedAreas.length),
                label: `Area ${selectedAreas.length + 1}`,
                boundsSource: 'rectangle' as const,
                ndviTileUrl: null,
                rgbTileUrl: null
            }
            setSelectedAreas(prev => [...prev, newArea])
            if (selectedYear && selectedMonth) {
                loadAreaNdvi(newArea)
            }
        } else if (analysisMode === "area" && compareMode === "months" && currentBounds) {
            const newArea = {
                id: `area_${Date.now()}_${Math.random()}`,
                geometry: null,
                bounds: currentBounds,
                color: getColorForIndex(0),
                label: `Area 1`,
                boundsSource: 'rectangle' as const,
                ndviTileUrl: null,
                rgbTileUrl: null
            }
            setSelectedAreas([newArea])
        }
        finalizeRectangle()
        setBoundsSource('rectangle')
        setSelectedFieldFeature(null)
    }, [finalizeRectangle, analysisMode, compareMode, currentBounds, selectedAreas.length, selectedYear, selectedMonth, loadAreaNdvi])
    
    const handleReset = useCallback(() => {
        resetRectangle()
        clearNdvi()
        setSelectedPoints([])
        setSelectedPoint({ lat: null, lon: null })
        setSelectedAreas([])
        setFieldSelectionMode(false)
        setBoundsSource(null)
        setSelectedFieldFeature(null)
    }, [resetRectangle, clearNdvi])
    
    const handleResetAreaSelection = useCallback(() => {
        setSelectedAreas([])
        resetRectangle()
        clearNdvi()
        setFieldSelectionMode(false)
        setBoundsSource(null)
        setSelectedFieldFeature(null)
    }, [resetRectangle, clearNdvi])
    
    const handleResetPointSelection = useCallback(() => {
        setSelectedPoint({ lat: null, lon: null })
        clearNdvi()
    }, [clearNdvi])
    
    useEffect(() => {
        if (analysisMode === "area" && compareMode === "areas") {
            if (isDrawing || fieldSelectionMode) {
                return
            }
            if (selectedAreas.length > 0 && selectedYear && selectedMonth) {
                selectedAreas.forEach(area => {
                    loadAreaNdvi(area)
                })
            }
        } else if (analysisMode === "area" && compareMode === "months") {
            if (isDrawing || fieldSelectionMode) {
                return
            }
            if (selectedAreas.length > 0 && selectedAreas[0] && selectedYear && selectedMonth) {
                loadAreaNdvi(selectedAreas[0])
            }
        } else if (rectangleBounds) {
            const geometry = boundsSource === 'field' ? selectedFieldFeature : null
            loadNdviData(rectangleBounds, cloudTolerance, null, null, overlayType, geometry)
        } else {
            clearNdvi()
        }
    }, [selectedYear, selectedMonth, cloudTolerance, overlayType, analysisMode, compareMode, selectedAreas.length, isDrawing, fieldSelectionMode, loadAreaNdvi, rectangleBounds, boundsSource, selectedFieldFeature, loadNdviData, clearNdvi])
    
    const isPointClickMode = analysisMode === "point" && compareMode === "points"
    const isPointSelectMode = analysisMode === "point" && compareMode === "months" && selectedPoint.lat === null && selectedPoint.lon === null
    
    return (
        <div style={{ display: "flex", width: "100%", height: "100vh" }}>
            <div style={{ width: "10%", height: "100vh", borderRight: "1px solid #ccc", backgroundColor: "white", overflowY: "auto", padding: "20px" }}>
                <BasemapSelector basemap={basemap} onBasemapChange={handleBasemapChange} />
                <AnalysisModeSelector analysisMode={analysisMode} onAnalysisModeChange={handleAnalysisModeChange} />
                <CompareModeSelector 
                    compareMode={compareMode} 
                    onCompareModeChange={handleCompareModeChange}
                    analysisMode={analysisMode}
                />
                
                {(analysisMode === "area" && compareMode === "areas") || (analysisMode === "area" && compareMode === "months" && selectedAreas.length === 0) ? (
                    <AreaSelectionPrompt
                        onSelectParcel={handleStartFieldSelection}
                        onDrawRectangle={handleStartDrawing}
                        isSelectionMode={isDrawing || fieldSelectionMode}
                        onCancel={handleCancelSelection}
                        isDrawing={isDrawing}
                        fieldSelectionMode={fieldSelectionMode}
                        currentZoom={currentZoom}
                        fieldsData={fieldsData}
                    />
                ) : null}
                
                <CloudToleranceSlider 
                    cloudTolerance={cloudTolerance}
                    onCloudChange={handleCloudChange}
                    onCloudButtonClick={() => {}}
                    onCloudButtonRelease={() => {}}
                />
                
                {(rectangleBounds || (analysisMode === "point" && compareMode === "months" && selectedPoint.lat !== null && selectedPoint.lon !== null)) && (
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                            if (analysisMode === "point" && compareMode === "months") {
                                handleResetPointSelection()
                            } else {
                                handleReset()
                            }
                        }}
                        style={{
                            marginTop: "15px",
                            fontSize: "13px",
                            cursor: "pointer",
                            color: "#0066cc",
                            textDecoration: "underline",
                            display: "block"
                        }}
                    >
                        Reset
                    </a>
                )}
                
                {analysisMode === "point" && compareMode === "points" && (
                    <div style={{
                        marginTop: "10px",
                        fontSize: "13px",
                        color: "#555",
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        textAlign: "center"
                    }}>
                        Click on the map to place a point
                    </div>
                )}
                
                {analysisMode === "point" && compareMode === "months" && selectedPoint.lat === null && selectedPoint.lon === null && (
                    <div style={{
                        marginTop: "10px",
                        fontSize: "13px",
                        color: "#555",
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        textAlign: "center"
                    }}>
                        Click to select a point
                    </div>
                )}
            </div>
            
            <div style={{ width: "60%", height: "100vh" }}>
                <MapView
                    isDrawing={isDrawing}
                    rectangleBounds={rectangleBounds}
                    currentBounds={currentBounds}
                    onStart={setStart}
                    onUpdate={updateBounds}
                    onEnd={handleFinalize}
                    ndviTileUrl={isImageAvailable() ? ndviTileUrl : null}
                    rgbTileUrl={isImageAvailable() ? rgbTileUrl : null}
                    overlayType={overlayType}
                    basemap={basemap}
                    recentNdviTileUrl={recentNdviTileUrl}
                    recentNdviLoading={recentNdviLoading}
                    recentNdviError={recentNdviError}
                    isPointClickMode={!!(isPointClickMode || isPointSelectMode)}
                    isPointSelectMode={isPointSelectMode}
                    selectedPoints={selectedPoints}
                    selectedPoint={selectedPoint}
                    selectedAreas={selectedAreas}
                    analysisMode={analysisMode}
                    compareMode={compareMode}
                    onPointClick={handlePointClick}
                    fieldSelectionMode={fieldSelectionMode}
                    fieldsData={fieldsData}
                    boundsSource={boundsSource}
                    selectedFieldFeature={selectedFieldFeature}
                    onFieldClick={handleFieldClick}
                    currentZoom={currentZoom}
                    onZoomChange={setCurrentZoom}
                    onMapBoundsChange={setMapBounds}
                />
            </div>
            
            <div style={{ width: "30%", height: "100vh", borderLeft: "1px solid #ccc", backgroundColor: "white", overflowY: "auto", padding: "20px" }}>
                {analysisMode === "point" && compareMode === "points" && selectedPoints.length > 0 && (
                    <PointsModePanel
                        selectedPoints={selectedPoints}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        rectangleBounds={rectangleBounds || mapBounds}
                        cloudTolerance={cloudTolerance}
                        onMonthChange={handleMonthChange}
                        onRemovePoint={handleRemovePoint}
                    />
                )}
                
                {analysisMode === "point" && compareMode === "months" && selectedPoint.lat !== null && selectedPoint.lon !== null && (
                    <PointMonthsModePanel
                        selectedPoint={selectedPoint}
                        rectangleBounds={rectangleBounds || mapBounds}
                        cloudTolerance={cloudTolerance}
                        onMonthChange={handleMonthChange}
                    />
                )}
                
                {analysisMode === "area" && compareMode === "areas" && selectedAreas.length > 0 && (
                    <AreasModePanel
                        selectedAreas={selectedAreas}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        rectangleBounds={rectangleBounds || mapBounds}
                        cloudTolerance={cloudTolerance}
                        onMonthChange={handleMonthChange}
                        onRemoveArea={(index: number) => setSelectedAreas(prev => prev.filter((_, i) => i !== index))}
                    />
                )}
                
                {analysisMode === "area" && compareMode === "months" && selectedAreas.length > 0 && (
                    <AreaMonthsModePanel
                        selectedArea={selectedAreas[0]}
                        rectangleBounds={selectedAreas[0].bounds || mapBounds}
                        cloudTolerance={cloudTolerance}
                        onMonthChange={handleMonthChange}
                        onResetSelection={handleResetAreaSelection}
                    />
                )}
            </div>
        </div>
    )
}

