"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import MapView from "@/app/components/MapView"
import InfoPanel from "@/app/components/InfoPanel"
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
        finalizeRectangle
    } = useRectangleDraw()

    const {
        ndviTileUrl,
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
        isImageAvailable,
        getMaxSliderValue,
        getCurrentSliderValue,
        sliderValueToMonthYear,
        monthYearToSliderValue,
        getCurrentDateRange
    } = useNdviData()

    const debounceTimeoutRef = useRef(null)
    const sliderDebounceTimeoutRef = useRef(null)
    const timeSliderDebounceTimeoutRef = useRef(null)
    const cloudToleranceRef = useRef(cloudTolerance)
    const timeSliderValueRef = useRef(0)
    const isInitialLoadRef = useRef(false)
    const [localCloudTolerance, setLocalCloudTolerance] = useState(cloudTolerance)
    const [localTimeSliderValue, setLocalTimeSliderValue] = useState(0)
    const [basemap, setBasemap] = useState("street")
    const [selectedPoint, setSelectedPoint] = useState({ lat: null, lon: null, ndvi: null })
    const [pointLoading, setPointLoading] = useState(false)
    const pointLoaded = selectedPoint.lat !== null && selectedPoint.lon !== null && selectedPoint.ndvi !== null

    const fetchPointNdvi = useCallback(async (lat, lon) => {
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
        } catch (error) {
            if (error.name !== 'AbortError') {
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
                loadNdviData(rectangleBounds, cloudTolerance)
            } else if (!isInitialLoadRef.current) {
                loadNdviData(rectangleBounds, cloudTolerance, selectedYear, selectedMonth)
            } else {
                isInitialLoadRef.current = false
            }
        } else {
            clearNdvi()
            isInitialLoadRef.current = false
        }
    }, [rectangleBounds, cloudTolerance, selectedYear, selectedMonth, loadNdviData, clearNdvi])

    useEffect(() => {
        if (pointLoaded && !loading && isImageAvailable() && selectedPoint.lat !== null && selectedPoint.lon !== null) {
            const refetchNdvi = async () => {
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
    }

    const handleFinalize = () => {
        finalizeRectangle()
    }

    const handleCloudChange = (newValue) => {
        cloudToleranceRef.current = newValue
        setLocalCloudTolerance(newValue)
        
        if (sliderDebounceTimeoutRef.current) {
            clearTimeout(sliderDebounceTimeoutRef.current)
        }
        
        sliderDebounceTimeoutRef.current = setTimeout(() => {
            updateCloudTolerance(newValue)
        }, 1000)
    }

    const handleCloudButtonClick = (delta) => {
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

    const handleTimeChange = (newValue) => {
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

    const handleTimeButtonClick = (delta) => {
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

    const showInfoPanel = pointLoaded

    const getMonthYearLabel = (sliderValue) => {
        const { year, month } = sliderValueToMonthYear(sliderValue)
        const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        return `${MONTH_NAMES[month - 1]} ${year}`
    }

    const handlePointClick = useCallback(async (lat, lon) => {
        console.log("Point clicked:", lat, lon, { isImageAvailable: isImageAvailable(), rectangleBounds, selectedYear, selectedMonth })
        if (!isImageAvailable() || !rectangleBounds || !selectedYear || !selectedMonth) {
            console.log("Conditions not met")
            return
        }
        
        const [minLat, minLng] = rectangleBounds[0]
        const [maxLat, maxLng] = rectangleBounds[1]
        
        if (lat < minLat || lat > maxLat || lon < minLng || lon > maxLng) {
            return
        }
        
        console.log("Setting loading state")
        setPointLoading(true)
        const ndvi = await fetchPointNdvi(lat, lon)
        if (ndvi !== null) {
            console.log("Setting selected point:", { lat, lon, ndvi })
            setSelectedPoint({ lat, lon, ndvi })
        } else {
            setSelectedPoint({ lat, lon, ndvi: null })
        }
        setPointLoading(false)
    }, [isImageAvailable, rectangleBounds, selectedYear, selectedMonth, fetchPointNdvi])

    return (
        <div>
            <div style={{ padding: "10px", margin: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
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
                <span style={{ padding: "10px 0", margin: "10px", fontSize: "16px", display: "inline-block", color: "red" }}>
                    Click and drag to draw area
                </span>
            ) : (
                <div style={{ padding: "10px", margin: "10px" }}>
                    {rectangleBounds && (
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
                            onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                        >
                            Reset area of interest
                        </button>
                    )}
                    {rectangleBounds && (
                        <>
                            {loading ? (
                                <div style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
                                    Loading NDVI data...
                                </div>
                            ) : endMonth && imageCount !== null ? (
                                !isImageAvailable() ? (
                                    <div style={{ fontSize: "14px", color: "#333", marginBottom: "10px" }}>
                                        No image found for {endMonth}. <span style={{ color: "red" }}>Consider increasing cloud tolerance</span>.
                                    </div>
                                ) : (
                                    <div style={{ fontSize: "14px", color: "#333", marginBottom: "10px" }}>
                                        Average NDVI for {endMonth} (based on {imageCount} image(s))
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
                                    {isImageAvailable() && (
                                        <div style={{ marginTop: "10px", fontSize: "14px", color: "red" }}>
                                            Click a point to analyse
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
            <div style={{ display: "flex", width: "100%" }}>
                <div style={{ width: showInfoPanel ? "66.67%" : "100%" }}>
                    <MapView
                        isDrawing={isDrawing}
                        rectangleBounds={rectangleBounds}
                        currentBounds={currentBounds}
                        onStart={setStart}
                        onUpdate={updateBounds}
                        onEnd={handleFinalize}
                        onReset={resetRectangle}
                        ndviTileUrl={isImageAvailable() ? ndviTileUrl : null}
                        basemap={basemap}
                        isPointAnalysisMode={isImageAvailable()}
                        onPointClick={handlePointClick}
                    />
                </div>
                {showInfoPanel && <InfoPanel lat={selectedPoint.lat} lon={selectedPoint.lon} ndvi={selectedPoint.ndvi} isReloading={loading && pointLoaded} />}
            </div>
        </div>
    )
}
