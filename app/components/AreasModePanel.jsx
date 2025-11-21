"use client"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Line } from "react-chartjs-2"
import MonthDropdown from "./MonthDropdown"
import useAreaDataMap from "@/app/hooks/useAreaDataMap"
import useRequestTracker from "@/app/hooks/useRequestTracker"
import useToast from "@/app/hooks/useToast"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { monthKey } from "@/app/lib/dateUtils"
import { TOAST_DURATION, MONTH_NAMES_FULL } from "@/app/lib/config"
import { getAllMonthsInRange } from "@/app/lib/rangeUtils"
import { buildDisplayDataItem, registerChartJS } from "@/app/lib/chartUtils"
import { MESSAGES } from "@/app/lib/messageConstants"
import { isMonthInFuture } from "@/app/lib/monthUtils"
import useVisibleRange from "@/app/hooks/useVisibleRange"
import ChartLoadingMessage from "./ChartLoadingMessage"
import ChartNavigation from "./ChartNavigation"
import AreaSnapshot from "./AreaSnapshot"
import CompareSnapshots from "./CompareSnapshots"
import NdviLegend from "./NdviLegend"
import ToastMessage from "./ToastMessage"

registerChartJS()

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
    const chartRef = useRef(null)
    
    const {
        visibleRange,
        setVisibleRange,
        updateRangeForMonth,
        canGoLeft,
        canGoRight,
        handleLeftArrow,
        handleRightArrow
    } = useVisibleRange(selectedYear, selectedMonth)
    
    const handleDataMapReady = useCallback((index, dataMap) => {
        setAreaDataMaps(prev => {
            const newMaps = [...prev]
            newMaps[index] = dataMap
            return newMaps
        })
    }, [])
    
    useEffect(() => {
        updateRangeForMonth(selectedYear, selectedMonth)
    }, [selectedYear, selectedMonth, updateRangeForMonth])
    
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
                            const isFuture = isMonthInFuture(year, month)
                            const suffix = isFuture ? "" : MESSAGES.NO_DATA_FOUND_SUFFIX
                            showToast(`${MESSAGES.NO_DATA_FOUND_PREFIX} ${year} ${monthName} for `, null, index, suffix)
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
    
    const [yAxisRange, setYAxisRange] = useState("0-1")
    
    const chartOptions = useMemo(() => ({
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
                min: yAxisRange === "0-1" ? 0 : -1,
                max: 1
            }
        }
    }), [yAxisRange])
    
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
            
            {selectedAreas.length > 0 && (
                <CompareSnapshots
                    selectedAreas={selectedAreas}
                    cloudTolerance={cloudTolerance}
                    visibleRange={visibleRange}
                />
            )}
            
            {tableData.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
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
                    areaIndex={toastMessage.areaIndex !== undefined ? toastMessage.areaIndex : null}
                    duration={TOAST_DURATION} 
                    onClose={hideToast} 
                />
            )}
        </div>
    )
}

