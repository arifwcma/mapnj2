"use client"
import { useState, useCallback, useRef, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import MapView from "@/app/components/MapView"
import BasemapSelector from "@/app/components/BasemapSelector"
import AnalysisModeSelector from "@/app/components/AnalysisModeSelector"
import CompareModeSelector from "@/app/components/CompareModeSelector"
import AreaSelectionPrompt from "@/app/components/AreaSelectionPrompt"
import CloudToleranceDropdown from "@/app/components/CloudToleranceDropdown"
import IndexSelector from "@/app/components/IndexSelector"
import ShareButton from "@/app/components/ShareButton"
import PointsModePanel from "@/app/components/PointsModePanel"
import PointMonthsModePanel from "@/app/components/PointMonthsModePanel"
import AreasModePanel from "@/app/components/AreasModePanel"
import AreaMonthsModePanel from "@/app/components/AreaMonthsModePanel"
import { getCurrentMonth } from "@/app/lib/monthUtils"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"
import { DEFAULT_INDEX } from "@/app/lib/indexConfig"
import { getInitialVisibleRange } from "@/app/lib/rangeUtils"
import { bboxToString } from "@/app/lib/bboxUtils"
import { serializeState, deserializeState } from "@/app/lib/shareUtils"
import useRectangleDraw from "@/app/hooks/useRectangleDraw"
import useNdviData from "@/app/hooks/useNdviData"
import useFields from "@/app/hooks/useFields"
import useAreaNdvi from "@/app/hooks/useAreaNdvi"
import { useStatusMessage } from "@/app/components/StatusMessage"
import { trackEvent } from "@/app/lib/analytics"
import { MESSAGES } from "@/app/lib/messageConstants"
import { DEBOUNCE_DELAYS } from "@/app/lib/config"

function PageContent() {
    const [basemap, setBasemap] = useState("street")
    const [analysisMode, setAnalysisMode] = useState<"point" | "area">("point")
    const [compareMode, setCompareMode] = useState<"points" | "areas" | "months">("points")
    const [cloudTolerance, setCloudTolerance] = useState(DEFAULT_CLOUD_TOLERANCE)
    const [selectedIndex, setSelectedIndex] = useState(DEFAULT_INDEX)
    const [selectedPoints, setSelectedPoints] = useState<Array<{ id: string, lat: number, lon: number }>>([])
    const [selectedPoint, setSelectedPoint] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null })
    const [selectedAreas, setSelectedAreas] = useState<Array<{ id: string, geometry: any, bounds: [[number, number], [number, number]], label: string, boundsSource: 'rectangle' | 'field', indexTileUrl?: string | null, rgbTileUrl?: string | null }>>([])
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
    const [focusPointIndex, setFocusPointIndex] = useState<number | null>(null)
    const [focusAreaIndex, setFocusAreaIndex] = useState<number | null>(null)
    const [copyCoordinateMode, setCopyCoordinateMode] = useState(false)
    const [goToXYOpen, setGoToXYOpen] = useState(false)
    const [goToXYInput, setGoToXYInput] = useState("")
    const [goToXYPosition, setGoToXYPosition] = useState<[number, number] | null>(null)
    
    const searchParams = useSearchParams()
    const router = useRouter()
    const hasRestoredStateRef = useRef(false)
    const lastPointClickRef = useRef<{ lat: number, lon: number, time: number } | null>(null)
    const lastAreaAddRef = useRef<{ bounds: [[number, number], [number, number]], time: number } | null>(null)
    const lastPointRemoveRef = useRef<{ index: number, time: number } | null>(null)
    const pointRemoveTrackingRef = useRef<{ index: number, length: number } | null>(null)
    const areaAddTrackingRef = useRef<{ index: number, total: number, source: string, time: number } | null>(null)
    const areaRemoveTrackingRef = useRef<{ index: number, length: number } | null>(null)
    
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
                            if (state.selectedIndex) setSelectedIndex(state.selectedIndex)
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
                            const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
                            const feature = 
                                state.analysisMode === "point" && state.compareMode === "points" ? "Point-Points" :
                                state.analysisMode === "point" && state.compareMode === "months" ? "Point-Months" :
                                state.analysisMode === "area" && state.compareMode === "areas" ? "Area-Areas" :
                                state.analysisMode === "area" && state.compareMode === "months" ? "Area-Months" :
                                null
                            const total_objects = state.analysisMode === "point" 
                                ? (state.compareMode === "points" ? (state.selectedPoints?.length || 0) : (state.selectedPoint?.lat ? 1 : 0))
                                : (state.selectedAreas?.length || 0)
                            
                            trackEvent("Share link opened", {
                                url: shareUrl,
                                feature: feature,
                                total_objects: total_objects
                            })
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
    }, [selectedAreas.length])
    
    const handleShare = useCallback(async (openPointSnapshots = false, openAreaSnapshots = false) => {
        const state = {
            basemap,
            analysisMode,
            compareMode,
            cloudTolerance,
            selectedIndex,
            selectedPoints,
            selectedPoint,
            selectedAreas: selectedAreas.map(area => ({
                id: area.id,
                geometry: area.geometry,
                bounds: area.bounds,
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
            if (data.token) {
                return data.token
            }
            return null
        } catch (error) {
            console.error('Error saving share:', error)
            return null
        }
    }, [basemap, analysisMode, compareMode, cloudTolerance, selectedIndex, selectedPoints, selectedPoint, selectedAreas, selectedYear, selectedMonth, pointMonthsSelectedMonths, areaMonthsSelectedMonths, pointsVisibleRange, areasVisibleRange, pointsYAxisRange, areasYAxisRange, pointMonthsYAxisRange, areaMonthsYAxisRange, currentZoom, mapBounds, pointSnapshotsOpen, areaSnapshotsOpen])
    
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
        indexTileUrl,
        rgbTileUrl,
        overlayType,
        loadNdviData,
        updateCloudTolerance,
        clearNdvi,
        isImageAvailable
    } = useNdviData()
    
    const { loadAreaNdvi } = useAreaNdvi(selectedYear, selectedMonth, cloudTolerance, setSelectedAreas, selectedIndex)
    
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
        const newCompareMode = mode === "point" ? "points" : "areas"
        setCompareMode(newCompareMode)
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
    }, [resetRectangle, clearNdvi, compareMode])
    
    const handleCloudChange = (newValue: number) => {
        const previousValue = cloudTolerance
        cloudToleranceRef.current = newValue
        setCloudTolerance(newValue)
        
        if (cloudDebounceTimeoutRef.current) {
            clearTimeout(cloudDebounceTimeoutRef.current)
        }
        
        cloudDebounceTimeoutRef.current = setTimeout(() => {
            updateCloudTolerance(newValue)
            const feature = 
                analysisMode === "point" && compareMode === "points" ? "Point-Points" :
                analysisMode === "point" && compareMode === "months" ? "Point-Months" :
                analysisMode === "area" && compareMode === "areas" ? "Area-Areas" :
                analysisMode === "area" && compareMode === "months" ? "Area-Months" :
                null
            trackEvent("Cloud tolerance changed", {
                feature: feature,
                current_value: newValue
            })
        }, DEBOUNCE_DELAYS.CLOUD_TOLERANCE)
    }
    
    const handleIndexChange = (newIndex: string) => {
        setSelectedIndex(newIndex)
        trackEvent("Index changed", {
            current_index: newIndex
        })
    }
    
    const handleBasemapChange = useCallback((newBasemap: string) => {
        const previousBasemap = basemap
        setBasemap(newBasemap)
        trackEvent("Basemap change", {
            previous_basemap: previousBasemap,
            new_basemap: newBasemap
        })
    }, [basemap])
    
    const handleCoordinateCopy = useCallback((lat: number, lon: number) => {
        const coordString = `${lat},${lon}`
        trackEvent("Coordinate copied", {
            lat,
            lon
        })
        setCopyCoordinateMode(false)
        navigator.clipboard.writeText(coordString).then(() => {
            alert(`Coordinate copied to clipboard: ${coordString}`)
        }).catch(() => {
            alert(`Coordinate copied to clipboard: ${coordString}`)
        })
    }, [])
    
    const handleGoToXY = useCallback(() => {
        const input = goToXYInput.trim()
        if (!input) {
            return
        }
        
        const parts = input.split(",").map(s => s.trim())
        if (parts.length !== 2) {
            alert("Invalid format. Please use: lat,lon")
            return
        }
        
        const lat = parseFloat(parts[0])
        const lon = parseFloat(parts[1])
        
        if (isNaN(lat) || isNaN(lon)) {
            alert("Invalid coordinates. Please enter valid numbers.")
            return
        }
        
        if (lat < -90 || lat > 90) {
            alert("Latitude must be between -90 and 90.")
            return
        }
        
        if (lon < -180 || lon > 180) {
            alert("Longitude must be between -180 and 180.")
            return
        }
        
        trackEvent("Go to XY", {
            lat,
            lon
        })
        
        setGoToXYPosition([lat, lon])
        setGoToXYOpen(false)
        setGoToXYInput("")
    }, [goToXYInput])
    
    const handlePointClick = useCallback((lat: number, lon: number) => {
        if (copyCoordinateMode) {
            handleCoordinateCopy(lat, lon)
            return
        }
        
        const now = Date.now()
        if (lastPointClickRef.current && 
            Math.abs(lastPointClickRef.current.lat - lat) < 0.0001 && 
            Math.abs(lastPointClickRef.current.lon - lon) < 0.0001 &&
            now - lastPointClickRef.current.time < 1000) {
            return
        }
        lastPointClickRef.current = { lat, lon, time: now }
        
        if (analysisMode === "point" && compareMode === "points") {
            const newPoint = {
                id: `point_${Date.now()}_${Math.random()}`,
                lat,
                lon
            }
            const pointIndex = selectedPoints.length
            setSelectedPoints(prev => [...prev, newPoint])
            trackEvent("Point added", {
                lat,
                lon,
                point_index: pointIndex,
                total_points: pointIndex + 1
            })
        } else if (analysisMode === "point" && compareMode === "months") {
            setSelectedPoint({ lat, lon })
            trackEvent("Point set", {
                lat,
                lon
            })
        }
    }, [analysisMode, compareMode, selectedPoints.length, copyCoordinateMode, handleCoordinateCopy])
    
    const handleRemovePoint = useCallback((index: number) => {
        const now = Date.now()
        if (lastPointRemoveRef.current && 
            lastPointRemoveRef.current.index === index &&
            now - lastPointRemoveRef.current.time < 1000) {
            return
        }
        lastPointRemoveRef.current = { index, time: now }
        
        setSelectedPoints(prev => {
            const updated = prev.filter((_, i) => i !== index)
            const newLength = updated.length
            
            if (!pointRemoveTrackingRef.current || 
                pointRemoveTrackingRef.current.index !== index ||
                pointRemoveTrackingRef.current.length !== newLength) {
                pointRemoveTrackingRef.current = { index, length: newLength }
                
                setTimeout(() => {
                    trackEvent("Point removed", {
                        point_index: index,
                        total_points: newLength
                    })
                    pointRemoveTrackingRef.current = null
                }, 0)
            }
            
            return updated
        })
    }, [])
    
    const handleMonthChange = useCallback((year: number, month: number) => {
        if (analysisMode === "point" && compareMode === "points") {
            trackEvent("Calendar month changed in Point-Points", {
                current_calendar_month: `${year}-${month}`
            })
        } else if (analysisMode === "area" && compareMode === "areas") {
            trackEvent("Calendar month changed in Area-Areas", {
                current_calendar_month: `${year}-${month}`
            })
        }
        setSelectedYear(year)
        setSelectedMonth(month)
    }, [analysisMode, compareMode])
    
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
        const now = Date.now()
        const boundsKey = `${bounds[0][0]},${bounds[0][1]},${bounds[1][0]},${bounds[1][1]}`
        if (lastAreaAddRef.current && 
            lastAreaAddRef.current.bounds[0][0] === bounds[0][0] &&
            lastAreaAddRef.current.bounds[0][1] === bounds[0][1] &&
            lastAreaAddRef.current.bounds[1][0] === bounds[1][0] &&
            lastAreaAddRef.current.bounds[1][1] === bounds[1][1] &&
            now - lastAreaAddRef.current.time < 1000) {
            return
        }
        lastAreaAddRef.current = { bounds, time: now }
        
        if (analysisMode === "area" && compareMode === "areas") {
            const geometryKey = JSON.stringify(feature?.geometry || bounds)
            const isDuplicate = selectedAreas.some(area => {
                const existingGeometryKey = JSON.stringify(area.geometry?.geometry || area.bounds)
                return existingGeometryKey === geometryKey
            })
            
            if (isDuplicate) {
                return
            }
            
            const areaIndex = selectedAreas.length
            const newArea = {
                id: `area_${Date.now()}_${Math.random()}`,
                geometry: feature,
                bounds: bounds,
                label: `Area ${areaIndex + 1}`,
                boundsSource: 'field' as const,
                indexTileUrl: null,
                rgbTileUrl: null
            }
            setSelectedAreas(prev => [...prev, newArea])
            const totalAreas = areaIndex + 1
            
            setTimeout(() => {
                const now = Date.now()
                if (areaAddTrackingRef.current?.index === areaIndex && 
                    areaAddTrackingRef.current?.total === totalAreas &&
                    areaAddTrackingRef.current?.source === 'field' &&
                    now - (areaAddTrackingRef.current?.time || 0) < 100) {
                    return
                }
                areaAddTrackingRef.current = { index: areaIndex, total: totalAreas, source: 'field', time: now }
                const centerLat = (bounds[0][0] + bounds[1][0]) / 2
                const centerLon = (bounds[0][1] + bounds[1][1]) / 2
                trackEvent("Parcel added", {
                    area_index: areaIndex,
                    total_areas: totalAreas,
                    bounds: bounds,
                    center_lat: centerLat,
                    center_lon: centerLon,
                    geometry_type: feature?.geometry?.type || null,
                    properties: feature?.properties || null
                })
            }, 0)
            setBounds(bounds)
            setBoundsSource('field')
            setSelectedFieldFeature(feature)
            loadAreaNdvi(newArea)
        } else if (analysisMode === "area" && compareMode === "months") {
            const newArea = {
                id: `area_${Date.now()}_${Math.random()}`,
                geometry: feature,
                bounds: bounds,
                label: `Area 1`,
                boundsSource: 'field' as const,
                indexTileUrl: null,
                rgbTileUrl: null
            }
            setSelectedAreas([newArea])
            setTimeout(() => {
                const now = Date.now()
                if (areaAddTrackingRef.current?.index === 0 && 
                    areaAddTrackingRef.current?.total === 1 &&
                    areaAddTrackingRef.current?.source === 'field' &&
                    now - (areaAddTrackingRef.current?.time || 0) < 100) {
                    return
                }
                areaAddTrackingRef.current = { index: 0, total: 1, source: 'field', time: now }
                const centerLat = (bounds[0][0] + bounds[1][0]) / 2
                const centerLon = (bounds[0][1] + bounds[1][1]) / 2
                trackEvent("Parcel set", {
                    area_index: 0,
                    lat: centerLat,
                    lon: centerLon,
                    bounds: bounds,
                    geometry_type: feature?.geometry?.type || null,
                    properties: feature?.properties || null
                })
            }, 0)
            setBounds(bounds)
            setBoundsSource('field')
            setSelectedFieldFeature(feature)
            setFieldSelectionMode(false)
            loadAreaNdvi(newArea)
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
            const now = Date.now()
            if (lastAreaAddRef.current && 
                lastAreaAddRef.current.bounds[0][0] === currentBounds[0][0] &&
                lastAreaAddRef.current.bounds[0][1] === currentBounds[0][1] &&
                lastAreaAddRef.current.bounds[1][0] === currentBounds[1][0] &&
                lastAreaAddRef.current.bounds[1][1] === currentBounds[1][1] &&
                now - lastAreaAddRef.current.time < 1000) {
                finalizeRectangle()
                setBoundsSource('rectangle')
                setSelectedFieldFeature(null)
                if (analysisMode === "area" && compareMode === "areas") {
                    startDrawing()
                }
                return
            }
            lastAreaAddRef.current = { bounds: currentBounds, time: now }
            
            const boundsKey = JSON.stringify(currentBounds)
            const isDuplicate = selectedAreas.some(area => {
                const existingBoundsKey = JSON.stringify(area.bounds)
                return existingBoundsKey === boundsKey && area.boundsSource === 'rectangle'
            })
            
            if (isDuplicate) {
                return
            }
            
            const areaIndex = selectedAreas.length
            const newArea = {
                id: `area_${Date.now()}_${Math.random()}`,
                geometry: null,
                bounds: currentBounds,
                label: `Area ${areaIndex + 1}`,
                boundsSource: 'rectangle' as const,
                indexTileUrl: null,
                rgbTileUrl: null
            }
            setSelectedAreas(prev => [...prev, newArea])
            const totalAreas = areaIndex + 1
            
            setTimeout(() => {
                const now = Date.now()
                if (areaAddTrackingRef.current?.index === areaIndex && 
                    areaAddTrackingRef.current?.total === totalAreas &&
                    areaAddTrackingRef.current?.source === 'rectangle' &&
                    now - (areaAddTrackingRef.current?.time || 0) < 100) {
                    return
                }
                areaAddTrackingRef.current = { index: areaIndex, total: totalAreas, source: 'rectangle', time: now }
                const minLat = currentBounds[0][0]
                const minLng = currentBounds[0][1]
                const maxLat = currentBounds[1][0]
                const maxLng = currentBounds[1][1]
                const centerLat = (minLat + maxLat) / 2
                const centerLon = (minLng + maxLng) / 2
                trackEvent("Rectangle added", {
                    area_index: areaIndex,
                    total_areas: totalAreas,
                    min_lat: minLat,
                    min_lng: minLng,
                    max_lat: maxLat,
                    max_lng: maxLng,
                    center_lat: centerLat,
                    center_lon: centerLon
                })
            }, 0)
            loadAreaNdvi(newArea)
        } else if (analysisMode === "area" && compareMode === "months" && currentBounds) {
            const now = Date.now()
            if (lastAreaAddRef.current && 
                lastAreaAddRef.current.bounds[0][0] === currentBounds[0][0] &&
                lastAreaAddRef.current.bounds[0][1] === currentBounds[0][1] &&
                lastAreaAddRef.current.bounds[1][0] === currentBounds[1][0] &&
                lastAreaAddRef.current.bounds[1][1] === currentBounds[1][1] &&
                now - lastAreaAddRef.current.time < 1000) {
                finalizeRectangle()
                setBoundsSource('rectangle')
                setSelectedFieldFeature(null)
                return
            }
            lastAreaAddRef.current = { bounds: currentBounds, time: now }
            
            const newArea = {
                id: `area_${Date.now()}_${Math.random()}`,
                geometry: null,
                bounds: currentBounds,
                label: `Area 1`,
                boundsSource: 'rectangle' as const,
                indexTileUrl: null,
                rgbTileUrl: null
            }
            setSelectedAreas([newArea])
            setTimeout(() => {
                const now = Date.now()
                if (areaAddTrackingRef.current?.index === 0 && 
                    areaAddTrackingRef.current?.total === 1 &&
                    areaAddTrackingRef.current?.source === 'rectangle' &&
                    now - (areaAddTrackingRef.current?.time || 0) < 100) {
                    return
                }
                areaAddTrackingRef.current = { index: 0, total: 1, source: 'rectangle', time: now }
                const minLat = currentBounds[0][0]
                const minLng = currentBounds[0][1]
                const maxLat = currentBounds[1][0]
                const maxLng = currentBounds[1][1]
                const centerLat = (minLat + maxLat) / 2
                const centerLon = (minLng + maxLng) / 2
                trackEvent("Rectangle set", {
                    area_index: 0,
                    lat: centerLat,
                    lon: centerLon,
                    min_lat: minLat,
                    min_lng: minLng,
                    max_lat: maxLat,
                    max_lng: maxLng
                })
            }, 0)
            loadAreaNdvi(newArea)
        }
        finalizeRectangle()
        setBoundsSource('rectangle')
        setSelectedFieldFeature(null)
        if (analysisMode === "area" && compareMode === "areas") {
            startDrawing()
        }
    }, [finalizeRectangle, analysisMode, compareMode, currentBounds, selectedAreas.length, loadAreaNdvi, startDrawing])
    
    const handleReset = useCallback(() => {
        resetRectangle()
        clearNdvi()
        setSelectedPoints([])
        setSelectedPoint({ lat: null, lon: null })
        setSelectedAreas([])
        setFieldSelectionMode(false)
        setBoundsSource(null)
        setSelectedFieldFeature(null)
        const feature = 
            analysisMode === "point" && compareMode === "points" ? "Point-Points" :
            analysisMode === "point" && compareMode === "months" ? "Point-Months" :
            analysisMode === "area" && compareMode === "areas" ? "Area-Areas" :
            analysisMode === "area" && compareMode === "months" ? "Area-Months" :
            null
        trackEvent("Reset clicked", {
            feature: feature
        })
    }, [resetRectangle, clearNdvi, analysisMode, compareMode])
    
    const handleResetAreaSelection = useCallback(() => {
        const wasSet = selectedAreas.length > 0
        setSelectedAreas([])
        resetRectangle()
        clearNdvi()
        setFieldSelectionMode(false)
        setBoundsSource(null)
        setSelectedFieldFeature(null)
        if (analysisMode === "area" && compareMode === "months" && wasSet) {
            trackEvent("Area unset", {})
        }
        const feature = 
            analysisMode === "point" && compareMode === "points" ? "Point-Points" :
            analysisMode === "point" && compareMode === "months" ? "Point-Months" :
            analysisMode === "area" && compareMode === "areas" ? "Area-Areas" :
            analysisMode === "area" && compareMode === "months" ? "Area-Months" :
            null
        trackEvent("Reset clicked", {
            feature: feature
        })
    }, [resetRectangle, clearNdvi, analysisMode, compareMode, selectedAreas.length])
    
    const handleResetPointSelection = useCallback(() => {
        const wasSet = selectedPoint.lat !== null && selectedPoint.lon !== null
        setSelectedPoint({ lat: null, lon: null })
        clearNdvi()
        if (analysisMode === "point" && compareMode === "months" && wasSet) {
            trackEvent("Point unset", {})
        }
        const feature = 
            analysisMode === "point" && compareMode === "points" ? "Point-Points" :
            analysisMode === "point" && compareMode === "months" ? "Point-Months" :
            analysisMode === "area" && compareMode === "areas" ? "Area-Areas" :
            analysisMode === "area" && compareMode === "months" ? "Area-Months" :
            null
        trackEvent("Reset clicked", {
            feature: feature
        })
    }, [clearNdvi, analysisMode, compareMode, selectedPoint])
    
    const prevIndexRef = useRef(selectedIndex)
    const prevYearRef = useRef(selectedYear)
    const prevMonthRef = useRef(selectedMonth)
    const prevCloudRef = useRef(cloudTolerance)
    const selectedAreasRef = useRef(selectedAreas)
    
    useEffect(() => {
        selectedAreasRef.current = selectedAreas
    }, [selectedAreas])
    
    useEffect(() => {
        if (analysisMode === "area" && (compareMode === "areas" || compareMode === "months") && selectedAreas.length > 0) {
            const indexChanged = prevIndexRef.current !== selectedIndex
            const yearChanged = prevYearRef.current !== selectedYear
            const monthChanged = prevMonthRef.current !== selectedMonth
            const cloudChanged = prevCloudRef.current !== cloudTolerance
            
            if (indexChanged || yearChanged || monthChanged || cloudChanged) {
                setSelectedAreas(prev => {
                    const cleared = prev.map(area => ({ ...area, indexTileUrl: null, rgbTileUrl: null }))
                    selectedAreasRef.current = cleared
                    setTimeout(() => {
                        cleared.filter(area => area.bounds).forEach((area) => {
                            loadAreaNdvi(area)
                        })
                    }, 0)
                    return cleared
                })
            }
            
            prevIndexRef.current = selectedIndex
            prevYearRef.current = selectedYear
            prevMonthRef.current = selectedMonth
            prevCloudRef.current = cloudTolerance
        }
    }, [selectedIndex, selectedYear, selectedMonth, cloudTolerance, analysisMode, compareMode, selectedAreas.length, setSelectedAreas, loadAreaNdvi])
    
    useEffect(() => {
        if (analysisMode === "area" && (compareMode === "areas" || compareMode === "months")) {
            if (isDrawing || selectedAreas.length === 0) {
                return
            }
            
            const areasToLoad = selectedAreasRef.current
            const areasNeedingReload = areasToLoad.filter(area => area.bounds && !area.indexTileUrl)
            
            if (areasNeedingReload.length > 0) {
                areasNeedingReload.forEach((area) => {
                    loadAreaNdvi(area)
                })
            }
        } else if (analysisMode !== "area" && rectangleBounds && overlayType === "INDEX") {
            const geometry = boundsSource === 'field' ? selectedFieldFeature : null
            loadNdviData(rectangleBounds, cloudTolerance, null, null, overlayType, geometry, selectedIndex)
        } else if (analysisMode !== "area" && !rectangleBounds) {
            clearNdvi()
        }
    }, [selectedYear, selectedMonth, cloudTolerance, overlayType, analysisMode, compareMode, isDrawing, rectangleBounds, boundsSource, selectedFieldFeature, selectedIndex, selectedAreas.length, loadAreaNdvi, loadNdviData, clearNdvi])
    
    useEffect(() => {
        document.title = `Wimmera ${selectedIndex}`
    }, [selectedIndex])
    
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
                <ShareButton 
                    onShare={handleShare}
                    feature={
                        analysisMode === "point" && compareMode === "points" ? "Point-Points" :
                        analysisMode === "point" && compareMode === "months" ? "Point-Months" :
                        analysisMode === "area" && compareMode === "areas" ? "Area-Areas" :
                        analysisMode === "area" && compareMode === "months" ? "Area-Months" :
                        undefined
                    }
                    total_objects={
                        analysisMode === "point" 
                            ? (compareMode === "points" ? selectedPoints.length : (selectedPoint.lat !== null ? 1 : 0))
                            : selectedAreas.length
                    }
                />
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
                
                <IndexSelector
                    selectedIndex={selectedIndex}
                    onIndexChange={handleIndexChange}
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
            
            <div style={{ width: "60%", height: "100vh", position: "relative" }}>
                <div style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: 1000,
                    backgroundColor: "white",
                    padding: "5px 10px",
                    borderRadius: "4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px"
                }}>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                            setCopyCoordinateMode(!copyCoordinateMode)
                        }}
                        style={{
                            color: "#0066cc",
                            textDecoration: "none",
                            cursor: "pointer"
                        }}
                    >
                        {copyCoordinateMode ? "Cancel" : "Copy coordinate"}
                    </a>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                            setGoToXYOpen(true)
                        }}
                        style={{
                            color: "#0066cc",
                            textDecoration: "none",
                            cursor: "pointer"
                        }}
                    >
                        Go to XY
                    </a>
                </div>
                {goToXYOpen && (
                    <>
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0,0,0,0.5)",
                                zIndex: 9999
                            }}
                            onClick={() => {
                                setGoToXYOpen(false)
                                setGoToXYInput("")
                            }}
                        />
                        <div
                            style={{
                                position: "fixed",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                backgroundColor: "white",
                                borderRadius: "8px",
                                padding: "20px",
                                zIndex: 10000,
                                boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                                minWidth: "300px"
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                                <h3 style={{ margin: 0 }}>Go to XY</h3>
                                <button
                                    onClick={() => {
                                        setGoToXYOpen(false)
                                        setGoToXYInput("")
                                    }}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        fontSize: "20px",
                                        cursor: "pointer",
                                        padding: "0",
                                        width: "24px",
                                        height: "24px",
                                        lineHeight: "24px"
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <input
                                type="text"
                                value={goToXYInput}
                                onChange={(e) => setGoToXYInput(e.target.value)}
                                placeholder="-36.7319,142.2037"
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    marginBottom: "15px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    boxSizing: "border-box"
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && goToXYInput.trim()) {
                                        handleGoToXY()
                                    }
                                }}
                            />
                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button
                                    onClick={() => {
                                        setGoToXYOpen(false)
                                        setGoToXYInput("")
                                    }}
                                    style={{
                                        padding: "8px 16px",
                                        border: "1px solid #ccc",
                                        borderRadius: "4px",
                                        backgroundColor: "white",
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGoToXY}
                                    disabled={!goToXYInput.trim()}
                                    style={{
                                        padding: "8px 16px",
                                        border: "1px solid #ccc",
                                        borderRadius: "4px",
                                        backgroundColor: goToXYInput.trim() ? "#0066cc" : "#ccc",
                                        color: "white",
                                        cursor: goToXYInput.trim() ? "pointer" : "not-allowed"
                                    }}
                                >
                                    Go
                                </button>
                            </div>
                        </div>
                    </>
                )}
                <MapView
                    isDrawing={isDrawing}
                    rectangleBounds={rectangleBounds}
                    currentBounds={currentBounds}
                    onStart={setStart}
                    onUpdate={updateBounds}
                    onEnd={handleFinalize}
                    indexTileUrl={isImageAvailable() ? indexTileUrl : null}
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
                    selectedIndex={selectedIndex}
                    onPointClick={handlePointClick}
                    fieldSelectionMode={fieldSelectionMode}
                    fieldsData={fieldsData}
                    boundsSource={boundsSource}
                    selectedFieldFeature={selectedFieldFeature}
                    onFieldClick={handleFieldClick}
                    currentZoom={currentZoom}
                    onZoomChange={(zoom: number) => {
                        setCurrentZoom(zoom)
                    }}
                    onMapBoundsChange={(bounds: [[number, number], [number, number]]) => {
                        setMapBounds(bounds)
                    }}
                    initialZoom={restoredZoom}
                    initialBounds={restoredBounds}
                    focusPointIndex={focusPointIndex}
                    focusAreaIndex={focusAreaIndex}
                    copyCoordinateMode={copyCoordinateMode}
                    goToXYPosition={goToXYPosition}
                    onGoToXYComplete={() => setGoToXYPosition(null)}
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
                        onFocusPoint={(index: number) => {
                            setFocusPointIndex(index)
                            setTimeout(() => setFocusPointIndex(null), 100)
                        }}
                        selectedIndex={selectedIndex}
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
                        selectedIndex={selectedIndex}
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
                            const newLength = selectedAreas.length - 1
                            
                            setSelectedAreas(prev => {
                                return prev.filter((_, i) => i !== index)
                            })
                            
                            setTimeout(() => {
                                if (areaRemoveTrackingRef.current?.index === index && 
                                    areaRemoveTrackingRef.current?.length === newLength) {
                                    return
                                }
                                areaRemoveTrackingRef.current = { index, length: newLength }
                                trackEvent("Area removed", {
                                    area_index: index,
                                    total_areas: newLength
                                })
                                areaRemoveTrackingRef.current = null
                            }, 0)
                        }}
                        visibleRange={areasVisibleRange}
                        setVisibleRange={setAreasVisibleRange}
                        yAxisRange={areasYAxisRange}
                        setYAxisRange={setAreasYAxisRange}
                        onShareAreaSnapshots={handleShareAreaSnapshots}
                        areaSnapshotsOpen={areaSnapshotsOpen}
                        setAreaSnapshotsOpen={setAreaSnapshotsOpen}
                        onFocusArea={(index: number) => {
                            setFocusAreaIndex(index)
                            setTimeout(() => setFocusAreaIndex(null), 100)
                        }}
                        selectedIndex={selectedIndex}
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
                        selectedIndex={selectedIndex}
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
