"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import MapView from "@/app/components/MapView"
import InfoPanel from "@/app/components/InfoPanel"
import PointInfoPanel from "@/app/components/PointInfoPanel"
import BasemapSelector from "@/app/components/BasemapSelector"
import AreaOfInterestControls from "@/app/components/AreaOfInterestControls"
import LoadingMessage from "@/app/components/LoadingMessage"
import OverlayControls from "@/app/components/OverlayControls"
import CloudToleranceSlider from "@/app/components/CloudToleranceSlider"
import TimeSlider from "@/app/components/TimeSlider"
import PointInteractionControls from "@/app/components/PointInteractionControls"
import DataControls from "@/app/components/DataControls"
import useRectangleDraw from "@/app/hooks/useRectangleDraw"
import useNdviData from "@/app/hooks/useNdviData"
import usePointNdvi from "@/app/hooks/usePointNdvi"
import { formatMonthLabelFull } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"

export default function Page() {
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
        endMonth,
        endYear,
        endMonthNum,
        imageCount,
        loading,
        overlayLoading,
        cloudTolerance,
        selectedYear,
        selectedMonth,
        loadNdviData,
        updateCloudTolerance,
        updateSelectedMonth,
        clearNdvi,
        setOverlayType,
        loadOverlayTileOnly,
        isImageAvailable,
        getMaxSliderValue,
        getCurrentSliderValue,
        sliderValueToMonthYear,
        monthYearToSliderValue,
        getCurrentDateRange
    } = useNdviData()

    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const sliderDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const timeSliderDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const cloudToleranceRef = useRef(cloudTolerance)
    const timeSliderValueRef = useRef(0)
    const isInitialLoadRef = useRef(false)
    const justSetPointRef = useRef(false)
    const [localCloudTolerance, setLocalCloudTolerance] = useState(cloudTolerance)
    const [localTimeSliderValue, setLocalTimeSliderValue] = useState(0)
    const [basemap, setBasemap] = useState("street")
    const [selectedPoint, setSelectedPoint] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null })
    const [fieldSelectionMode, setFieldSelectionMode] = useState(false)
    const [fieldsLoading, setFieldsLoading] = useState(false)
    const [fieldsData, setFieldsData] = useState<any>(null)
    const [boundsSource, setBoundsSource] = useState<'rectangle' | 'field' | null>(null)
    const [selectedFieldFeature, setSelectedFieldFeature] = useState<any>(null)
    const [secondPointSelection, setSecondPointSelection] = useState(false)
    const [secondPoint, setSecondPoint] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null })
    const [secondPointLoading, setSecondPointLoading] = useState(false)
    const [isMoveMode, setIsMoveMode] = useState(false)
    const previousOverlayTypeRef = useRef(overlayType)
    const previousRectangleBoundsRef = useRef(rectangleBounds)
    const previousCloudToleranceRef = useRef(cloudTolerance)
    const previousSelectedYearRef = useRef(selectedYear)
    const previousSelectedMonthRef = useRef(selectedMonth)
    const previousBoundsSourceRef = useRef(boundsSource)
    const previousSelectedFieldFeatureRef = useRef(selectedFieldFeature)

    const fetchPointNdvi = useCallback(async (lat: number, lon: number) => {
        if (!rectangleBounds || !selectedYear || !selectedMonth) {
            return null
        }
        
        const dateRange = getCurrentDateRange()
        if (!dateRange) {
            return null
        }
        
        const bboxStr = bboxToString(rectangleBounds)
        
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000)
            
            const response = await fetch(`/api/ndvi/point?lat=${lat}&lon=${lon}&start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloudTolerance}`, {
                signal: controller.signal
            })
            clearTimeout(timeoutId)
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
                const errorMessage = errorData.error || "Failed to get NDVI"
                if (errorMessage.includes("No NDVI value found") || errorMessage.includes("No images found")) {
                    return null
                }
                throw new Error(errorMessage)
            }
            const data = await response.json()
            return data.ndvi
        } catch (error: unknown) {
            if ((error as Error).name !== 'AbortError') {
                const errorMessage = (error as Error).message || ""
                if (!errorMessage.includes("No NDVI value found") && !errorMessage.includes("No images found")) {
                    console.error("Error fetching point NDVI:", error)
                }
            }
            return null
        }
    }, [rectangleBounds, selectedYear, selectedMonth, getCurrentDateRange, cloudTolerance])

    const firstPointNdvi = usePointNdvi(
        selectedPoint.lat !== null && selectedPoint.lon !== null ? selectedPoint : null,
        fetchPointNdvi,
        rectangleBounds,
        selectedYear,
        selectedMonth,
        cloudTolerance,
        isImageAvailable
    )

    const secondPointNdvi = usePointNdvi(
        secondPoint.lat !== null && secondPoint.lon !== null ? secondPoint : null,
        fetchPointNdvi,
        rectangleBounds,
        selectedYear,
        selectedMonth,
        cloudTolerance,
        isImageAvailable
    )

    useEffect(() => {
        setLocalCloudTolerance(cloudTolerance)
        cloudToleranceRef.current = cloudTolerance
    }, [cloudTolerance])

    useEffect(() => {
        if (rectangleBounds) {
            const overlayTypeChanged = previousOverlayTypeRef.current !== overlayType
            const rectangleChanged = previousRectangleBoundsRef.current !== rectangleBounds
            const cloudChanged = previousCloudToleranceRef.current !== cloudTolerance
            const yearChanged = previousSelectedYearRef.current !== selectedYear
            const monthChanged = previousSelectedMonthRef.current !== selectedMonth
            const boundsSourceChanged = previousBoundsSourceRef.current !== boundsSource
            const geometryChanged = previousSelectedFieldFeatureRef.current !== selectedFieldFeature
            
            const isFirstLoad = !previousRectangleBoundsRef.current
            
            if (isFirstLoad) {
                previousRectangleBoundsRef.current = rectangleBounds
                previousCloudToleranceRef.current = cloudTolerance
                previousSelectedYearRef.current = selectedYear
                previousSelectedMonthRef.current = selectedMonth
                previousOverlayTypeRef.current = overlayType
            }
            
            const geometry = boundsSource === 'field' ? selectedFieldFeature : null
            
            if (!selectedYear || !selectedMonth) {
                if (!isInitialLoadRef.current) {
                    isInitialLoadRef.current = true
                    loadNdviData(rectangleBounds, cloudTolerance, null, null, overlayType, geometry)
                }
            } else if (overlayTypeChanged && !rectangleChanged && !cloudChanged && !yearChanged && !monthChanged && !boundsSourceChanged && !geometryChanged && selectedYear && selectedMonth) {
                loadOverlayTileOnly(rectangleBounds, cloudTolerance, selectedYear, selectedMonth, overlayType, geometry)
            } else if ((rectangleChanged || cloudChanged || yearChanged || monthChanged || boundsSourceChanged || geometryChanged) && !isInitialLoadRef.current) {
                loadNdviData(rectangleBounds, cloudTolerance, selectedYear, selectedMonth, overlayType, geometry)
            }
            
            if (isInitialLoadRef.current && selectedYear && selectedMonth) {
                isInitialLoadRef.current = false
            }
            
            previousOverlayTypeRef.current = overlayType
            previousRectangleBoundsRef.current = rectangleBounds
            previousCloudToleranceRef.current = cloudTolerance
            previousSelectedYearRef.current = selectedYear
            previousSelectedMonthRef.current = selectedMonth
            previousBoundsSourceRef.current = boundsSource
            previousSelectedFieldFeatureRef.current = selectedFieldFeature
        } else {
            clearNdvi()
            isInitialLoadRef.current = false
            previousOverlayTypeRef.current = overlayType
            previousRectangleBoundsRef.current = null
            previousCloudToleranceRef.current = cloudTolerance
            previousSelectedYearRef.current = selectedYear
            previousSelectedMonthRef.current = selectedMonth
        }
    }, [rectangleBounds, cloudTolerance, selectedYear, selectedMonth, overlayType, loadNdviData, loadOverlayTileOnly, clearNdvi, boundsSource, selectedFieldFeature])


    useEffect(() => {
        if (selectedYear && selectedMonth) {
            const sliderValue = getCurrentSliderValue()
            if (timeSliderValueRef.current !== sliderValue) {
                timeSliderValueRef.current = sliderValue
                setLocalTimeSliderValue(sliderValue)
            }
        }
    }, [selectedYear, selectedMonth, getCurrentSliderValue])

    useEffect(() => {
        if (endYear && endMonthNum && !selectedYear && !selectedMonth) {
            const sliderValue = monthYearToSliderValue(endYear, endMonthNum)
            timeSliderValueRef.current = sliderValue
            setLocalTimeSliderValue(sliderValue)
        }
    }, [endYear, endMonthNum, selectedYear, selectedMonth, monthYearToSliderValue])

    const handleButtonClick = () => {
        setIsMoveMode(false)
        resetRectangle()
        clearNdvi()
        setSelectedPoint({ lat: null, lon: null })
        setSecondPoint({ lat: null, lon: null })
        setSecondPointSelection(false)
        setSecondPointLoading(false)
        setFieldSelectionMode(false)
        setBoundsSource(null)
        setSelectedFieldFeature(null)
    }

    const handleStartFieldSelection = useCallback(() => {
        setFieldSelectionMode(true)
        setFieldsLoading(true)
        if (fieldsData) {
            setFieldsLoading(false)
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
                setFieldsLoading(false)
            })
            .catch(err => {
                console.error("Error loading fields:", err.message || err)
                setFieldsLoading(false)
                setFieldSelectionMode(false)
            })
    }, [fieldsData])

    const handleCancelFieldSelection = useCallback(() => {
        setFieldSelectionMode(false)
    }, [])

    const handleFieldClick = useCallback((bounds: [[number, number], [number, number]], feature: any) => {
        setBounds(bounds)
        setBoundsSource('field')
        setSelectedFieldFeature(feature)
        setFieldSelectionMode(false)
    }, [setBounds])

    const handleStartDrawing = useCallback(() => {
        setFieldSelectionMode(false)
        setSelectedFieldFeature(null)
        startDrawing()
        setBoundsSource('rectangle')
    }, [startDrawing])

    const handleFinalize = () => {
        finalizeRectangle()
        setBoundsSource('rectangle')
        setSelectedFieldFeature(null)
    }

    const handleCloudChange = (newValue: number) => {
        cloudToleranceRef.current = newValue
        setLocalCloudTolerance(newValue)
        
        if (sliderDebounceTimeoutRef.current) {
            clearTimeout(sliderDebounceTimeoutRef.current)
        }
        
        sliderDebounceTimeoutRef.current = setTimeout(() => {
            updateCloudTolerance(newValue)
        }, 1000)
    }

    const handleCloudButtonClick = (delta: number) => {
        const currentValue = cloudToleranceRef.current
        const newValue = Math.max(0, Math.min(100, currentValue + delta))
        cloudToleranceRef.current = newValue
        setLocalCloudTolerance(newValue)

        if (sliderDebounceTimeoutRef.current) {
            clearTimeout(sliderDebounceTimeoutRef.current)
        }

        sliderDebounceTimeoutRef.current = setTimeout(() => {
            updateCloudTolerance(newValue)
        }, 1000)

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }

        debounceTimeoutRef.current = setTimeout(() => {
            console.log("Cloud tolerance:", newValue)
        }, 1000)
    }

    const handleCloudButtonRelease = () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }
        console.log("Cloud tolerance:", cloudToleranceRef.current)
    }

    const handleTimeChange = (newValue: number) => {
        timeSliderValueRef.current = newValue
        setLocalTimeSliderValue(newValue)
        
        if (timeSliderDebounceTimeoutRef.current) {
            clearTimeout(timeSliderDebounceTimeoutRef.current)
        }
        
        timeSliderDebounceTimeoutRef.current = setTimeout(() => {
            const { year, month } = sliderValueToMonthYear(newValue)
            updateSelectedMonth(year, month)
        }, 1000)
    }

    const handleTimeButtonClick = (delta: number) => {
        const currentValue = timeSliderValueRef.current
        const maxValue = getMaxSliderValue()
        const newValue = Math.max(0, Math.min(maxValue, currentValue + delta))
        timeSliderValueRef.current = newValue
        setLocalTimeSliderValue(newValue)

        if (timeSliderDebounceTimeoutRef.current) {
            clearTimeout(timeSliderDebounceTimeoutRef.current)
        }

        timeSliderDebounceTimeoutRef.current = setTimeout(() => {
            const { year, month } = sliderValueToMonthYear(newValue)
            updateSelectedMonth(year, month)
        }, 1000)
    }

    const getMonthYearLabel = (sliderValue: number) => {
        const { year, month } = sliderValueToMonthYear(sliderValue)
        return formatMonthLabelFull(year, month)
    }

    const handlePointClick = useCallback(async (lat: number, lon: number) => {
        if (isMoveMode) {
            return
        }
        
        if (secondPointSelection) {
            if (!rectangleBounds) return
            
            const bounds = rectangleBounds as [[number, number], [number, number]]
            const [minLat, minLng] = bounds[0]
            const [maxLat, maxLng] = bounds[1]
            
            if (lat < minLat || lat > maxLat || lon < minLng || lon > maxLng) {
                return
            }
            
            setSecondPoint({ lat, lon })
            return
        }
        
        console.log("Point clicked:", lat, lon, { isImageAvailable: isImageAvailable(), rectangleBounds, selectedYear, selectedMonth })
        if (!isImageAvailable() || !rectangleBounds || !selectedYear || !selectedMonth) {
            console.log("Conditions not met")
            return
        }
        
        const bounds = rectangleBounds as [[number, number], [number, number]]
        const [minLat, minLng] = bounds[0]
        const [maxLat, maxLng] = bounds[1]
        
        if (lat < minLat || lat > maxLat || lon < minLng || lon > maxLng) {
            return
        }
        
        justSetPointRef.current = true
        setSelectedPoint({ lat, lon })
        setTimeout(() => {
            justSetPointRef.current = false
        }, 100)
    }, [isImageAvailable, rectangleBounds, selectedYear, selectedMonth, fetchPointNdvi, secondPointSelection, isMoveMode])

    const handleMarkerDragEnd = useCallback(async (lat: number, lon: number, isSecondPoint: boolean = false) => {
        if (!isMoveMode) return
        
        const bounds = rectangleBounds as [[number, number], [number, number]] | null
        if (!bounds) return
        
        const [minLat, minLng] = bounds[0]
        const [maxLat, maxLng] = bounds[1]
        
        if (lat < minLat || lat > maxLat || lon < minLng || lon > maxLng) {
            return
        }
        
        setIsMoveMode(false)
        
        if (isSecondPoint) {
            setSecondPoint({ lat, lon })
        } else {
            justSetPointRef.current = true
            setSelectedPoint({ lat, lon })
            setTimeout(() => {
                justSetPointRef.current = false
            }, 100)
        }
    }, [isMoveMode, rectangleBounds, fetchPointNdvi])

    return (
        <div style={{ display: "flex", width: "100%", height: "100vh" }}>
            <div style={{ width: "25.71%", height: "100vh", borderRight: "1px solid #ccc", backgroundColor: "white", overflowY: "auto", padding: "20px" }}>
                <BasemapSelector basemap={basemap} onBasemapChange={setBasemap} />
                <AreaOfInterestControls 
                    isDrawing={isDrawing}
                    rectangleBounds={rectangleBounds}
                    fieldSelectionMode={fieldSelectionMode}
                    fieldsLoading={fieldsLoading}
                    onStartDrawing={handleStartDrawing}
                    onStartFieldSelection={handleStartFieldSelection}
                    onCancelFieldSelection={handleCancelFieldSelection}
                    onCancelDrawing={stopDrawing}
                    onReset={handleButtonClick}
                />
                {rectangleBounds && (
                    <>
                        <LoadingMessage 
                            loading={loading}
                            overlayLoading={overlayLoading}
                            overlayType={overlayType}
                            selectedYear={selectedYear}
                            selectedMonth={selectedMonth}
                            endMonth={endMonth}
                            cloudTolerance={cloudTolerance}
                        />
                        <OverlayControls 
                            overlayType={overlayType}
                            endMonth={endMonth}
                            imageCount={imageCount}
                            isImageAvailable={isImageAvailable()}
                            onOverlayChange={setOverlayType}
                        />
                        <DataControls endMonth={endMonth} imageCount={imageCount}>
                            <CloudToleranceSlider 
                                cloudTolerance={localCloudTolerance}
                                onCloudChange={handleCloudChange}
                                onCloudButtonClick={handleCloudButtonClick}
                                onCloudButtonRelease={handleCloudButtonRelease}
                            />
                            {selectedYear && selectedMonth && (
                                <TimeSlider 
                                    sliderValue={localTimeSliderValue}
                                    maxValue={getMaxSliderValue()}
                                    label={getMonthYearLabel(localTimeSliderValue)}
                                    onTimeChange={handleTimeChange}
                                    onTimeButtonClick={handleTimeButtonClick}
                                />
                            )}
                            <PointInteractionControls 
                                isImageAvailable={isImageAvailable()}
                                pointLoaded={selectedPoint.lat !== null && selectedPoint.lon !== null && firstPointNdvi.ndvi !== null}
                                secondPointSelection={secondPointSelection}
                                isMoveMode={isMoveMode}
                                secondPoint={secondPoint}
                                onMoveModeClick={() => setIsMoveMode(true)}
                                onCancelMove={() => setIsMoveMode(false)}
                                onCompareClick={() => setSecondPointSelection(true)}
                            />
                        </DataControls>
                    </>
                )}
            </div>
            <div style={{ width: "42.86%", height: "100vh" }}>
                <MapView
                    isDrawing={isDrawing}
                    rectangleBounds={rectangleBounds}
                    currentBounds={currentBounds}
                    onStart={setStart}
                    onUpdate={updateBounds}
                    onEnd={handleFinalize}
                    onReset={resetRectangle}
                    ndviTileUrl={isImageAvailable() ? ndviTileUrl : null}
                    rgbTileUrl={isImageAvailable() ? rgbTileUrl : null}
                    overlayType={overlayType}
                    basemap={basemap}
                    isPointAnalysisMode={isImageAvailable() && !isMoveMode}
                    onPointClick={handlePointClick}
                    selectedPoint={selectedPoint as any}
                    secondPoint={secondPoint as any}
                    isMoveMode={isMoveMode}
                    onMarkerDragEnd={handleMarkerDragEnd}
                    fieldSelectionMode={fieldSelectionMode}
                    fieldsData={fieldsData}
                    fieldsLoading={fieldsLoading}
                    boundsSource={boundsSource}
                    selectedFieldFeature={selectedFieldFeature}
                    onFieldClick={handleFieldClick}
                />
            </div>
            <div style={{ width: "31.43%", height: "100vh", borderLeft: "1px solid #ccc", backgroundColor: "white", overflowY: "auto", padding: "20px" }}>
                <InfoPanel 
                    lat={selectedPoint.lat} 
                    lon={selectedPoint.lon}
                    secondPoint={secondPoint as any}
                />
                {selectedPoint.lat !== null && selectedPoint.lon !== null && (
                    <PointInfoPanel
                        lat={selectedPoint.lat}
                        lon={selectedPoint.lon}
                        ndvi={firstPointNdvi.ndvi}
                        isReloading={loading && (selectedPoint.lat !== null && selectedPoint.lon !== null)}
                        isLoading={firstPointNdvi.isLoading}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        endYear={endYear}
                        endMonthNum={endMonthNum}
                        rectangleBounds={rectangleBounds}
                        cloudTolerance={cloudTolerance}
                        secondPoint={(secondPoint && secondPoint.lat !== null && secondPoint.lon !== null ? secondPoint : undefined) as any}
                        secondPointNdvi={secondPointNdvi.ndvi}
                        secondPointNdviLoading={secondPointNdvi.isLoading}
                        onSecondPointLoadingChange={setSecondPointLoading as any}
                    />
                )}
            </div>
        </div>
    )
}
