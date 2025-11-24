"use client"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Line } from "react-chartjs-2"
import MonthDropdown from "./MonthDropdown"
import usePointDataMap from "@/app/hooks/usePointDataMap"
import useRequestTracker from "@/app/hooks/useRequestTracker"
import useToast from "@/app/hooks/useToast"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { monthKey } from "@/app/lib/dateUtils"
import { TOAST_DURATION, MONTH_NAMES_FULL } from "@/app/lib/config"
import { getAllMonthsInRange } from "@/app/lib/rangeUtils"
import { buildDisplayDataItem, registerChartJS } from "@/app/lib/chartUtils"
import { MESSAGES } from "@/app/lib/messageConstants"
import { isMonthInFuture, shouldUseMODISForMonth } from "@/app/lib/monthUtils"
import useVisibleRange from "@/app/hooks/useVisibleRange"
import ChartLoadingMessage from "./ChartLoadingMessage"
import ChartNavigation from "./ChartNavigation"
import PointSnapshot from "./PointSnapshot"
import ComparePointSnapshots from "./ComparePointSnapshots"
import NdviLegend from "./NdviLegend"
import ToastMessage from "./ToastMessage"

registerChartJS()

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
    onRemovePoint,
    visibleRange,
    setVisibleRange,
    yAxisRange,
    setYAxisRange,
    onSharePointSnapshots,
    pointSnapshotsOpen,
    setPointSnapshotsOpen,
    onFocusPoint
}) {
    const requestTracker = useRequestTracker()
    const { toastMessage, toastKey, showToast, hideToast } = useToast()
    const [pointDataMaps, setPointDataMaps] = useState([])
    const pointDataMapsRef = useRef([])
    const previousDataMapsRef = useRef([])
    const chartRef = useRef(null)
    const [hiddenDatasets, setHiddenDatasets] = useState(new Set())
    
    const {
        visibleRange: effectiveVisibleRange,
        setVisibleRange: effectiveSetVisibleRange,
        updateRangeForMonth,
        canGoLeft,
        canGoRight,
        handleLeftArrow,
        handleRightArrow
    } = useVisibleRange(selectedYear, selectedMonth, visibleRange, setVisibleRange)
    
    useEffect(() => {
        pointDataMapsRef.current = pointDataMaps
    }, [pointDataMaps])
    
    useEffect(() => {
        setHiddenDatasets(new Set())
    }, [selectedPoints.length])
    
    const handleDataMapReady = useCallback((index, dataMapObj) => {
        setPointDataMaps(prev => {
            const newMaps = [...prev]
            newMaps[index] = dataMapObj
            return newMaps
        })
    }, [])
    
    useEffect(() => {
        if (!effectiveVisibleRange) {
            updateRangeForMonth(selectedYear, selectedMonth)
        } else {
            const startYear = effectiveVisibleRange.startMonth.year
            const endYear = effectiveVisibleRange.endMonth.year
            
            if (selectedYear !== startYear && selectedYear !== endYear && 
                !(startYear < selectedYear && selectedYear < endYear)) {
                updateRangeForMonth(selectedYear, selectedMonth)
            }
        }
    }, [selectedYear, selectedMonth, updateRangeForMonth, effectiveVisibleRange])
    
    useEffect(() => {
        if (!effectiveVisibleRange || selectedPoints.length === 0) {
            return
        }
        
        const months = getAllMonthsInRange(effectiveVisibleRange.startMonth, effectiveVisibleRange.endMonth)
        const monthKeys = months.map(m => monthKey(m.year, m.month))
        
        selectedPoints.forEach((point, index) => {
            if (pointDataMaps[index]?.fetchMissingMonths) {
                pointDataMaps[index].fetchMissingMonths(monthKeys)
            }
        })
    }, [effectiveVisibleRange, selectedPoints, pointDataMaps])
    
    useEffect(() => {
        if (!selectedYear || !selectedMonth || selectedPoints.length === 0) {
            return
        }
        
        const currentMonthKey = monthKey(selectedYear, selectedMonth)
        const monthKeys = [currentMonthKey]
        
        if (effectiveVisibleRange) {
            const months = getAllMonthsInRange(effectiveVisibleRange.startMonth, effectiveVisibleRange.endMonth)
            const visibleMonthKeys = months.map(m => monthKey(m.year, m.month))
            visibleMonthKeys.forEach(key => {
                if (!monthKeys.includes(key)) {
                    monthKeys.push(key)
                }
            })
        }
        
        selectedPoints.forEach((point, index) => {
            if (pointDataMaps[index]?.fetchMissingMonths) {
                pointDataMaps[index].fetchMissingMonths(monthKeys)
            }
        })
    }, [selectedYear, selectedMonth, selectedPoints, effectiveVisibleRange, pointDataMaps])
    
    useEffect(() => {
        if (effectiveVisibleRange && selectedPoints.length > 0 && previousDataMapsRef.current.length > 0) {
            const months = getAllMonthsInRange(effectiveVisibleRange.startMonth, effectiveVisibleRange.endMonth)
            
            selectedPoints.forEach((point, index) => {
                const currentDataMap = pointDataMaps[index]?.dataMap
                const previousDataMap = previousDataMapsRef.current[index]?.dataMap
                
                if (currentDataMap && previousDataMap) {
                    months.forEach(({ year, month }) => {
                        const key = monthKey(year, month)
                        const currentValue = currentDataMap.get(key)
                        const previousValue = previousDataMap.get(key)
                        
                        if (previousValue === undefined && currentValue === null) {
                            const monthName = MONTH_NAMES_FULL[month - 1]
                            const isFuture = isMonthInFuture(year, month)
                            const usesMODIS = shouldUseMODISForMonth(year, month)
                            const suffix = (isFuture || usesMODIS) ? "" : MESSAGES.NO_DATA_FOUND_SUFFIX
                            showToast(`${MESSAGES.NO_DATA_FOUND_PREFIX} ${year} ${monthName} for `, index, null, suffix)
                        }
                    })
                }
            })
        }
        
        previousDataMapsRef.current = pointDataMaps.map(obj => ({
            dataMap: obj?.dataMap ? new Map(obj.dataMap) : null
        }))
    }, [pointDataMaps, effectiveVisibleRange, selectedPoints, showToast])
    
    const displayData = useMemo(() => {
        if (!effectiveVisibleRange) {
            return selectedPoints.map(() => [])
        }
        
        const months = getAllMonthsInRange(effectiveVisibleRange.startMonth, effectiveVisibleRange.endMonth)
        return selectedPoints.map((point, index) => {
            const dataMap = pointDataMaps[index]?.dataMap || new Map()
            return months.map(m => buildDisplayDataItem(m, dataMap))
        })
    }, [effectiveVisibleRange, selectedPoints, pointDataMaps])
    
    const tableData = useMemo(() => {
        if (!selectedYear || !selectedMonth || !effectiveVisibleRange) {
            return selectedPoints.map((point, index) => ({
                point,
                index,
                averageNdvi: null,
                currentNdvi: null
            }))
        }
        
        const months = getAllMonthsInRange(effectiveVisibleRange.startMonth, effectiveVisibleRange.endMonth)
        return selectedPoints.map((point, index) => {
            const dataMap = pointDataMaps[index]?.dataMap || new Map()
            const monthValues = months.map(m => {
                const key = monthKey(m.year, m.month)
                const value = dataMap.get(key)
                return value
            }).filter(v => v !== null && v !== undefined)
            
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
    }, [selectedPoints, selectedYear, selectedMonth, pointDataMaps, effectiveVisibleRange])
    
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
    
    
    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: "index",
                intersect: false
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                min: yAxisRange === "0-1" ? 0 : -1,
                max: 1
            }
        }
    }), [yAxisRange])
    
    const isLoading = requestTracker.pendingCount > 0
    
    
    
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
                onMonthChange={onMonthChange} 
            />
            
            {selectedPoints.length > 0 && (
                <ComparePointSnapshots
                    selectedPoints={selectedPoints}
                    cloudTolerance={cloudTolerance}
                    visibleRange={effectiveVisibleRange}
                    onShare={onSharePointSnapshots}
                    isOpen={pointSnapshotsOpen}
                    setIsOpen={setPointSnapshotsOpen}
                />
            )}
            
            {tableData.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
                    <thead>
                        <tr style={{ borderBottom: "2px solid #ccc" }}>
                            <th style={{ padding: "8px", textAlign: "left" }}>Marker</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>NDVI (avg)</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Snapshot</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Remove</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map(({ point, index, averageNdvi, currentNdvi }) => (
                            <tr key={point.id} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "8px" }}>
                                    <div 
                                        onClick={() => onFocusPoint && onFocusPoint(index)}
                                        style={{
                                            width: "20px",
                                            height: "20px",
                                            border: `2px solid ${getColorForIndex(index)}`,
                                            borderRadius: "50%",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "bold",
                                            color: getColorForIndex(index),
                                            backgroundColor: "white",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {index + 1}
                                    </div>
                                </td>
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
            
            {effectiveVisibleRange && displayData.length > 0 && displayData[0].length > 0 && (
                <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", justifyContent: "center", marginTop: "20px", marginBottom: "10px" }}>
                        {selectedPoints.map((point, index) => {
                            const color = getColorForIndex(index)
                            const isHidden = hiddenDatasets.has(index)
                            return (
                                <div
                                    key={point.id}
                                    onClick={() => {
                                        if (chartRef.current?.chart) {
                                            const chart = chartRef.current.chart
                                            const meta = chart.getDatasetMeta(index)
                                            const newHidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null
                                            meta.hidden = newHidden
                                            chart.update()
                                            setHiddenDatasets(prev => {
                                                const next = new Set(prev)
                                                if (newHidden) {
                                                    next.add(index)
                                                } else {
                                                    next.delete(index)
                                                }
                                                return next
                                            })
                                        }
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        cursor: "pointer",
                                        opacity: isHidden ? 0.5 : 1
                                    }}
                                >
                                    <div style={{
                                        width: "30px",
                                        height: "2px",
                                        backgroundColor: color
                                    }} />
                                    <div style={{
                                        width: "18px",
                                        height: "18px",
                                        border: `2px solid ${color}`,
                                        borderRadius: "50%",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: "bold",
                                        fontSize: "12px",
                                        color: color,
                                        backgroundColor: "white"
                                    }}>
                                        {index + 1}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div style={{ width: "100%", height: "350px" }}>
                        <Line ref={chartRef} data={chartData} options={chartOptions} />
                    </div>
                    <ChartNavigation
                        canGoLeft={canGoLeft}
                        canGoRight={canGoRight}
                        onLeftClick={handleLeftArrow}
                        onRightClick={handleRightArrow}
                        yAxisRange={yAxisRange}
                        onYAxisToggle={() => setYAxisRange(prev => prev === "0-1" ? "-1-1" : "0-1")}
                    />
                    <NdviLegend />
                </>
            )}
            
            <ChartLoadingMessage loading={isLoading} />
            
            {toastMessage && (
                <ToastMessage 
                    key={toastKey}
                    message={toastMessage} 
                    pointIndex={toastMessage.pointIndex !== undefined ? toastMessage.pointIndex : null}
                    duration={TOAST_DURATION} 
                    onClose={hideToast} 
                />
            )}
        </div>
    )
}

