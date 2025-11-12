"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import MapView from "@/app/components/MapView"
import InfoPanel from "@/app/components/InfoPanel"
import PointInfoPanel from "@/app/components/PointInfoPanel"
import useRectangleDraw from "@/app/hooks/useRectangleDraw"
import useNdviData from "@/app/hooks/useNdviData"

export default function Page() {
    const {
        isDrawing,
        rectangleBounds,
        currentBounds,
        resetRectangle,
        setStart,
        updateBounds,
        finalizeRectangle,
        startDrawing
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
        cloudTolerance,
        selectedYear,
        selectedMonth,
        loadNdviData,
        updateCloudTolerance,
        updateSelectedMonth,
        clearNdvi,
        setOverlayType,
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
    const [selectedPoint, setSelectedPoint] = useState<{ lat: number | null, lon: number | null, ndvi: number | null }>({ lat: null, lon: null, ndvi: null })
    const [pointLoading, setPointLoading] = useState(false)
    const [secondPointSelection, setSecondPointSelection] = useState(false)
    const [secondPoint, setSecondPoint] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null })
    const [secondPointLoading, setSecondPointLoading] = useState(false)
    const pointLoaded = selectedPoint.lat !== null && selectedPoint.lon !== null && selectedPoint.ndvi !== null

    const fetchPointNdvi = useCallback(async (lat: number, lon: number) => {
        if (!rectangleBounds || !selectedYear || !selectedMonth) {
            return null
        }
        
        const dateRange = getCurrentDateRange()
        if (!dateRange) {
            return null
        }
        
        const bboxStr = `${rectangleBounds[0][1]},${rectangleBounds[0][0]},${rectangleBounds[1][1]},${rectangleBounds[1][0]}`
        
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000)
            
            const response = await fetch(`/api/ndvi/point?lat=${lat}&lon=${lon}&start=${dateRange.start}&end=${dateRange.end}&bbox=${bboxStr}&cloud=${cloudTolerance}`, {
                signal: controller.signal
            })
            clearTimeout(timeoutId)
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
                throw new Error(errorData.error || "Failed to get NDVI")
            }
            const data = await response.json()
            return data.ndvi
        } catch (error: unknown) {
            if ((error as Error).name !== 'AbortError') {
                console.error("Error fetching point NDVI:", error)
            }
            return null
        }
    }, [rectangleBounds, selectedYear, selectedMonth, getCurrentDateRange, cloudTolerance])

    useEffect(() => {
        setLocalCloudTolerance(cloudTolerance)
        cloudToleranceRef.current = cloudTolerance
    }, [cloudTolerance])

    useEffect(() => {
        if (rectangleBounds) {
            if (!selectedYear || !selectedMonth) {
                isInitialLoadRef.current = true
                loadNdviData(rectangleBounds, cloudTolerance, null, null, overlayType)
            } else if (!isInitialLoadRef.current) {
                loadNdviData(rectangleBounds, cloudTolerance, selectedYear, selectedMonth, overlayType)
            } else {
                isInitialLoadRef.current = false
            }
        } else {
            clearNdvi()
            isInitialLoadRef.current = false
        }
    }, [rectangleBounds, cloudTolerance, selectedYear, selectedMonth, overlayType, loadNdviData, clearNdvi])

    useEffect(() => {
        if (pointLoaded && !loading && isImageAvailable() && selectedPoint.lat !== null && selectedPoint.lon !== null) {
            if (justSetPointRef.current) {
                return
            }
            const refetchNdvi = async () => {
                if (selectedPoint.lat === null || selectedPoint.lon === null) return
                const ndvi = await fetchPointNdvi(selectedPoint.lat, selectedPoint.lon)
                if (ndvi !== null) {
                    setSelectedPoint(prev => ({ ...prev, ndvi }))
                } else {
                    setSelectedPoint(prev => ({ ...prev, ndvi: null }))
                }
            }
            refetchNdvi()
        }
    }, [loading, pointLoaded, isImageAvailable, selectedPoint.lat, selectedPoint.lon, fetchPointNdvi])

    useEffect(() => {
        if (selectedPoint.lat !== null && selectedPoint.lon !== null && !loading && isImageAvailable() && rectangleBounds && selectedYear && selectedMonth) {
            if (justSetPointRef.current) {
                return
            }
            const refetchNdvi = async () => {
                if (selectedPoint.lat === null || selectedPoint.lon === null) return
                setPointLoading(true)
                const ndvi = await fetchPointNdvi(selectedPoint.lat, selectedPoint.lon)
                if (ndvi !== null) {
                    setSelectedPoint(prev => ({ ...prev, ndvi }))
                } else {
                    setSelectedPoint(prev => ({ ...prev, ndvi: null }))
                }
                setPointLoading(false)
            }
            refetchNdvi()
        }
    }, [cloudTolerance, selectedYear, selectedMonth, isImageAvailable, selectedPoint.lat, selectedPoint.lon, rectangleBounds, loading, fetchPointNdvi])

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
        resetRectangle()
        clearNdvi()
        setSelectedPoint({ lat: null, lon: null, ndvi: null })
        setSecondPoint({ lat: null, lon: null })
        setSecondPointSelection(false)
        setSecondPointLoading(false)
    }

    const handleFinalize = () => {
        finalizeRectangle()
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
        const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        return `${MONTH_NAMES[month - 1]} ${year}`
    }

    const handlePointClick = useCallback(async (lat: number, lon: number) => {
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
        
        console.log("Setting loading state")
        setPointLoading(true)
        justSetPointRef.current = true
        setSelectedPoint({ lat, lon, ndvi: null })
        const ndvi = await fetchPointNdvi(lat, lon)
        if (ndvi !== null) {
            console.log("Setting selected point:", { lat, lon, ndvi })
            setSelectedPoint({ lat, lon, ndvi })
        } else {
            setSelectedPoint({ lat, lon, ndvi: null })
        }
        setPointLoading(false)
        setTimeout(() => {
            justSetPointRef.current = false
        }, 100)
    }, [isImageAvailable, rectangleBounds, selectedYear, selectedMonth, fetchPointNdvi, secondPointSelection])

    return (
        <div style={{ display: "flex", width: "100%", height: "100vh" }}>
            <div style={{ width: "66.67%", height: "100vh" }}>
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
                    isPointAnalysisMode={isImageAvailable()}
                    onPointClick={handlePointClick}
                    selectedPoint={selectedPoint as any}
                    secondPoint={secondPoint as any}
                />
            </div>
            <div style={{ width: "33.33%", height: "100vh", display: "flex", flexDirection: "column", borderLeft: "1px solid #ccc", backgroundColor: "white" }}>
                <div style={{ padding: "20px", overflowY: "auto", flex: "1 1 auto" }}>
                    <div style={{ padding: "10px 0", marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>Basemap:</span>
                        <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                            <input
                                type="radio"
                                name="basemap"
                                value="street"
                                checked={basemap === "street"}
                                onChange={(e) => setBasemap(e.target.value)}
                            />
                            <span>Street</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                            <input
                                type="radio"
                                name="basemap"
                                value="satellite"
                                checked={basemap === "satellite"}
                                onChange={(e) => setBasemap(e.target.value)}
                            />
                            <span>Satellite</span>
                        </label>
                    </div>
                    {isDrawing ? (
                        <div style={{ padding: "10px 0", fontSize: "16px", color: "red" }}>
                            Click and drag to draw area
                        </div>
                    ) : (
                        <>
                            {!rectangleBounds && (
                                <button
                                    onClick={startDrawing}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        padding: "10px 0",
                                        margin: "0 0 10px 0",
                                        cursor: "pointer",
                                        fontSize: "16px",
                                        color: "#0066cc",
                                        textDecoration: "none",
                                        fontFamily: "inherit",
                                        display: "block"
                                    }}
                                    onMouseEnter={(e) => (e.target as HTMLElement).style.textDecoration = "underline"}
                                    onMouseLeave={(e) => (e.target as HTMLElement).style.textDecoration = "none"}
                                >
                                    Select area of interest
                                </button>
                            )}
                            {rectangleBounds && (
                                <>
                                    <button
                                        onClick={handleButtonClick}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            padding: "10px 0",
                                            margin: "0 0 10px 0",
                                            cursor: "pointer",
                                            fontSize: "16px",
                                            color: "#0066cc",
                                            textDecoration: "none",
                                            fontFamily: "inherit",
                                            display: "block"
                                        }}
                                        onMouseEnter={(e) => (e.target as HTMLElement).style.textDecoration = "underline"}
                                        onMouseLeave={(e) => (e.target as HTMLElement).style.textDecoration = "none"}
                                    >
                                        Reset area of interest
                                    </button>
                                    {loading ? (
                                        <div style={{
                                            fontSize: "14px",
                                            color: "#333",
                                            backgroundColor: "#f0f8ff",
                                            border: "1px solid #b3d9ff",
                                            borderRadius: "4px",
                                            padding: "10px 15px",
                                            marginBottom: "15px",
                                            textAlign: "center",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px"
                                        }}>
                                            <style>{`
                                                @keyframes spin {
                                                    0% { transform: rotate(0deg); }
                                                    100% { transform: rotate(360deg); }
                                                }
                                            `}</style>
                                            <div style={{
                                                display: "inline-block",
                                                width: "14px",
                                                height: "14px",
                                                border: "2px solid #b3d9ff",
                                                borderTop: "2px solid #0066cc",
                                                borderRadius: "50%",
                                                animation: "spin 1s linear infinite"
                                            }}></div>
                                            <span>
                                                {(() => {
                                                    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                                                    const displayMonth = selectedYear && selectedMonth 
                                                        ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                                                        : endMonth
                                                    const overlayTypeText = overlayType === "RGB" ? "RGB" : "NDVI"
                                                    return displayMonth ? (
                                                        <>Loading {overlayTypeText} data for <strong>{displayMonth}</strong> (less than <strong>{cloudTolerance}%</strong> cloud)...</>
                                                    ) : (
                                                        <>Loading {overlayTypeText} data ...</>
                                                    )
                                                })()}
                                            </span>
                                        </div>
                                    ) : endMonth && imageCount !== null ? (
                                        !isImageAvailable() ? (
                                            <div style={{
                                                fontSize: "14px",
                                                color: "#333",
                                                backgroundColor: "#f0f8ff",
                                                border: "1px solid #b3d9ff",
                                                borderRadius: "4px",
                                                padding: "10px 15px",
                                                marginBottom: "15px",
                                                textAlign: "center"
                                            }}>
                                                <div>No image found for {endMonth}.</div>
                                                <div style={{ marginTop: "5px" }}><span style={{ color: "#d32f2f" }}>Consider increasing cloud tolerance</span>.</div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: "14px", color: "#333", marginBottom: "10px" }}>
                                                <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "15px" }}>
                                                    <span>Overlay:</span>
                                                    <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                                                        <input
                                                            type="radio"
                                                            name="overlay"
                                                            value="NDVI"
                                                            checked={overlayType === "NDVI"}
                                                            onChange={() => setOverlayType("NDVI")}
                                                        />
                                                        <span>NDVI</span>
                                                    </label>
                                                    <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                                                        <input
                                                            type="radio"
                                                            name="overlay"
                                                            value="RGB"
                                                            checked={overlayType === "RGB"}
                                                            onChange={() => setOverlayType("RGB")}
                                                        />
                                                        <span>RGB</span>
                                                    </label>
                                                </div>
                                                <div>{overlayType} for <strong>{endMonth}</strong></div>
                                                <div>Based on <strong>{imageCount}</strong> image(s)</div>
                                            </div>
                                        )
                                    ) : null}
                                    {!loading && endMonth && imageCount !== null && (
                                        <>
                                            <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                                                <button
                                                    onClick={() => handleCloudButtonClick(-1)}
                                                    onMouseUp={handleCloudButtonRelease}
                                                    disabled={localCloudTolerance === 0}
                                                    style={{
                                                        width: "30px",
                                                        height: "30px",
                                                        fontSize: "18px",
                                                        cursor: localCloudTolerance === 0 ? "not-allowed" : "pointer",
                                                        opacity: localCloudTolerance === 0 ? 0.5 : 1,
                                                        border: "1px solid #ccc",
                                                        borderRadius: "4px",
                                                        background: "white"
                                                    }}
                                                >
                                                    -
                                                </button>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                                    <label style={{ fontSize: "14px", display: "block" }}>
                                                        Cloud tolerance (%): {localCloudTolerance}
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={localCloudTolerance}
                                                        onChange={(e) => handleCloudChange(parseInt(e.target.value))}
                                                        onMouseUp={handleCloudButtonRelease}
                                                        style={{ width: "200px" }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleCloudButtonClick(1)}
                                                    onMouseUp={handleCloudButtonRelease}
                                                    disabled={localCloudTolerance === 100}
                                                    style={{
                                                        width: "30px",
                                                        height: "30px",
                                                        fontSize: "18px",
                                                        cursor: localCloudTolerance === 100 ? "not-allowed" : "pointer",
                                                        opacity: localCloudTolerance === 100 ? 0.5 : 1,
                                                        border: "1px solid #ccc",
                                                        borderRadius: "4px",
                                                        background: "white"
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            {selectedYear && selectedMonth && (
                                                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <button
                                                        onClick={() => handleTimeButtonClick(-1)}
                                                        disabled={localTimeSliderValue === 0}
                                                        style={{
                                                            width: "30px",
                                                            height: "30px",
                                                            fontSize: "18px",
                                                            cursor: localTimeSliderValue === 0 ? "not-allowed" : "pointer",
                                                            opacity: localTimeSliderValue === 0 ? 0.5 : 1,
                                                            border: "1px solid #ccc",
                                                            borderRadius: "4px",
                                                            background: "white"
                                                        }}
                                                    >
                                                        -
                                                    </button>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                                        <label style={{ fontSize: "14px", display: "block" }}>
                                                            {getMonthYearLabel(localTimeSliderValue)}
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={getMaxSliderValue()}
                                                            value={localTimeSliderValue}
                                                            onChange={(e) => {
                                                                const newValue = parseInt(e.target.value)
                                                                handleTimeChange(newValue)
                                                            }}
                                                            style={{ width: "200px" }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleTimeButtonClick(1)}
                                                        disabled={localTimeSliderValue >= getMaxSliderValue()}
                                                        style={{
                                                            width: "30px",
                                                            height: "30px",
                                                            fontSize: "18px",
                                                            cursor: localTimeSliderValue >= getMaxSliderValue() ? "not-allowed" : "pointer",
                                                            opacity: localTimeSliderValue >= getMaxSliderValue() ? 0.5 : 1,
                                                            border: "1px solid #ccc",
                                                            borderRadius: "4px",
                                                            background: "white"
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}
                                            {isImageAvailable() && !secondPointSelection && (
                                                <>
                                                    <div style={{ marginTop: "10px", fontSize: "14px", color: "red" }}>
                                                        Click a point to analyse
                                                    </div>
                                                    {pointLoaded && (
                                                        <button
                                                            onClick={() => setSecondPointSelection(true)}
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                padding: "10px 0",
                                                                margin: "10px 0 0 0",
                                                                cursor: "pointer",
                                                                fontSize: "16px",
                                                                color: "#0066cc",
                                                                textDecoration: "none",
                                                                fontFamily: "inherit",
                                                                display: "block"
                                                            }}
                                                            onMouseEnter={(e) => (e.target as HTMLElement).style.textDecoration = "underline"}
                                                            onMouseLeave={(e) => (e.target as HTMLElement).style.textDecoration = "none"}
                                                        >
                                                            Compare with another point
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {isImageAvailable() && secondPointSelection && (
                                                <div>
                                                    <div style={{ marginTop: "10px", fontSize: "14px", color: secondPoint.lat !== null && secondPoint.lon !== null ? "inherit" : "red", display: "flex", alignItems: "center", gap: "5px" }}>
                                                        {secondPoint.lat !== null && secondPoint.lon !== null ? (
                                                            <>
                                                                <img 
                                                                    src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" 
                                                                    alt="Red marker" 
                                                                    style={{ width: "20px", height: "32px" }}
                                                                />
                                                                <span>: {secondPoint.lat!.toFixed(6)},{secondPoint.lon!.toFixed(6)}</span>
                                                            </>
                                                        ) : (
                                                            <>Click to choose the second point</>
                                                        )}
                                                    </div>
                                                    {secondPoint.lat !== null && secondPoint.lon !== null && secondPointLoading && (
                                                        <div style={{
                                                            marginTop: "10px",
                                                            fontSize: "14px",
                                                            color: "#333",
                                                            backgroundColor: "#f0f8ff",
                                                            border: "1px solid #b3d9ff",
                                                            borderRadius: "4px",
                                                            padding: "10px 15px",
                                                            textAlign: "center",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: "8px"
                                                        }}>
                                                            <div style={{
                                                                display: "inline-block",
                                                                width: "14px",
                                                                height: "14px",
                                                                border: "2px solid #b3d9ff",
                                                                borderTop: "2px solid #0066cc",
                                                                borderRadius: "50%",
                                                                animation: "spin 1s linear infinite"
                                                            }}></div>
                                                            <span>Loading second point on the chart ...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
                <div style={{ borderTop: "1px solid #ccc", padding: "20px", flex: "0 0 auto" }}>
                    <InfoPanel 
                        lat={selectedPoint.lat} 
                        lon={selectedPoint.lon}
                        ndvi={selectedPoint.ndvi}
                        pointInfoPanel={
                            (selectedPoint.lat !== null && selectedPoint.lon !== null ? (
                                <PointInfoPanel
                                    lat={selectedPoint.lat}
                                    lon={selectedPoint.lon}
                                    ndvi={selectedPoint.ndvi}
                                    isReloading={loading && pointLoaded}
                                    isLoading={pointLoading}
                                    selectedYear={selectedYear}
                                    selectedMonth={selectedMonth}
                                    endYear={endYear}
                                    endMonthNum={endMonthNum}
                                    rectangleBounds={rectangleBounds}
                                    cloudTolerance={cloudTolerance}
                                    secondPoint={(secondPoint && secondPoint.lat !== null && secondPoint.lon !== null ? secondPoint : undefined) as any}
                                    onSecondPointLoadingChange={setSecondPointLoading as any}
                                />
                            ) : undefined) as any
                        }
                    />
                </div>
            </div>
        </div>
    )
}
