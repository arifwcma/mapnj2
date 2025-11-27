"use client"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Line } from "react-chartjs-2"
import MonthDropdown from "./MonthDropdown"
import usePointDataMap from "@/app/hooks/usePointDataMap"
import useRequestTracker from "@/app/hooks/useRequestTracker"
import useToast from "@/app/hooks/useToast"
import useNullDataDetection from "@/app/hooks/useNullDataDetection"
import { formatMonthLabel, monthKey } from "@/app/lib/dateUtils"
import { registerChartJS } from "@/app/lib/chartUtils"
import { MONTH_NAMES_FULL, TOAST_DURATION } from "@/app/lib/config"
import { MESSAGES } from "@/app/lib/messageConstants"
import { getCurrentMonth, getAllAvailableMonths } from "@/app/lib/monthUtils"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { trackEvent } from "@/app/lib/analytics"
import ChartLoadingMessage from "./ChartLoadingMessage"
import PointSnapshot from "./PointSnapshot"
import NdviLegend from "./NdviLegend"
import ToastMessage from "./ToastMessage"
import ChartNavigation from "./ChartNavigation"

registerChartJS()

function PointMonthsDataWrapper({ point, rectangleBounds, cloudTolerance, requestTracker, onDataMapReady, selectedIndex }) {
    const dataMap = usePointDataMap(point, rectangleBounds, cloudTolerance, "POINT_MONTHS", requestTracker, selectedIndex)
    const mapSize = dataMap?.dataMap?.size ?? 0
    const previousSizeRef = useRef(-1)
    const dataMapRef = useRef(null)
    
    useEffect(() => {
        dataMapRef.current = dataMap
    }, [dataMap])
    
    useEffect(() => {
        if (dataMapRef.current && mapSize !== previousSizeRef.current) {
            previousSizeRef.current = mapSize
            onDataMapReady(dataMapRef.current)
        }
    }, [mapSize, onDataMapReady])
    
    return null
}

export default function PointMonthsModePanel({ 
    selectedPoint,
    rectangleBounds,
    cloudTolerance,
    onMonthChange,
    selectedMonths,
    setSelectedMonths,
    yAxisRange,
    setYAxisRange,
    selectedIndex = "NDVI"
}) {
    const requestTracker = useRequestTracker()
    const [dataMap, setDataMap] = useState(null)
    const [selectedYear, setSelectedYear] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(null)
    const { toastMessage, toastKey, showToast, hideToast } = useToast()
    
    const currentMonth = getCurrentMonth()
    
    useEffect(() => {
        if (!selectedYear || !selectedMonth) {
            setSelectedYear(currentMonth.year)
            setSelectedMonth(currentMonth.month)
        }
    }, [selectedYear, selectedMonth, currentMonth.year, currentMonth.month])
    
    useEffect(() => {
        if (!selectedPoint || selectedPoint.lat === null || selectedPoint.lon === null) {
            setSelectedMonths([])
        }
    }, [selectedPoint])
    
    useEffect(() => {
        if (dataMap && selectedMonths.length > 0) {
            const needsFetch = selectedMonths.some(m => {
                const key = monthKey(m.year, m.month)
                return !dataMap.dataMap.has(key)
            })
            if (needsFetch) {
                const keysToFetch = selectedMonths.map(m => monthKey(m.year, m.month))
                dataMap.fetchMissingMonths(keysToFetch)
            }
        }
    }, [dataMap, selectedMonths])
    
    useNullDataDetection(dataMap, selectedMonths, showToast, 0, null)
    
    const handleDataMapReady = useCallback((dm) => {
        setDataMap(dm)
    }, [])
    
    const handleRemoveMonth = useCallback((year, month) => {
        setSelectedMonths(prev => prev.filter(m => !(m.year === year && m.month === month)))
        trackEvent("Point-Months - month removed", {
            month: `${year}-${month}`
        })
    }, [setSelectedMonths])
    
    const addMonth = useCallback((year, month) => {
        const key = monthKey(year, month)
        const exists = selectedMonths.some(m => monthKey(m.year, m.month) === key)
        
        if (exists) {
            const monthName = MONTH_NAMES_FULL[month - 1]
            showToast(`${year} ${monthName} ${MESSAGES.MONTH_ALREADY_PRESENT}`)
            return false
        } else {
            setSelectedMonths(prev => {
                const updated = [...prev, { year, month }]
                return updated.sort((a, b) => {
                    if (a.year !== b.year) {
                        return a.year - b.year
                    }
                    return a.month - b.month
                })
            })
            
            if (dataMap) {
                dataMap.fetchMissingMonths([key])
            }
            return true
        }
    }, [selectedMonths, dataMap, showToast])
    
    const handleAddMonth = useCallback(() => {
        if (!selectedYear || !selectedMonth) return
        
        const addedKey = monthKey(selectedYear, selectedMonth)
        const exists = selectedMonths.some(m => monthKey(m.year, m.month) === addedKey)
        
        if (exists) {
            return
        }
        
        const success = addMonth(selectedYear, selectedMonth)
        
        if (success) {
            if (selectedPoint && selectedPoint.lat !== null && selectedPoint.lon !== null) {
                trackEvent("Point - month added", {
                    lat: selectedPoint.lat,
                    lon: selectedPoint.lon,
                    month: `${selectedYear}-${selectedMonth}`
                })
            }
            
            const allMonths = getAllAvailableMonths()
            const excludedKeys = new Set(selectedMonths.map(m => monthKey(m.year, m.month)))
            excludedKeys.add(addedKey)
            
            const nextAvailable = allMonths.find(({ year, month }) => !excludedKeys.has(monthKey(year, month)))
            
            if (nextAvailable) {
                setSelectedYear(nextAvailable.year)
                setSelectedMonth(nextAvailable.month)
                onMonthChange(nextAvailable.year, nextAvailable.month)
            }
        }
    }, [selectedYear, selectedMonth, selectedMonths, addMonth, onMonthChange, selectedPoint])
    
    const handleMonthDropdownChange = useCallback((year, month) => {
        setSelectedYear(year)
        setSelectedMonth(month)
        onMonthChange(year, month)
    }, [onMonthChange])
    
    const sortedMonths = useMemo(() => {
        return [...selectedMonths].sort((a, b) => {
            if (a.year !== b.year) {
                return a.year - b.year
            }
            return a.month - b.month
        })
    }, [selectedMonths])
    
    const tableData = useMemo(() => {
        if (!dataMap || sortedMonths.length === 0) {
            return []
        }
        
        return sortedMonths.map(({ year, month }) => {
            const key = monthKey(year, month)
            const ndvi = dataMap.dataMap.get(key)
            return {
                year,
                month,
                ndvi: ndvi !== null && ndvi !== undefined ? parseFloat(ndvi.toFixed(2)) : null
            }
        })
    }, [dataMap, sortedMonths])
    
    const chartData = useMemo(() => {
        if (tableData.length === 0) {
            return { labels: [], datasets: [] }
        }
        
        const labels = tableData.map(d => formatMonthLabel(d.year, d.month))
        const values = tableData.map(d => d.ndvi)
        
        return {
            labels,
            datasets: [{
                label: selectedIndex,
                data: values,
                borderColor: "rgb(0, 123, 255)",
                backgroundColor: "rgba(0, 123, 255, 0.1)",
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "rgb(0, 123, 255)",
                tension: 0.1
            }]
        }
    }, [tableData])
    
    
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
    
    if (!selectedPoint || selectedPoint.lat === null || selectedPoint.lon === null) {
        return <div>Please select a point on the map</div>
    }
    
    return (
        <div>
            <PointMonthsDataWrapper
                point={selectedPoint}
                rectangleBounds={rectangleBounds}
                cloudTolerance={cloudTolerance}
                requestTracker={requestTracker}
                onDataMapReady={handleDataMapReady}
                selectedIndex={selectedIndex}
            />
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                <div style={{ flex: 1 }}>
                    <MonthDropdown 
                        selectedYear={selectedYear} 
                        selectedMonth={selectedMonth} 
                        onMonthChange={handleMonthDropdownChange}
                        excludedMonths={selectedMonths}
                    />
                </div>
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault()
                        handleAddMonth()
                    }}
                    style={{
                        cursor: "pointer",
                        color: "#007bff",
                        textDecoration: "underline",
                        marginTop: "20px"
                    }}
                >
                    Add
                </a>
            </div>
            
            {tableData.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
                    <thead>
                        <tr style={{ borderBottom: "2px solid #ccc" }}>
                            <th style={{ padding: "8px", textAlign: "left" }}>Month</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>{selectedIndex} (avg)</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Snapshot</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Remove</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map(({ year, month, ndvi }) => (
                            <tr key={`${year}-${month}`} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "8px" }}>{formatMonthLabel(year, month)}</td>
                                <td style={{ padding: "8px" }}>
                                    {ndvi !== null ? ndvi.toFixed(2) : "N/A"}
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <PointSnapshot ndvi={ndvi} size={30} indexName={selectedIndex} />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <button
                                        onClick={() => handleRemoveMonth(year, month)}
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
            
            {chartData.labels.length > 0 && (
                <>
                    <div style={{ width: "100%", height: "350px", marginTop: "20px" }}>
                        <Line data={chartData} options={chartOptions} />
                    </div>
                    <ChartNavigation
                        canGoLeft={() => false}
                        canGoRight={() => false}
                        onLeftClick={() => {}}
                        onRightClick={() => {}}
                        yAxisRange={yAxisRange}
                        onYAxisToggle={() => {
                            const newRange = yAxisRange === "0-1" ? "-1-1" : "0-1"
                            setYAxisRange(newRange)
                            trackEvent("Chart arrow clicked", {
                                feature: "Point-Months",
                                arrow: yAxisRange === "0-1" ? "down" : "up"
                            })
                        }}
                    />
                    <NdviLegend indexName={selectedIndex} />
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

