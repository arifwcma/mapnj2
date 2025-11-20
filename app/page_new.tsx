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
import { getColorForIndex } from "@/app/lib/colorUtils"
import { getCurrentMonth } from "@/app/lib/monthUtils"
import useRectangleDraw from "@/app/hooks/useRectangleDraw"
import useNdviData from "@/app/hooks/useNdviData"

export default function Page() {
    const [basemap, setBasemap] = useState("street")
    const [analysisMode, setAnalysisMode] = useState<"point" | "area">("point")
    const [compareMode, setCompareMode] = useState<"points" | "areas" | "months">("points")
    const [cloudTolerance, setCloudTolerance] = useState(30)
    const [selectedPoints, setSelectedPoints] = useState<Array<{ id: string, lat: number, lon: number }>>([])
    const [selectedPoint, setSelectedPoint] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null })
    const [selectedAreas, setSelectedAreas] = useState<Array<{ id: string, geometry: any, bounds: [[number, number], [number, number]], color: string, label: string, boundsSource: 'rectangle' | 'field' }>>([])
    const [fieldSelectionMode, setFieldSelectionMode] = useState(false)
    const [fieldsData, setFieldsData] = useState<any>(null)
    const [boundsSource, setBoundsSource] = useState<'rectangle' | 'field' | null>(null)
    const [selectedFieldFeature, setSelectedFieldFeature] = useState<any>(null)
    const [currentZoom, setCurrentZoom] = useState<number | null>(null)
    const [selectedYear, setSelectedYear] = useState<number | null>(null)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
    
    const current = getCurrentMonth()
    useEffect(() => {
        if (!selectedYear || !selectedMonth) {
            setSelectedYear(current.year)
            setSelectedMonth(current.month)
        }
    }, [])
    
    const {
        isDrawing,
        rectangleBounds,
        currentBounds,
        resetRectangle,
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
        isImageAvailable
    } = useNdviData()
    
    const cloudToleranceRef = useRef(cloudTolerance)
    const sliderDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    
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
        setCompareMode(mode === "point" ? "points" : "areas")
    }, [resetRectangle, clearNdvi])
    
    const handleCompareModeChange = useCallback((mode: "points" | "areas" | "months") => {
        setCompareMode(mode)
        if (mode === "months") {
            if (analysisMode === "point") {
                if (selectedPoints.length > 0) {
                    setSelectedPoint(selectedPoints[0])
                }
                setSelectedPoints([])
            } else {
                if (selectedAreas.length > 0) {
                    setSelectedAreas([selectedAreas[0]])
                }
            }
        }
    }, [analysisMode, selectedPoints, selectedAreas])
    
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
    }, [fieldsData])
    
    const handleCancelFieldSelection = useCallback(() => {
        setFieldSelectionMode(false)
    }, [])
    
    const handleFieldClick = useCallback((bounds: [[number, number], [number, number]], feature: any) => {
        if (analysisMode === "area" && compareMode === "areas") {
            const newArea = {
                id: `area_${Date.now()}_${Math.random()}`,
                geometry: feature,
                bounds: bounds,
                color: getColorForIndex(selectedAreas.length),
                label: `Area ${selectedAreas.length + 1}`,
                boundsSource: 'field' as const
            }
            setSelectedAreas(prev => [...prev, newArea])
            setBounds(bounds)
            setBoundsSource('field')
            setSelectedFieldFeature(feature)
            setFieldSelectionMode(false)
        }
    }, [analysisMode, compareMode, selectedAreas.length, setBounds])
    
    const handleStartDrawing = useCallback(() => {
        setFieldSelectionMode(false)
        setSelectedFieldFeature(null)
        startDrawing()
        setBoundsSource('rectangle')
    }, [startDrawing])
    
    const handleFinalize = useCallback(() => {
        if (analysisMode === "area" && compareMode === "areas" && currentBounds) {
            const newArea = {
                id: `area_${Date.now()}_${Math.random()}`,
                geometry: null,
                bounds: currentBounds,
                color: getColorForIndex(selectedAreas.length),
                label: `Area ${selectedAreas.length + 1}`,
                boundsSource: 'rectangle' as const
            }
            setSelectedAreas(prev => [...prev, newArea])
        }
        finalizeRectangle()
        setBoundsSource('rectangle')
        setSelectedFieldFeature(null)
    }, [finalizeRectangle, analysisMode, compareMode, currentBounds, selectedAreas.length])
    
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
    
    useEffect(() => {
        if (rectangleBounds) {
            const geometry = boundsSource === 'field' ? selectedFieldFeature : null
            loadNdviData(rectangleBounds, cloudTolerance, null, null, overlayType, geometry)
        } else {
            clearNdvi()
        }
    }, [rectangleBounds, cloudTolerance, overlayType, boundsSource, selectedFieldFeature, loadNdviData, clearNdvi])
    
    const isPointClickMode = analysisMode === "point" && compareMode === "points" && rectangleBounds && isImageAvailable()
    const isPointSelectMode = analysisMode === "point" && compareMode === "months" && rectangleBounds && isImageAvailable()
    
    return (
        <div style={{ display: "flex", width: "100%", height: "100vh" }}>
            <div style={{ width: "25.71%", height: "100vh", borderRight: "1px solid #ccc", backgroundColor: "white", overflowY: "auto", padding: "20px" }}>
                <BasemapSelector basemap={basemap} onBasemapChange={setBasemap} />
                <AnalysisModeSelector analysisMode={analysisMode} onAnalysisModeChange={handleAnalysisModeChange} />
                <CompareModeSelector 
                    compareMode={compareMode} 
                    onCompareModeChange={handleCompareModeChange}
                    analysisMode={analysisMode}
                />
                
                {analysisMode === "area" && compareMode === "areas" && (
                    <AreaSelectionPrompt
                        onSelectParcel={handleStartFieldSelection}
                        onDrawRectangle={handleStartDrawing}
                        isSelectionMode={isDrawing || fieldSelectionMode}
                        onCancel={() => {
                            setFieldSelectionMode(false)
                            stopDrawing()
                            resetRectangle()
                            setSelectedFieldFeature(null)
                            setBoundsSource(null)
                        }}
                        isDrawing={isDrawing}
                        fieldSelectionMode={fieldSelectionMode}
                        currentZoom={currentZoom}
                        fieldsData={fieldsData}
                    />
                )}
                
                {analysisMode === "point" && compareMode === "points" && rectangleBounds && (
                    <div style={{ fontSize: "13px", color: "#333", marginBottom: "15px" }}>
                        Click on the map to place a point
                    </div>
                )}
                
                {analysisMode === "point" && compareMode === "months" && rectangleBounds && (
                    <div style={{ fontSize: "13px", color: "#333", marginBottom: "15px" }}>
                        Click to select a point
                    </div>
                )}
                
                {rectangleBounds && (
                    <>
                        <CloudToleranceSlider 
                            cloudTolerance={cloudTolerance}
                            onCloudChange={handleCloudChange}
                            onCloudButtonClick={() => {}}
                            onCloudButtonRelease={() => {}}
                        />
                        <button
                            onClick={handleReset}
                            style={{
                                marginTop: "15px",
                                padding: "8px 16px",
                                fontSize: "13px",
                                cursor: "pointer",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "4px"
                            }}
                        >
                            Reset
                        </button>
                    </>
                )}
            </div>
            
            <div style={{ width: "42.86%", height: "100vh" }}>
                <MapView
                    isDrawing={isDrawing}
                    rectangleBounds={rectangleBounds}
                    currentBounds={currentBounds}
                    onEnd={handleFinalize}
                    ndviTileUrl={isImageAvailable() ? ndviTileUrl : null}
                    rgbTileUrl={isImageAvailable() ? rgbTileUrl : null}
                    overlayType={overlayType}
                    basemap={basemap}
                    isPointClickMode={!!(isPointClickMode || isPointSelectMode)}
                    selectedPoints={selectedPoints}
                    selectedPoint={selectedPoint}
                    selectedAreas={selectedAreas}
                    analysisMode={analysisMode}
                    onPointClick={handlePointClick}
                    fieldSelectionMode={fieldSelectionMode}
                    fieldsData={fieldsData}
                    boundsSource={boundsSource}
                    selectedFieldFeature={selectedFieldFeature}
                    onFieldClick={handleFieldClick}
                    currentZoom={currentZoom}
                    onZoomChange={setCurrentZoom}
                />
            </div>
            
            <div style={{ width: "31.43%", height: "100vh", borderLeft: "1px solid #ccc", backgroundColor: "white", overflowY: "auto", padding: "20px" }}>
                {analysisMode === "point" && compareMode === "points" && selectedPoints.length > 0 && (
                    <PointsModePanel
                        selectedPoints={selectedPoints}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        rectangleBounds={rectangleBounds}
                        cloudTolerance={cloudTolerance}
                        onMonthChange={handleMonthChange}
                        onRemovePoint={handleRemovePoint}
                    />
                )}
                
                {analysisMode === "point" && compareMode === "months" && selectedPoint.lat !== null && selectedPoint.lon !== null && (
                    <PointMonthsModePanel
                        selectedPoint={selectedPoint}
                        rectangleBounds={rectangleBounds}
                        cloudTolerance={cloudTolerance}
                        onMonthChange={handleMonthChange}
                    />
                )}
                
                {analysisMode === "area" && compareMode === "areas" && selectedAreas.length > 0 && (
                    <div>Areas mode panel - to be implemented</div>
                )}
                
                {analysisMode === "area" && compareMode === "months" && selectedAreas.length > 0 && (
                    <div>Area months mode panel - to be implemented</div>
                )}
            </div>
        </div>
    )
}

