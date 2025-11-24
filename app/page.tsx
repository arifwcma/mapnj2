"use client"
import { useState, useCallback, useRef, useEffect, Suspense } from "react"
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
import useAnalytics from "@/app/hooks/useAnalytics"
import { useStatusMessage } from "@/app/components/StatusMessage"
import { MESSAGES } from "@/app/lib/messageConstants"
import { DEBOUNCE_DELAYS } from "@/app/lib/config"

function PageContent() {
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
    const [restoredZoom, setRestoredZoom] = useState<number | null>(null)
    const [restoredBounds, setRestoredBounds] = useState<[[number, number], [number, number]] | null>(null)
    const [pointSnapshotsOpen, setPointSnapshotsOpen] = useState(false)
    const [areaSnapshotsOpen, setAreaSnapshotsOpen] = useState(false)
    
    const searchParams = useSearchParams()
    const router = useRouter()
    const hasRestoredStateRef = useRef(false)
    const { trackEvent } = useAnalytics()
    
    const previousBasemapRef = useRef(basemap)
    const previousAnalysisModeRef = useRef(analysisMode)
    const previousCompareModeRef = useRef(compareMode)
    const previousCloudToleranceRef = useRef(cloudTolerance)
    const mapPanDebounceRef = useRef(null)
    const mapZoomDebounceRef = useRef(null)
    
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
                                setRestoredZoom(state.currentZoom)
                            }
                            if (state.mapBounds) {
                                setMapBounds(state.mapBounds)
                                setRestoredBounds(state.mapBounds)
                            }
                            if (state.pointSnapshotsOpen) {
                                setPointSnapshotsOpen(true)
                            }
                            if (state.areaSnapshotsOpen) {
                                setAreaSnapshotsOpen(true)
                            }
                            
                            trackEvent("share_link_opened", {
                                token: shareToken,
                                restored_state: {
                                    analysis_mode: state.analysisMode,
                                    compare_mode: state.compareMode,
                                    has_points: !!(state.selectedPoints && state.selectedPoints.length > 0),
                                    has_areas: !!(state.selectedAreas && state.selectedAreas.length > 0),
                                }
                            })
                        }
                    }
                })
                .catch(err => {
                    console.error('Error loading share state:', err)
                })
        }
    }, [searchParams, trackEvent])
    
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
    
    const handleShare = useCallback(async (openPointSnapshots = false, openAreaSnapshots = false) => {
        trackEvent("share_button_clicked", {
            analysis_mode: analysisMode,
            compare_mode: compareMode,
            has_points: selectedPoints.length > 0 || (selectedPoint.lat !== null && selectedPoint.lon !== null),
            has_areas: selectedAreas.length > 0
        })
        
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
            mapBounds,
            pointSnapshotsOpen: openPointSnapshots || pointSnapshotsOpen,
            areaSnapshotsOpen: openAreaSnapshots || areaSnapshotsOpen
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
    }, [basemap, analysisMode, compareMode, cloudTolerance, selectedPoints, selectedPoint, selectedAreas, selectedYear, selectedMonth, pointMonthsSelectedMonths, areaMonthsSelectedMonths, pointsVisibleRange, areasVisibleRange, pointsYAxisRange, areasYAxisRange, pointMonthsYAxisRange, areaMonthsYAxisRange, currentZoom, mapBounds, pointSnapshotsOpen, areaSnapshotsOpen, trackEvent])
    
    const handleSharePointSnapshots = useCallback(async () => {
        return handleShare(true, false)
    }, [handleShare])
    
    const handleShareAreaSnapshots = useCallback(async () => {
        return handleShare(false, true)
    }, [handleShare])
    
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
        const previousMode = previousAnalysisModeRef.current
        previousAnalysisModeRef.current = mode
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
        trackEvent("analysis_mode_change", {
            previous_mode: previousMode,
            new_mode: mode
        })
    }, [resetRectangle, clearNdvi, trackEvent])
    
    const handleCompareModeChange = useCallback((mode: "points" | "areas" | "months") => {
        const previousMode = previousCompareModeRef.current
        previousCompareModeRef.current = mode
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
        trackEvent("compare_mode_change", {
            previous_mode: previousMode,
            new_mode: mode,
            analysis_mode: analysisMode
        })
    }, [resetRectangle, clearNdvi, analysisMode, trackEvent])
    
    const handleCloudChange = (newValue: number) => {
        const previousValue = previousCloudToleranceRef.current
        previousCloudToleranceRef.current = newValue
        cloudToleranceRef.current = newValue
        setCloudTolerance(newValue)
        
        if (cloudDebounceTimeoutRef.current) {
            clearTimeout(cloudDebounceTimeoutRef.current)
        }
        
        cloudDebounceTimeoutRef.current = setTimeout(() => {
            updateCloudTolerance(newValue)
            trackEvent("cloud_tolerance_change", {
                previous_value: previousValue,
                new_value: newValue
            })
        }, DEBOUNCE_DELAYS.CLOUD_TOLERANCE)
    }
    
    
    const handleBasemapChange = useCallback((newBasemap: string) => {
        const previousBasemap = previousBasemapRef.current
        previousBasemapRef.current = newBasemap
        setBasemap(newBasemap)
        trackEvent("basemap_change", {
            previous_basemap: previousBasemap,
            new_basemap: newBasemap
        })
    }, [trackEvent])
    
    const handlePointClick = useCallback((lat: number, lon: number) => {
        trackEvent("map_click", {
            lat,
            lon,
            zoom: currentZoom,
            analysis_mode: analysisMode,
            compare_mode: compareMode,
            bounds: mapBounds
        })
        
        if (analysisMode === "point" && compareMode === "points") {
            const newPoint = {
                id: `point_${Date.now()}_${Math.random()}`,
                lat,
                lon
            }
            setSelectedPoints(prev => {
                const updated = [...prev, newPoint]
                trackEvent("point_added", {
                    lat,
                    lon,
                    point_index: prev.length,
                    total_points: updated.length,
                    compare_mode: compareMode
                })
                return updated
            })
        } else if (analysisMode === "point" && compareMode === "months") {
            setSelectedPoint({ lat, lon })
            trackEvent("point_added", {
                lat,
                lon,
                point_index: 0,
                total_points: 1,
                compare_mode: compareMode
            })
        }
    }, [analysisMode, compareMode, currentZoom, mapBounds, trackEvent])
    
    const handleRemovePoint = useCallback((index: number) => {
        setSelectedPoints(prev => {
            const updated = prev.filter((_, i) => i !== index)
            trackEvent("point_removed", {
                point_index: index,
                total_points: updated.length
            })
            return updated
        })
    }, [trackEvent])
    
    const handleMonthChange = useCallback((year: number, month: number) => {
        const previousYear = selectedYear
        const previousMonth = selectedMonth
        setSelectedYear(year)
        setSelectedMonth(month)
        if (previousYear !== null && previousMonth !== null) {
            trackEvent("month_changed", {
                previous_year: previousYear,
                previous_month: previousMonth,
                new_year: year,
                new_month: month,
                analysis_mode: analysisMode,
                compare_mode: compareMode
            })
        }
    }, [selectedYear, selectedMonth, analysisMode, compareMode, trackEvent])
    
    const handleStartFieldSelection = useCallback(() => {
        
        if (isDrawing) {
            stopDrawing()
            resetRectangle()
            setBoundsSource(null)
        }
        setFieldSelectionMode(true)
        trackEvent("field_selection_started", {
            zoom: currentZoom,
            bounds: mapBounds
        })
        
        if (currentZoom !== null && currentZoom !== undefined && currentZoom >= 13) {
            if (mapBounds) {
                loadFieldsForBounds(mapBounds, currentZoom)
            }
        }
    }, [isDrawing, stopDrawing, resetRectangle, currentZoom, mapBounds, loadFieldsForBounds, trackEvent])
    
    const handleCancelFieldSelection = useCallback(() => {
        setFieldSelectionMode(false)
        trackEvent("field_selection_cancelled")
    }, [trackEvent])
    
    const handleCancelSelection = useCallback(() => {
        if (fieldSelectionMode) {
            trackEvent("field_selection_cancelled")
        }
        if (isDrawing) {
            trackEvent("rectangle_drawing_cancelled")
        }
        setFieldSelectionMode(false)
        stopDrawing()
        resetRectangle()
        setSelectedFieldFeature(null)
        setBoundsSource(null)
    }, [stopDrawing, resetRectangle, fieldSelectionMode, isDrawing, trackEvent])
    
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
            setSelectedAreas(prev => {
                const updated = [...prev, newArea]
                trackEvent("area_added", {
                    bounds,
                    bounds_source: 'field',
                    area_index: prev.length,
                    total_areas: updated.length,
                    compare_mode: compareMode
                })
                return updated
            })
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
            trackEvent("area_added", {
                bounds,
                bounds_source: 'field',
                area_index: 0,
                total_areas: 1,
                compare_mode: compareMode
            })
            setBounds(bounds)
            setBoundsSource('field')
            setSelectedFieldFeature(feature)
            setFieldSelectionMode(false)
        }
    }, [analysisMode, compareMode, selectedAreas.length, setBounds, selectedYear, selectedMonth, loadAreaNdvi, trackEvent])
    
    const handleStartDrawing = useCallback(() => {
        if (fieldSelectionMode) {
        setFieldSelectionMode(false)
        setSelectedFieldFeature(null)
            setBoundsSource(null)
        }
        startDrawing()
        setBoundsSource('rectangle')
        trackEvent("rectangle_drawing_started")
    }, [startDrawing, fieldSelectionMode, trackEvent])
    
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
            setSelectedAreas(prev => {
                const updated = [...prev, newArea]
                trackEvent("area_added", {
                    bounds: currentBounds,
                    bounds_source: 'rectangle',
                    area_index: prev.length,
                    total_areas: updated.length,
                    compare_mode: compareMode
                })
                return updated
            })
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
            trackEvent("area_added", {
                bounds: currentBounds,
                bounds_source: 'rectangle',
                area_index: 0,
                total_areas: 1,
                compare_mode: compareMode
            })
        }
        finalizeRectangle()
        setBoundsSource('rectangle')
        setSelectedFieldFeature(null)
        if (analysisMode === "area" && compareMode === "areas") {
            startDrawing()
        }
    }, [finalizeRectangle, analysisMode, compareMode, currentBounds, selectedAreas.length, selectedYear, selectedMonth, loadAreaNdvi, startDrawing, trackEvent])
    
    const handleReset = useCallback(() => {
        resetRectangle()
        clearNdvi()
        setSelectedPoints([])
        setSelectedPoint({ lat: null, lon: null })
        setSelectedAreas([])
        setFieldSelectionMode(false)
        setBoundsSource(null)
        setSelectedFieldFeature(null)
        trackEvent("reset_clicked", {
            reset_type: "full",
            analysis_mode: analysisMode,
            compare_mode: compareMode
        })
    }, [resetRectangle, clearNdvi, analysisMode, compareMode, trackEvent])
    
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
        trackEvent("reset_clicked", {
            reset_type: "point_selection",
            analysis_mode: analysisMode,
            compare_mode: compareMode
        })
    }, [clearNdvi, analysisMode, compareMode, trackEvent])
    
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
                    onZoomChange={(zoom) => {
                        setCurrentZoom(zoom)
                        if (mapZoomDebounceRef.current) {
                            clearTimeout(mapZoomDebounceRef.current)
                        }
                        mapZoomDebounceRef.current = setTimeout(() => {
                            trackEvent("map_zoom", {
                                zoom,
                                bounds: mapBounds
                            })
                        }, 1000)
                    }}
                    onMapBoundsChange={(bounds) => {
                        setMapBounds(bounds)
                        if (mapPanDebounceRef.current) {
                            clearTimeout(mapPanDebounceRef.current)
                        }
                        mapPanDebounceRef.current = setTimeout(() => {
                            trackEvent("map_pan", {
                                bounds,
                                zoom: currentZoom
                            })
                        }, 2000)
                    }}
                    initialZoom={restoredZoom}
                    initialBounds={restoredBounds}
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
                        onSharePointSnapshots={handleSharePointSnapshots}
                        pointSnapshotsOpen={pointSnapshotsOpen}
                        setPointSnapshotsOpen={setPointSnapshotsOpen}
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
                        onRemoveArea={(index: number) => {
                            setSelectedAreas(prev => {
                                const updated = prev.filter((_, i) => i !== index)
                                trackEvent("area_removed", {
                                    area_index: index,
                                    total_areas: updated.length
                                })
                                return updated
                            })
                        }}
                        visibleRange={areasVisibleRange}
                        setVisibleRange={setAreasVisibleRange}
                        yAxisRange={areasYAxisRange}
                        setYAxisRange={setAreasYAxisRange}
                        onShareAreaSnapshots={handleShareAreaSnapshots}
                        areaSnapshotsOpen={areaSnapshotsOpen}
                        setAreaSnapshotsOpen={setAreaSnapshotsOpen}
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
                        onShareAreaSnapshots={handleShareAreaSnapshots}
                        areaSnapshotsOpen={areaSnapshotsOpen}
                        setAreaSnapshotsOpen={setAreaSnapshotsOpen}
                    />
                )}
            </div>
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PageContent />
        </Suspense>
    )
}
