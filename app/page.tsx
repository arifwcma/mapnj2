"use client"
import { useState, useCallback, useRef, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import MapView from "@/app/components/MapView"
import BasemapSelector from "@/app/components/BasemapSelector"
import AnalysisModeSelector from "@/app/components/AnalysisModeSelector"
import CompareModeSelector from "@/app/components/CompareModeSelector"
import AreaSelectionPrompt from "@/app/components/AreaSelectionPrompt"
import CloudToleranceDropdown from "@/app/components/CloudToleranceDropdown"
import ShareButton from "@/app/components/ShareButton"
import PointsModePanel from "@/app/components/PointsModePanel"
import PointMonthsModePanel from "@/app/components/PointMonthsModePanel"
import AreasModePanel from "@/app/components/AreasModePanel"
import AreaMonthsModePanel from "@/app/components/AreaMonthsModePanel"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { getCurrentMonth } from "@/app/lib/monthUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"
import { getInitialVisibleRange } from "@/app/lib/rangeUtils"
import { bboxToString } from "@/app/lib/bboxUtils"
import { serializeState, deserializeState } from "@/app/lib/shareUtils"
import useRectangleDraw from "@/app/hooks/useRectangleDraw"
import useNdviData from "@/app/hooks/useNdviData"
import useFields from "@/app/hooks/useFields"
import useAreaNdvi from "@/app/hooks/useAreaNdvi"
import { useStatusMessage } from "@/app/components/StatusMessage"
import { MESSAGES } from "@/app/lib/messageConstants"
import { DEBOUNCE_DELAYS } from "@/app/lib/config"

export default function Page() {
    const [basemap, setBasemap] = useState("street")
    const [analysisMode, setAnalysisMode] = useState<"point" | "area">("point")
    const [compareMode, setCompareMode] = useState<"points" | "areas" | "months">("points")
    const [cloudTolerance, setCloudTolerance] = useState(DEFAULT_CLOUD_TOLERANCE)
    const [selectedPoints, setSelectedPoints] = useState<Array<{ id: string, lat: number, lon: number }>>([])
    const [selectedPoint, setSelectedPoint] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null })
    const [selectedAreas, setSelectedAreas] = useState<Array<{ id: string, geometry: any, bounds: [[number, number], [number, number]], color: string, label: string, boundsSource: 'rectangle' | 'field', ndviTileUrl?: string | null, rgbTileUrl?: string | null }>>([])
    const [fieldSelectionMode, setFieldSelectionMode] = useState(false)
    const [boundsSource, setBoundsSource] = useState<'rectangle' | 'field' | null>(null)
    const [selectedFieldFeature, setSelectedFieldFeature] = useState<any>(null)
    const [currentZoom, setCurrentZoom] = useState<number | null>(null)
    const [selectedYear, setSelectedYear] = useState<number | null>(null)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
    const [mapBounds, setMapBounds] = useState<[[number, number], [number, number]] | null>(null)
    const [pointMonthsSelectedMonths, setPointMonthsSelectedMonths] = useState<Array<{ year: number, month: number }>>([])
    const [areaMonthsSelectedMonths, setAreaMonthsSelectedMonths] = useState<Array<{ year: number, month: number }>>([])
    const [pointsVisibleRange, setPointsVisibleRange] = useState<{ startMonth: { year: number, month: number }, endMonth: { year: number, month: number } } | null>(null)
    const [areasVisibleRange, setAreasVisibleRange] = useState<{ startMonth: { year: number, month: number }, endMonth: { year: number, month: number } } | null>(null)
    const [pointsYAxisRange, setPointsYAxisRange] = useState<"0-1" | "-1-1">("0-1")
    const [areasYAxisRange, setAreasYAxisRange] = useState<"0-1" | "-1-1">("0-1")
    const [pointMonthsYAxisRange, setPointMonthsYAxisRange] = useState<"0-1" | "-1-1">("0-1")
    const [areaMonthsYAxisRange, setAreaMonthsYAxisRange] = useState<"0-1" | "-1-1">("0-1")
    const [shouldRestoreMap, setShouldRestoreMap] = useState(false)
    
    const searchParams = useSearchParams()
    const router = useRouter()
    const hasRestoredStateRef = useRef(false)
    
    useEffect(() => {
        if (!selectedYear || !selectedMonth) {
            const current = getCurrentMonth()
            setSelectedYear(current.year)
            setSelectedMonth(current.month)
        }
    }, [selectedYear, selectedMonth])
    
    useEffect(() => {
        if (selectedYear && selectedMonth) {
            const newRange = getInitialVisibleRange(selectedYear, selectedMonth)
            if (analysisMode === "point" && compareMode === "points") {
                if (!pointsVisibleRange) {
                    setPointsVisibleRange(newRange)
                }
            } else if (analysisMode === "area" && compareMode === "areas") {
                if (!areasVisibleRange) {
                    setAreasVisibleRange(newRange)
                }
            }
        }
    }, [selectedYear, selectedMonth, analysisMode, compareMode])
    
    useEffect(() => {
        const shareToken = searchParams.get('share')
        if (shareToken && !hasRestoredStateRef.current) {
            hasRestoredStateRef.current = true
            fetch(`/api/share/${shareToken}`)
                .then(res => res.json())
                .then(data => {
                    if (data.state) {
                        const state = deserializeState(data.state)
                        if (state) {
                            if (state.basemap) setBasemap(state.basemap)
                            if (state.analysisMode) setAnalysisMode(state.analysisMode)
                            if (state.compareMode) setCompareMode(state.compareMode)
                            if (state.cloudTolerance !== undefined) setCloudTolerance(state.cloudTolerance)
                            if (state.selectedPoints) setSelectedPoints(state.selectedPoints)
                            if (state.selectedPoint) setSelectedPoint(state.selectedPoint)
                            if (state.selectedAreas) setSelectedAreas(state.selectedAreas)
                            if (state.selectedYear !== undefined) setSelectedYear(state.selectedYear)
                            if (state.selectedMonth !== undefined) setSelectedMonth(state.selectedMonth)
                            if (state.pointMonthsSelectedMonths) setPointMonthsSelectedMonths(state.pointMonthsSelectedMonths)
                            if (state.areaMonthsSelectedMonths) setAreaMonthsSelectedMonths(state.areaMonthsSelectedMonths)
                            if (state.pointsVisibleRange) setPointsVisibleRange(state.pointsVisibleRange)
                            if (state.areasVisibleRange) setAreasVisibleRange(state.areasVisibleRange)
                            if (state.pointsYAxisRange !== undefined) setPointsYAxisRange(state.pointsYAxisRange)
                            if (state.areasYAxisRange !== undefined) setAreasYAxisRange(state.areasYAxisRange)
                            if (state.pointMonthsYAxisRange !== undefined) setPointMonthsYAxisRange(state.pointMonthsYAxisRange)
                            if (state.areaMonthsYAxisRange !== undefined) setAreaMonthsYAxisRange(state.areaMonthsYAxisRange)
                            if (state.currentZoom !== undefined && state.currentZoom !== null) {
                                setCurrentZoom(state.currentZoom)
                            }
                            if (state.mapBounds) {
                                setMapBounds(state.mapBounds)
                                setShouldRestoreMap(true)
                            } else if (state.currentZoom !== undefined && state.currentZoom !== null) {
                                setShouldRestoreMap(true)
                            }
                        }
                    }
                })
                .catch(err => {
                    console.error('Error loading share state:', err)
                })
        }
    }, [searchParams])
    
    useEffect(() => {
        if (!selectedPoint || selectedPoint.lat === null || selectedPoint.lon === null) {
            setPointMonthsSelectedMonths([])
        }
    }, [selectedPoint])
    
    useEffect(() => {
        if (!selectedAreas || selectedAreas.length === 0) {
            setAreaMonthsSelectedMonths([])
        }
    }, [selectedAreas])
    
    const handleShare = useCallback(async () => {
        const state = {
            basemap,
            analysisMode,
            compareMode,
            cloudTolerance,
            selectedPoints,
            selectedPoint,
            selectedAreas: selectedAreas.map(area => ({
                id: area.id,
                geometry: area.geometry,
                bounds: area.bounds,
                color: area.color,
                label: area.label,
                boundsSource: area.boundsSource
            })),
            selectedYear,
            selectedMonth,
            pointMonthsSelectedMonths,
            areaMonthsSelectedMonths,
            pointsVisibleRange,
            areasVisibleRange,
            pointsYAxisRange,
            areasYAxisRange,
            pointMonthsYAxisRange,
            areaMonthsYAxisRange,
            currentZoom,
            mapBounds
        }
        
        try {
            const response = await fetch('/api/share/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: serializeState(state)
            })
            const data = await response.json()
            return data.token
        } catch (error) {
            console.error('Error saving share:', error)
            return null
        }
    }, [basemap, analysisMode, compareMode, cloudTolerance, selectedPoints, selectedPoint, selectedAreas, selectedYear, selectedMonth, pointMonthsSelectedMonths, areaMonthsSelectedMonths, pointsVisibleRange, areasVisibleRange])
    
    const { fieldsData, fieldsLoading, loadFieldsForBounds } = useFields()
    
    const previousFieldsBoundsRef = useRef<[[number, number], [number, number]] | null>(null)
    const previousFieldsZoomRef = useRef<number | null>(null)
    
    useEffect(() => {
        if (!fieldSelectionMode) {
            return
        }
        
        if (currentZoom === null || currentZoom === undefined || currentZoom < 13) {
            return
        }
        
        if (!mapBounds) {
            return
        }
        
        const boundsChanged = !previousFieldsBoundsRef.current || 
            Math.abs(previousFieldsBoundsRef.current[0][0] - mapBounds[0][0]) > 0.01 ||
            Math.abs(previousFieldsBoundsRef.current[0][1] - mapBounds[0][1]) > 0.01 ||
            Math.abs(previousFieldsBoundsRef.current[1][0] - mapBounds[1][0]) > 0.01 ||
            Math.abs(previousFieldsBoundsRef.current[1][1] - mapBounds[1][1]) > 0.01
        
        const zoomChanged = previousFieldsZoomRef.current !== currentZoom
        
        if (boundsChanged || zoomChanged) {
            previousFieldsBoundsRef.current = mapBounds
            previousFieldsZoomRef.current = currentZoom
            loadFieldsForBounds(mapBounds, currentZoom)
        }
    }, [fieldSelectionMode, mapBounds, currentZoom, loadFieldsForBounds])
    
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
        isImageAvailable
    } = useNdviData()
    
    const { loadAreaNdvi } = useAreaNdvi(selectedYear, selectedMonth, cloudTolerance, setSelectedAreas)
    
    const cloudToleranceRef = useRef(cloudTolerance)
    const cloudDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    
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
        
        if (cloudDebounceTimeoutRef.current) {
            clearTimeout(cloudDebounceTimeoutRef.current)
        }
        
        cloudDebounceTimeoutRef.current = setTimeout(() => {
            updateCloudTolerance(newValue)
        }, DEBOUNCE_DELAYS.CLOUD_TOLERANCE)
    }
    
    
    const handleBasemapChange = useCallback((newBasemap: string) => {
        setBasemap(newBasemap)
    }, [])
    
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
        
        if (currentZoom !== null && currentZoom !== undefined && currentZoom >= 13) {
            if (mapBounds) {
                loadFieldsForBounds(mapBounds, currentZoom)
            }
        }
    }, [isDrawing, stopDrawing, resetRectangle, currentZoom, mapBounds, loadFieldsForBounds])
    
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
        if (analysisMode === "area" && compareMode === "areas") {
            startDrawing()
        }
    }, [finalizeRectangle, analysisMode, compareMode, currentBounds, selectedAreas.length, selectedYear, selectedMonth, loadAreaNdvi, startDrawing])
    
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
    }, [selectedYear, selectedMonth, cloudTolerance, overlayType, analysisMode, compareMode, selectedAreas.length, isDrawing, fieldSelectionMode, loadAreaNdvi, rectangleBounds, boundsSource, selectedFieldFeature, loadNdviData, clearNdvi, mapBounds, selectedPoints.length])
    
    const isPointClickMode = analysisMode === "point" && compareMode === "points"
    const isPointSelectMode = analysisMode === "point" && compareMode === "months" && selectedPoint.lat === null && selectedPoint.lon === null
    const { setDirectionalMessage } = useStatusMessage()

    useEffect(() => {
        if (analysisMode === "point" && compareMode === "points") {
            setDirectionalMessage(MESSAGES.POINT_CLICK_TO_PLACE)
        } else if (analysisMode === "point" && compareMode === "months" && selectedPoint.lat === null && selectedPoint.lon === null) {
            setDirectionalMessage(MESSAGES.POINT_CLICK_TO_SELECT)
        } else if (analysisMode === "point" && compareMode === "months" && selectedPoint.lat !== null && selectedPoint.lon !== null) {
            setDirectionalMessage(MESSAGES.POINT_ADD_MONTH)
        } else if (analysisMode === "area" && compareMode === "months" && selectedAreas.length > 0) {
            setDirectionalMessage(MESSAGES.POINT_ADD_MONTH)
        } else if (analysisMode === "point") {
            setDirectionalMessage(null)
        }
    }, [analysisMode, compareMode, selectedPoint.lat, selectedPoint.lon, selectedAreas.length, setDirectionalMessage])
    
    return (
        <div style={{ display: "flex", width: "100%", height: "100vh" }}>
            <div style={{ width: "10%", height: "100vh", borderRight: "1px solid #ccc", backgroundColor: "white", overflowY: "auto", padding: "20px" }}>
                <ShareButton onShare={handleShare} />
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
                
                <CloudToleranceDropdown 
                    cloudTolerance={cloudTolerance}
                    onCloudChange={handleCloudChange}
                />
                
                {((rectangleBounds && !(analysisMode === "area" && compareMode === "areas")) || (analysisMode === "point" && compareMode === "months" && selectedPoint.lat !== null && selectedPoint.lon !== null)) && (
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
                            cursor: "pointer",
                            color: "#0066cc",
                            textDecoration: "underline",
                            display: "block"
                        }}
                    >
                        Reset
                    </a>
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
                    initialZoom={shouldRestoreMap ? currentZoom : null}
                    initialBounds={shouldRestoreMap ? mapBounds : null}
                />
            </div>
            
            <div style={{ width: "30%", height: "100vh", borderLeft: "1px solid #ccc", backgroundColor: "white", overflowY: "auto", padding: "20px" }}>
                {analysisMode === "point" && compareMode === "points" && selectedPoints.length > 0 && (
                    <PointsModePanel
                        selectedPoints={selectedPoints}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        rectangleBounds={rectangleBounds}
                        cloudTolerance={cloudTolerance}
                        onMonthChange={handleMonthChange}
                        onRemovePoint={handleRemovePoint}
                        visibleRange={pointsVisibleRange}
                        setVisibleRange={setPointsVisibleRange}
                        yAxisRange={pointsYAxisRange}
                        setYAxisRange={setPointsYAxisRange}
                    />
                )}
                
                {analysisMode === "point" && compareMode === "months" && selectedPoint.lat !== null && selectedPoint.lon !== null && (
                    <PointMonthsModePanel
                        selectedPoint={selectedPoint}
                        rectangleBounds={rectangleBounds}
                        cloudTolerance={cloudTolerance}
                        onMonthChange={handleMonthChange}
                        selectedMonths={pointMonthsSelectedMonths}
                        setSelectedMonths={setPointMonthsSelectedMonths}
                        yAxisRange={pointMonthsYAxisRange}
                        setYAxisRange={setPointMonthsYAxisRange}
                    />
                )}
                
                {analysisMode === "area" && compareMode === "areas" && selectedAreas.length > 0 && (
                    <AreasModePanel
                        selectedAreas={selectedAreas}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        rectangleBounds={rectangleBounds}
                        cloudTolerance={cloudTolerance}
                        onMonthChange={handleMonthChange}
                        onRemoveArea={(index: number) => setSelectedAreas(prev => prev.filter((_, i) => i !== index))}
                        visibleRange={areasVisibleRange}
                        setVisibleRange={setAreasVisibleRange}
                        yAxisRange={areasYAxisRange}
                        setYAxisRange={setAreasYAxisRange}
                    />
                )}
                
                {analysisMode === "area" && compareMode === "months" && selectedAreas.length > 0 && (
                    <AreaMonthsModePanel
                        selectedArea={selectedAreas[0]}
                        rectangleBounds={selectedAreas[0].bounds || mapBounds}
                        cloudTolerance={cloudTolerance}
                        onMonthChange={handleMonthChange}
                        selectedMonths={areaMonthsSelectedMonths}
                        setSelectedMonths={setAreaMonthsSelectedMonths}
                        yAxisRange={areaMonthsYAxisRange}
                        setYAxisRange={setAreaMonthsYAxisRange}
                    />
                )}
            </div>
        </div>
    )
}

