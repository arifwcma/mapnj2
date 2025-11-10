"use client"
import { useEffect, useRef, useState } from "react"
import MapView from "@/app/components/MapView"
import useRectangleDraw from "@/app/hooks/useRectangleDraw"
import useNdviData from "@/app/hooks/useNdviData"

export default function Page() {
    const {
        isDrawing,
        rectangleBounds,
        currentBounds,
        startDrawing,
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
        monthYearToSliderValue
    } = useNdviData()

    const debounceTimeoutRef = useRef(null)
    const sliderDebounceTimeoutRef = useRef(null)
    const timeSliderDebounceTimeoutRef = useRef(null)
    const cloudToleranceRef = useRef(cloudTolerance)
    const [localCloudTolerance, setLocalCloudTolerance] = useState(cloudTolerance)
    const [localTimeSliderValue, setLocalTimeSliderValue] = useState(0)

    useEffect(() => {
        setLocalCloudTolerance(cloudTolerance)
        cloudToleranceRef.current = cloudTolerance
    }, [cloudTolerance])

    useEffect(() => {
        if (rectangleBounds) {
            if (selectedYear && selectedMonth) {
                loadNdviData(rectangleBounds, cloudTolerance, selectedYear, selectedMonth)
            } else {
                loadNdviData(rectangleBounds, cloudTolerance)
            }
        } else {
            clearNdvi()
        }
    }, [rectangleBounds, cloudTolerance, selectedYear, selectedMonth, loadNdviData, clearNdvi])

    useEffect(() => {
        if (selectedYear && selectedMonth) {
            const sliderValue = getCurrentSliderValue()
            setLocalTimeSliderValue(sliderValue)
        }
    }, [selectedYear, selectedMonth, getCurrentSliderValue])

    useEffect(() => {
        if (endYear && endMonthNum && !selectedYear && !selectedMonth) {
            const sliderValue = monthYearToSliderValue(endYear, endMonthNum)
            setLocalTimeSliderValue(sliderValue)
        }
    }, [endYear, endMonthNum, selectedYear, selectedMonth])

    const handleButtonClick = () => {
        if (rectangleBounds) {
            resetRectangle()
            clearNdvi()
        } else {
            startDrawing()
        }
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
        const currentValue = getCurrentSliderValue()
        const maxValue = getMaxSliderValue()
        const newValue = Math.max(0, Math.min(maxValue, currentValue + delta))
        setLocalTimeSliderValue(newValue)

        if (timeSliderDebounceTimeoutRef.current) {
            clearTimeout(timeSliderDebounceTimeoutRef.current)
        }

        timeSliderDebounceTimeoutRef.current = setTimeout(() => {
            const { year, month } = sliderValueToMonthYear(newValue)
            updateSelectedMonth(year, month)
        }, 1000)
    }

    const handleTimeButtonRelease = () => {
        if (timeSliderDebounceTimeoutRef.current) {
            clearTimeout(timeSliderDebounceTimeoutRef.current)
        }
        const { year, month } = sliderValueToMonthYear(localTimeSliderValue)
        updateSelectedMonth(year, month)
    }

    const getMonthYearLabel = (sliderValue) => {
        const { year, month } = sliderValueToMonthYear(sliderValue)
        const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        return `${MONTH_NAMES[month - 1]} ${year}`
    }

    return (
        <div>
            {isDrawing ? (
                <span style={{ padding: "10px 0", margin: "10px", fontSize: "16px", display: "inline-block" }}>
                    Click and drag to draw area ...
                </span>
            ) : (
                <div style={{ padding: "10px", margin: "10px" }}>
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
                        {rectangleBounds ? "Reset area of interest" : "Select area of interest"}
                    </button>
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
                                                onMouseUp={handleTimeButtonRelease}
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
                                                    Time: {getMonthYearLabel(localTimeSliderValue)}
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={getMaxSliderValue()}
                                                    value={localTimeSliderValue}
                                                    onChange={(e) => handleTimeChange(parseInt(e.target.value))}
                                                    onMouseUp={handleTimeButtonRelease}
                                                    style={{ width: "200px" }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleTimeButtonClick(1)}
                                                onMouseUp={handleTimeButtonRelease}
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
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
            <MapView
                isDrawing={isDrawing}
                rectangleBounds={rectangleBounds}
                currentBounds={currentBounds}
                onStart={setStart}
                onUpdate={updateBounds}
                onEnd={handleFinalize}
                onReset={resetRectangle}
                ndviTileUrl={isImageAvailable() ? ndviTileUrl : null}
            />
        </div>
    )
}