"use client"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from "chart.js"
import { Line } from "react-chartjs-2"
import MonthDropdown from "./MonthDropdown"
import usePointDataMap from "@/app/hooks/usePointDataMap"
import useRequestTracker from "@/app/hooks/useRequestTracker"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { getSixMonthsBackFrom, getCurrentMonth } from "@/app/lib/monthUtils"
import { formatMonthLabel, getPreviousMonth, getNextMonth, monthKey } from "@/app/lib/dateUtils"
import { MIN_YEAR, MIN_MONTH } from "@/app/lib/config"
import ChartLoadingMessage from "./ChartLoadingMessage"
import ToastMessage from "./ToastMessage"
import PointSnapshot from "./PointSnapshot"

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

function PointDataWrapper({ point, index, rectangleBounds, cloudTolerance, requestTracker, onDataMapReady }) {
    const { dataMap, fetchMissingMonths } = usePointDataMap(point, rectangleBounds, cloudTolerance, `POINT_${index}`, requestTracker)
    const dataMapSizeRef = useRef(0)
    const dataMapRef = useRef(dataMap)
    
    useEffect(() => {
        dataMapRef.current = dataMap
    }, [dataMap])
    
    useEffect(() => {
        const currentSize = dataMap?.size || 0
        if (currentSize !== dataMapSizeRef.current) {
            console.log(`[PointDataWrapper] DataMap size changed for index ${index}: ${dataMapSizeRef.current} -> ${currentSize}`)
            dataMapSizeRef.current = currentSize
            onDataMapReady(index, { dataMap: dataMapRef.current, fetchMissingMonths })
        }
    }, [index, dataMap?.size, fetchMissingMonths, onDataMapReady])
    
    useEffect(() => {
        onDataMapReady(index, { dataMap: dataMapRef.current, fetchMissingMonths })
    }, [index, onDataMapReady])
    
    return null
}

export default function PointsModePanel({ 
    selectedPoints, 
    selectedYear, 
    selectedMonth, 
    rectangleBounds, 
    cloudTolerance,
    onMonthChange,
    onRemovePoint 
}) {
    const requestTracker = useRequestTracker()
    const [pointDataMaps, setPointDataMaps] = useState([])
    const [visibleRange, setVisibleRange] = useState(() => getInitialVisibleRange(selectedYear, selectedMonth))
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState("")
    const [toastDuration, setToastDuration] = useState(10000)
    const previousPendingCountRef = useRef(0)
    const lastFetchedMonthsRef = useRef(new Set())
    const currentBatchMonthsRef = useRef(new Set())
    const previousSelectedMonthRef = useRef(null)
    const leftArrowDebounceRef = useRef(null)
    const rightArrowDebounceRef = useRef(null)
    const chartRef = useRef(null)
    
    const handleDataMapReady = useCallback((index, dataMapObj) => {
        console.log(`[PointsModePanel] handleDataMapReady called for index ${index}, dataMap size:`, dataMapObj?.dataMap?.size || 0)
        setPointDataMaps(prev => {
            const newMaps = [...prev]
            newMaps[index] = dataMapObj
            console.log(`[PointsModePanel] Updated pointDataMaps[${index}], new size:`, dataMapObj?.dataMap?.size || 0)
            return newMaps
        })
    }, [])
    
    useEffect(() => {
        const newRange = getInitialVisibleRange(selectedYear, selectedMonth)
        setVisibleRange(newRange)
        if (selectedYear && selectedMonth) {
            previousSelectedMonthRef.current = `${selectedYear}-${selectedMonth}`
        }
    }, [selectedYear, selectedMonth])
    
    useEffect(() => {
        if (!visibleRange || selectedPoints.length === 0) {
            return
        }
        
        const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        const monthKeys = months.map(m => monthKey(m.year, m.month))
        lastFetchedMonthsRef.current = new Set(monthKeys)
        currentBatchMonthsRef.current = new Set()
        
        const initialPendingCount = requestTracker.pendingCount
        
        selectedPoints.forEach((point, index) => {
            if (pointDataMaps[index]?.dataMap) {
                const dataMap = pointDataMaps[index].dataMap
                monthKeys.forEach(key => {
                    if (!dataMap.has(key)) {
                        currentBatchMonthsRef.current.add(key)
                        console.log(`[PointsModePanel] Adding ${key} to currentBatchMonthsRef (not in dataMap)`)
                    }
                })
            } else {
                monthKeys.forEach(key => {
                    currentBatchMonthsRef.current.add(key)
                    console.log(`[PointsModePanel] Adding ${key} to currentBatchMonthsRef (no dataMap yet)`)
                })
            }
        })
        
        console.log(`[PointsModePanel] currentBatchMonthsRef after setup:`, Array.from(currentBatchMonthsRef.current))
        
        selectedPoints.forEach((point, index) => {
            if (pointDataMaps[index]?.fetchMissingMonths) {
                pointDataMaps[index].fetchMissingMonths(monthKeys)
            }
        })
    }, [visibleRange, selectedPoints, pointDataMaps, requestTracker.pendingCount])
    
    const displayData = useMemo(() => {
        if (!visibleRange) {
            return selectedPoints.map(() => [])
        }
        
        const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        return selectedPoints.map((point, index) => {
            const dataMap = pointDataMaps[index]?.dataMap || new Map()
            return months.map(m => buildDisplayDataItem(m, dataMap))
        })
    }, [visibleRange, selectedPoints, pointDataMaps])
    
    const tableData = useMemo(() => {
        if (!selectedYear || !selectedMonth) {
            return selectedPoints.map((point, index) => ({
                point,
                index,
                averageNdvi: null,
                currentNdvi: null
            }))
        }
        
        const months = getSixMonthsBackFrom(selectedYear, selectedMonth)
        return selectedPoints.map((point, index) => {
            const dataMap = pointDataMaps[index]?.dataMap || new Map()
            console.log(`[PointsModePanel] tableData for point ${index}, dataMap size:`, dataMap.size, 'months:', months.length)
            const monthValues = months.map(m => {
                const key = monthKey(m.year, m.month)
                const value = dataMap.get(key)
                console.log(`[PointsModePanel] Month ${m.year}-${m.month} (key: ${key}):`, value)
                return value
            }).filter(v => v !== null && v !== undefined)
            console.log(`[PointsModePanel] Filtered monthValues for point ${index}:`, monthValues)
            
            const avg = monthValues.length > 0 
                ? monthValues.reduce((sum, val) => sum + val, 0) / monthValues.length 
                : null
            
            const currentMonthKey = monthKey(selectedYear, selectedMonth)
            const currentNdvi = dataMap.get(currentMonthKey)
            
            return {
                point,
                index,
                averageNdvi: avg !== null ? parseFloat(avg.toFixed(2)) : null,
                currentNdvi: currentNdvi !== null && currentNdvi !== undefined ? currentNdvi : null
            }
        })
    }, [selectedPoints, selectedYear, selectedMonth, pointDataMaps])
    
    const chartData = useMemo(() => {
        if (displayData.length === 0 || displayData[0].length === 0) {
            return { labels: [], datasets: [] }
        }
        
        const labels = displayData[0].map(d => d.label)
        const datasets = selectedPoints.map((point, index) => {
            const values = labels.map(label => {
                const item = displayData[index].find(d => d.label === label)
                return item ? item.ndvi : null
            })
            const color = getColorForIndex(index)
            
            return {
                label: `Point ${index + 1}`,
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
    }, [displayData, selectedPoints])
    
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
        
        setShowToast(false)
        setToastMessage("")
        
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
        
        setShowToast(false)
        setToastMessage("")
        
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
        }, 1000)
    }, [visibleRange, canGoRight])
    
    const isLoading = requestTracker.pendingCount > 0
    
    useEffect(() => {
        const currentPending = requestTracker.pendingCount
        const previousPending = previousPendingCountRef.current
        
        if (previousPending > 0 && currentPending === 0 && selectedPoints.length > 0 && selectedYear && selectedMonth) {
            setTimeout(() => {
                if (requestTracker.pendingCount > 0) {
                    return
                }
                
                setTimeout(() => {
                    const months = getSixMonthsBackFrom(selectedYear, selectedMonth)
                    console.log(`[PointsModePanel] API complete toast - checking months:`, months.map(m => `${m.year}-${m.month}`))
                    let hasNullValues = false
                    let missingKeys = []
                    let checkedMonths = []
                    
                    const allMonthData = []
                    selectedPoints.forEach((point, index) => {
                        const dataMap = pointDataMaps[index]?.dataMap || new Map()
                        const monthData = {}
                        months.forEach(m => {
                            const key = monthKey(m.year, m.month)
                            checkedMonths.push(`${m.year}-${m.month}`)
                            
                            if (!dataMap.has(key)) {
                                missingKeys.push(`${m.year}-${m.month}`)
                                monthData[`${m.year}-${m.month}`] = "MISSING"
                                console.log(`[PointsModePanel] Point ${index}, month ${m.year}-${m.month}: MISSING KEY`)
                                hasNullValues = true
                            } else {
                                const value = dataMap.get(key)
                                monthData[`${m.year}-${m.month}`] = value
                                console.log(`[PointsModePanel] Point ${index}, month ${m.year}-${m.month}: value =`, value)
                                if (value === null || value === undefined) {
                                    hasNullValues = true
                                }
                            }
                        })
                        console.log(`[PointsModePanel] Point ${index} dataMap for visible range:`, monthData)
                        if (index === 0) {
                            Object.keys(monthData).forEach(monthKey => {
                                const value = monthData[monthKey]
                                if (value !== "MISSING" && value !== null && value !== undefined) {
                                    allMonthData.push(`(${monthKey}: ${value.toFixed(2)})`)
                                } else if (value === null || value === undefined) {
                                    allMonthData.push(`(${monthKey}: null)`)
                                } else {
                                    allMonthData.push(`(${monthKey}: MISSING)`)
                                }
                            })
                        }
                    })
                    
                    console.log(`[PointsModePanel] API complete toast - hasNullValues: ${hasNullValues}, missingKeys: ${missingKeys.length}, checkedMonths:`, checkedMonths)
                    
                    const message = hasNullValues
                        ? "All available data loaded.\nSome data is not available. Consider increasing cloud tolerance."
                        : "All data loaded"
                    const duration = hasNullValues ? 10000 : 10000
                    
                    const monthDataStr = allMonthData.join(",")
                    console.log(`[PointsModePanel] SHOWING TOAST - hasNullValues: ${hasNullValues}, message: "${message}" ${monthDataStr}`)
                    setToastMessage(message)
                    setToastDuration(duration)
                    setShowToast(true)
                }, 200)
            }, 100)
        }
        
        previousPendingCountRef.current = currentPending
    }, [requestTracker.pendingCount, selectedPoints, selectedYear, selectedMonth, pointDataMaps])
    
    useEffect(() => {
        setShowToast(false)
        setToastMessage("")
    }, [cloudTolerance])
    
    useEffect(() => {
        const currentMonthKey = selectedYear && selectedMonth ? `${selectedYear}-${selectedMonth}` : null
        const previousMonthKey = previousSelectedMonthRef.current
        
        if (selectedPoints.length > 0 && selectedYear && selectedMonth && requestTracker.pendingCount === 0 && currentMonthKey !== null && currentMonthKey !== previousMonthKey && previousMonthKey !== null) {
            setTimeout(() => {
                if (requestTracker.pendingCount > 0) {
                    return
                }
                
                previousSelectedMonthRef.current = currentMonthKey
                
                const months = getSixMonthsBackFrom(selectedYear, selectedMonth)
                console.log(`[PointsModePanel] Dropdown change toast - checking months:`, months.map(m => `${m.year}-${m.month}`))
                let hasNullValues = false
                
                const allMonthData = []
                selectedPoints.forEach((point, index) => {
                    const dataMap = pointDataMaps[index]?.dataMap || new Map()
                    const monthData = {}
                    months.forEach(m => {
                        const key = monthKey(m.year, m.month)
                        if (!dataMap.has(key)) {
                            monthData[`${m.year}-${m.month}`] = "MISSING"
                            console.log(`[PointsModePanel] Point ${index}, month ${m.year}-${m.month}: MISSING KEY`)
                            hasNullValues = true
                        } else {
                            const value = dataMap.get(key)
                            monthData[`${m.year}-${m.month}`] = value
                            console.log(`[PointsModePanel] Point ${index}, month ${m.year}-${m.month}: value =`, value)
                            if (value === null || value === undefined) {
                                hasNullValues = true
                            }
                        }
                    })
                    console.log(`[PointsModePanel] Point ${index} dataMap for visible range:`, monthData)
                    if (index === 0) {
                        Object.keys(monthData).forEach(monthKey => {
                            const value = monthData[monthKey]
                            if (value !== "MISSING" && value !== null && value !== undefined) {
                                allMonthData.push(`(${monthKey}: ${value.toFixed(2)})`)
                            } else if (value === null || value === undefined) {
                                allMonthData.push(`(${monthKey}: null)`)
                            } else {
                                allMonthData.push(`(${monthKey}: MISSING)`)
                            }
                        })
                    }
                })
                
                console.log(`[PointsModePanel] Dropdown change toast - hasNullValues:`, hasNullValues)
                
                const message = hasNullValues
                    ? "All available data loaded.\nSome data is not available. Consider increasing cloud tolerance."
                    : "All data loaded"
                const duration = 10000
                
                    const monthDataStr = allMonthData.join(",")
                    console.log(`[PointsModePanel] SHOWING TOAST - hasNullValues: ${hasNullValues}, message: "${message}" ${monthDataStr}`)
                    setToastMessage(message)
                    setToastDuration(duration)
                    setShowToast(true)
                }, 200)
            }, 100)
        }
    }, [selectedYear, selectedMonth, selectedPoints, pointDataMaps, requestTracker.pendingCount])
    
    return (
        <div>
            {selectedPoints.map((point, index) => (
                <PointDataWrapper
                    key={point.id}
                    point={point}
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
                onMonthChange={(year, month) => {
                    setShowToast(false)
                    setToastMessage("")
                    onMonthChange(year, month)
                }} 
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
                        {tableData.map(({ point, index, averageNdvi, currentNdvi }) => (
                            <tr key={point.id} style={{ borderBottom: "1px solid #eee" }}>
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
                                <td style={{ padding: "8px" }}>{point.lat.toFixed(6)}</td>
                                <td style={{ padding: "8px" }}>{point.lon.toFixed(6)}</td>
                                <td style={{ padding: "8px" }}>
                                    {averageNdvi !== null ? averageNdvi.toFixed(2) : "N/A"}
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <PointSnapshot ndvi={currentNdvi} size={30} />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <button
                                        onClick={() => onRemovePoint(index)}
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
            
            {showToast && toastMessage && (
                <ToastMessage 
                    message={toastMessage} 
                    onClose={() => {
                        setShowToast(false)
                        setToastMessage("")
                    }} 
                    duration={toastDuration} 
                />
            )}
            <ChartLoadingMessage loading={isLoading} />
        </div>
    )
}

