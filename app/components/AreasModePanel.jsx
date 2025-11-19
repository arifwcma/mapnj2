"use client"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from "chart.js"
import { Line } from "react-chartjs-2"
import MonthDropdown from "./MonthDropdown"
import useAreaDataMap from "@/app/hooks/useAreaDataMap"
import useRequestTracker from "@/app/hooks/useRequestTracker"
import useToast from "@/app/hooks/useToast"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { getSixMonthsBackFrom, getCurrentMonth } from "@/app/lib/monthUtils"
import { formatMonthLabel, getPreviousMonth, getNextMonth, monthKey } from "@/app/lib/dateUtils"
import { MIN_YEAR, MIN_MONTH, TOAST_DURATION, MONTH_NAMES_FULL } from "@/app/lib/config"
import ChartLoadingMessage from "./ChartLoadingMessage"
import AreaSnapshot from "./AreaSnapshot"
import ToastMessage from "./ToastMessage"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function getInitialVisibleRange(selectedYear, selectedMonth) {
    if (!selectedYear || !selectedMonth) {
        return null
    }
    
    const months = getSixMonthsBackFrom(selectedYear, selectedMonth)
    if (months.length === 0) {
        return null
    }
    
    return {
        startMonth: months[0],
        endMonth: months[months.length - 1]
    }
}

function getAllMonthsInRange(startMonth, endMonth) {
    const months = []
    let year = startMonth.year
    let month = startMonth.month
    
    while (year < endMonth.year || (year === endMonth.year && month <= endMonth.month)) {
        if (year < MIN_YEAR || (year === MIN_YEAR && month < MIN_MONTH)) {
            break
        }
        months.push({ year, month })
        
        if (month === 12) {
            year++
            month = 1
        } else {
            month++
        }
    }
    
    return months
}

function buildDisplayDataItem(month, dataMap) {
    const key = monthKey(month.year, month.month)
    const ndvi = dataMap.get(key)
    return {
        label: formatMonthLabel(month.year, month.month),
        ndvi: ndvi !== null && ndvi !== undefined ? ndvi : null,
        year: month.year,
        month: month.month
    }
}

function AreaDataWrapper({ area, index, rectangleBounds, cloudTolerance, requestTracker, onDataMapReady }) {
    const { dataMap, fetchMissingMonths } = useAreaDataMap(area, rectangleBounds, cloudTolerance, `AREA_${index}`, requestTracker)
    const dataMapSizeRef = useRef(0)
    const dataMapRef = useRef({ dataMap, fetchMissingMonths })
    
    useEffect(() => {
        dataMapRef.current = { dataMap, fetchMissingMonths }
    }, [dataMap, fetchMissingMonths])
    
    useEffect(() => {
        const currentSize = dataMap?.size || 0
        if (currentSize !== dataMapSizeRef.current) {
            dataMapSizeRef.current = currentSize
            onDataMapReady(index, { dataMap, fetchMissingMonths })
        }
    }, [index, dataMap?.size, fetchMissingMonths, onDataMapReady, dataMap])
    
    useEffect(() => {
        onDataMapReady(index, { dataMap, fetchMissingMonths })
    }, [index, onDataMapReady])
    
    return null
}

export default function AreasModePanel({ 
    selectedAreas, 
    selectedYear, 
    selectedMonth, 
    rectangleBounds, 
    cloudTolerance,
    onMonthChange,
    onRemoveArea 
}) {
    const requestTracker = useRequestTracker()
    const { toastMessage, toastKey, showToast, hideToast } = useToast()
    const [areaDataMaps, setAreaDataMaps] = useState([])
    const areaDataMapsRef = useRef([])
    const previousDataMapsRef = useRef([])
    const [visibleRange, setVisibleRange] = useState(() => getInitialVisibleRange(selectedYear, selectedMonth))
    const leftArrowDebounceRef = useRef(null)
    const rightArrowDebounceRef = useRef(null)
    const chartRef = useRef(null)
    
    const handleDataMapReady = useCallback((index, dataMap) => {
        setAreaDataMaps(prev => {
            const newMaps = [...prev]
            newMaps[index] = dataMap
            return newMaps
        })
    }, [])
    
    useEffect(() => {
        const newRange = getInitialVisibleRange(selectedYear, selectedMonth)
        setVisibleRange(newRange)
    }, [selectedYear, selectedMonth])
    
    useEffect(() => {
        if (!visibleRange || selectedAreas.length === 0) {
            return
        }
        
        const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        const monthKeys = months.map(m => monthKey(m.year, m.month))
        
        selectedAreas.forEach((area, index) => {
            if (areaDataMaps[index]?.fetchMissingMonths) {
                areaDataMaps[index].fetchMissingMonths(monthKeys)
            }
        })
    }, [visibleRange, selectedAreas, areaDataMaps])
    
    useEffect(() => {
        if (!selectedYear || !selectedMonth || selectedAreas.length === 0 || !visibleRange) {
            return
        }
        
        const currentMonthKey = monthKey(selectedYear, selectedMonth)
        const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        const monthKeys = months.map(m => monthKey(m.year, m.month))
        
        if (!monthKeys.includes(currentMonthKey)) {
            monthKeys.push(currentMonthKey)
        }
        
        selectedAreas.forEach((area, index) => {
            if (areaDataMaps[index]?.fetchMissingMonths) {
                areaDataMaps[index].fetchMissingMonths(monthKeys)
            }
        })
    }, [selectedYear, selectedMonth, selectedAreas, visibleRange, areaDataMaps])
    
    useEffect(() => {
        if (visibleRange && selectedAreas.length > 0 && previousDataMapsRef.current.length > 0) {
            const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
            
            selectedAreas.forEach((area, index) => {
                const currentDataMap = areaDataMaps[index]?.dataMap
                const previousDataMap = previousDataMapsRef.current[index]?.dataMap
                
                if (currentDataMap && previousDataMap) {
                    months.forEach(({ year, month }) => {
                        const key = monthKey(year, month)
                        const currentValue = currentDataMap.get(key)
                        const previousValue = previousDataMap.get(key)
                        
                        if (previousValue === undefined && currentValue === null) {
                            const monthName = MONTH_NAMES_FULL[month - 1]
                            showToast(`No data found for ${year} ${monthName} for this area.\nConsider increasing cloud tolerance.`)
                        }
                    })
                }
            })
        }
        
        previousDataMapsRef.current = areaDataMaps.map(obj => ({
            dataMap: obj?.dataMap ? new Map(obj.dataMap) : null
        }))
    }, [areaDataMaps, visibleRange, selectedAreas, showToast])
    
    const displayData = useMemo(() => {
        if (!visibleRange) {
            return selectedAreas.map(() => [])
        }
        
        const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        return selectedAreas.map((area, index) => {
            const dataMap = areaDataMaps[index]?.dataMap || new Map()
            return months.map(m => buildDisplayDataItem(m, dataMap))
        })
    }, [visibleRange, selectedAreas, areaDataMaps])
    
    const tableData = useMemo(() => {
        if (!selectedYear || !selectedMonth) {
            return selectedAreas.map((area, index) => {
                const centerLat = area.bounds ? (area.bounds[0][0] + area.bounds[1][0]) / 2 : null
                const centerLon = area.bounds ? (area.bounds[0][1] + area.bounds[1][1]) / 2 : null
                return {
                    area,
                    index,
                    averageNdvi: null,
                    currentNdvi: null,
                    centerLat,
                    centerLon
                }
            })
        }
        
        return selectedAreas.map((area, index) => {
            const dataMap = areaDataMaps[index]?.dataMap || new Map()
            const currentMonthKey = monthKey(selectedYear, selectedMonth)
            const currentNdvi = dataMap.get(currentMonthKey)
            
            const centerLat = area.bounds ? (area.bounds[0][0] + area.bounds[1][0]) / 2 : null
            const centerLon = area.bounds ? (area.bounds[0][1] + area.bounds[1][1]) / 2 : null
            
            return {
                area,
                index,
                averageNdvi: currentNdvi !== null && currentNdvi !== undefined ? parseFloat(currentNdvi.toFixed(2)) : null,
                currentNdvi: currentNdvi !== null && currentNdvi !== undefined ? currentNdvi : null,
                centerLat,
                centerLon
            }
        })
    }, [selectedAreas, selectedYear, selectedMonth, areaDataMaps])
    
    const chartData = useMemo(() => {
        if (displayData.length === 0 || displayData[0].length === 0) {
            return { labels: [], datasets: [] }
        }
        
        const labels = displayData[0].map(d => d.label)
        const datasets = selectedAreas.map((area, index) => {
            const values = labels.map(label => {
                const item = displayData[index].find(d => d.label === label)
                return item ? item.ndvi : null
            })
            const color = getColorForIndex(index)
            
            return {
                label: area.label || `Area ${index + 1}`,
                data: values,
                borderColor: color,
                backgroundColor: color.replace("rgb", "rgba").replace(")", ", 0.1)"),
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: color,
                tension: 0.1
            }
        })
        
        return { labels, datasets }
    }, [displayData, selectedAreas])
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: "top"
            },
            tooltip: {
                mode: "index",
                intersect: false
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                min: -1,
                max: 1
            }
        }
    }
    
    const canGoLeft = useCallback(() => {
        if (!visibleRange) return false
        const { year, month } = visibleRange.startMonth
        return year > MIN_YEAR || (year === MIN_YEAR && month > MIN_MONTH)
    }, [visibleRange])
    
    const canGoRight = useCallback(() => {
        if (!visibleRange) return false
        const current = getCurrentMonth()
        const { year, month } = visibleRange.endMonth
        return year < current.year || (year === current.year && month < current.month)
    }, [visibleRange])
    
    const handleLeftArrow = useCallback(() => {
        if (!canGoLeft() || !visibleRange) return
        
        if (leftArrowDebounceRef.current) {
            clearTimeout(leftArrowDebounceRef.current)
        }
        
        leftArrowDebounceRef.current = setTimeout(() => {
            const prev = getPreviousMonth(visibleRange.startMonth.year, visibleRange.startMonth.month)
            setVisibleRange({
                startMonth: prev,
                endMonth: getPreviousMonth(visibleRange.endMonth.year, visibleRange.endMonth.month)
            })
        }, 1000)
    }, [visibleRange, canGoLeft])
    
    const handleRightArrow = useCallback(() => {
        if (!canGoRight() || !visibleRange) return
        
        if (rightArrowDebounceRef.current) {
            clearTimeout(rightArrowDebounceRef.current)
        }
        
        rightArrowDebounceRef.current = setTimeout(() => {
            const nextEnd = getNextMonth(visibleRange.endMonth.year, visibleRange.endMonth.month)
            const current = getCurrentMonth()
            
            if (nextEnd.year > current.year || (nextEnd.year === current.year && nextEnd.month > current.month)) {
                return
            }
            
            setVisibleRange({
                startMonth: getNextMonth(visibleRange.startMonth.year, visibleRange.startMonth.month),
                endMonth: nextEnd
            })
            
            onMonthChange(nextEnd.year, nextEnd.month)
        }, 1000)
    }, [visibleRange, canGoRight, onMonthChange])
    
    const isLoading = requestTracker.pendingCount > 0
    
    return (
        <div>
            {selectedAreas.map((area, index) => (
                <AreaDataWrapper
                    key={area.id}
                    area={area}
                    index={index}
                    rectangleBounds={rectangleBounds}
                    cloudTolerance={cloudTolerance}
                    requestTracker={requestTracker}
                    onDataMapReady={handleDataMapReady}
                />
            ))}
            
            <MonthDropdown 
                selectedYear={selectedYear} 
                selectedMonth={selectedMonth} 
                onMonthChange={onMonthChange} 
            />
            
            {tableData.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "13px" }}>
                    <thead>
                        <tr style={{ borderBottom: "2px solid #ccc" }}>
                            <th style={{ padding: "8px", textAlign: "left" }}>Marker</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Latitude</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Longitude</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>NDVI (avg)</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Snapshot</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Remove</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map(({ area, index, averageNdvi, currentNdvi, centerLat, centerLon }) => (
                            <tr key={area.id} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "8px" }}>
                                    <div style={{
                                        width: "20px",
                                        height: "20px",
                                        border: `2px solid ${getColorForIndex(index)}`,
                                        borderRadius: "50%",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "10px",
                                        fontWeight: "bold",
                                        color: getColorForIndex(index),
                                        backgroundColor: "white"
                                    }}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td style={{ padding: "8px" }}>
                                    {centerLat !== null ? centerLat.toFixed(6) : "N/A"}
                                </td>
                                <td style={{ padding: "8px" }}>
                                    {centerLon !== null ? centerLon.toFixed(6) : "N/A"}
                                </td>
                                <td style={{ padding: "8px" }}>
                                    {averageNdvi !== null ? averageNdvi.toFixed(2) : "N/A"}
                                </td>
                                <td style={{ padding: "8px", verticalAlign: "middle", textAlign: "center" }}>
                                    <AreaSnapshot 
                                        area={area}
                                        rectangleBounds={rectangleBounds}
                                        cloudTolerance={cloudTolerance}
                                        visibleRange={visibleRange}
                                    />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <button
                                        onClick={() => onRemoveArea(index)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            fontSize: "18px",
                                            color: "#dc3545"
                                        }}
                                    >
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            
            {visibleRange && displayData.length > 0 && displayData[0].length > 0 && (
                <>
                    <div style={{ width: "100%", height: "350px", marginTop: "20px" }}>
                        <Line ref={chartRef} data={chartData} options={chartOptions} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", padding: "0 10px" }}>
                        <button 
                            onClick={handleLeftArrow} 
                            disabled={!canGoLeft()}
                            style={{
                                padding: "8px 16px",
                                fontSize: "16px",
                                cursor: canGoLeft() ? "pointer" : "not-allowed",
                                opacity: canGoLeft() ? 1 : 0.5
                            }}
                        >
                            ←
                        </button>
                        <button 
                            onClick={handleRightArrow} 
                            disabled={!canGoRight()}
                            style={{
                                padding: "8px 16px",
                                fontSize: "16px",
                                cursor: canGoRight() ? "pointer" : "not-allowed",
                                opacity: canGoRight() ? 1 : 0.5
                            }}
                        >
                            →
                        </button>
                    </div>
                </>
            )}
            
            <ChartLoadingMessage loading={isLoading} />
            
            {toastMessage && (
                <ToastMessage 
                    key={toastKey}
                    message={toastMessage} 
                    duration={TOAST_DURATION} 
                    onClose={hideToast} 
                />
            )}
        </div>
    )
}

