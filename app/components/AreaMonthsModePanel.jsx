"use client"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from "chart.js"
import { Line } from "react-chartjs-2"
import MonthDropdown from "./MonthDropdown"
import useAreaDataMap from "@/app/hooks/useAreaDataMap"
import useRequestTracker from "@/app/hooks/useRequestTracker"
import useToast from "@/app/hooks/useToast"
import useNullDataDetection from "@/app/hooks/useNullDataDetection"
import { formatMonthLabel, monthKey } from "@/app/lib/dateUtils"
import { MONTH_NAMES_FULL, TOAST_DURATION } from "@/app/lib/config"
import { getCurrentMonth, getPreviousCalendarMonth } from "@/app/lib/monthUtils"
import { getColorForIndex } from "@/app/lib/colorUtils"
import { getAreaCenter } from "@/app/lib/bboxUtils"
import ChartLoadingMessage from "./ChartLoadingMessage"
import AreaSnapshot from "./AreaSnapshot"
import NdviLegend from "./NdviLegend"
import ToastMessage from "./ToastMessage"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function AreaMonthsDataWrapper({ area, cloudTolerance, requestTracker, onDataMapReady }) {
    const rectangleBounds = area?.bounds || null
    const dataMap = useAreaDataMap(area, rectangleBounds, cloudTolerance, "AREA_MONTHS", requestTracker)
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

export default function AreaMonthsModePanel({ 
    selectedArea,
    rectangleBounds,
    cloudTolerance,
    onMonthChange,
    onResetSelection
}) {
    const requestTracker = useRequestTracker()
    const [dataMap, setDataMap] = useState(null)
    const [selectedMonths, setSelectedMonths] = useState([])
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
        if (!selectedArea) {
            setSelectedMonths([])
            return
        }
        
        const currentKey = monthKey(currentMonth.year, currentMonth.month)
        const exists = selectedMonths.some(m => monthKey(m.year, m.month) === currentKey)
        
        if (!exists && selectedMonths.length === 0) {
            setSelectedMonths([{ year: currentMonth.year, month: currentMonth.month }])
            const prevMonth = getPreviousCalendarMonth()
            setSelectedYear(prevMonth.year)
            setSelectedMonth(prevMonth.month)
        }
    }, [selectedArea, currentMonth.year, currentMonth.month])
    
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
    
    useNullDataDetection(dataMap, selectedMonths, showToast)
    
    const handleDataMapReady = useCallback((dm) => {
        setDataMap(dm)
    }, [])
    
    const handleRemoveMonth = useCallback((year, month) => {
        setSelectedMonths(prev => prev.filter(m => !(m.year === year && m.month === month)))
    }, [])
    
    const addMonth = useCallback((year, month) => {
        const key = monthKey(year, month)
        const exists = selectedMonths.some(m => monthKey(m.year, m.month) === key)
        
        if (exists) {
            const monthName = MONTH_NAMES_FULL[month - 1]
            showToast(`${year} ${monthName} already present`)
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
        addMonth(selectedYear, selectedMonth)
    }, [selectedYear, selectedMonth, addMonth])
    
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
                label: "NDVI",
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
    
    const [yAxisRange, setYAxisRange] = useState("0-1")
    
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
    
    if (!selectedArea) {
        return <div>Please select an area on the map</div>
    }
    
    const areaCenter = getAreaCenter(selectedArea)
    
    return (
        <div>
            <AreaMonthsDataWrapper
                area={selectedArea}
                cloudTolerance={cloudTolerance}
                requestTracker={requestTracker}
                onDataMapReady={handleDataMapReady}
            />
            
            <div style={{ marginBottom: "15px" }}>
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault()
                        onResetSelection()
                    }}
                    style={{
                        fontSize: "13px",
                        cursor: "pointer",
                        color: "#0066cc",
                        textDecoration: "underline"
                    }}
                >
                    Reset selection
                </a>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                <div style={{ flex: 1 }}>
                    <MonthDropdown 
                        selectedYear={selectedYear} 
                        selectedMonth={selectedMonth} 
                        onMonthChange={handleMonthDropdownChange} 
                    />
                </div>
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault()
                        handleAddMonth()
                    }}
                    style={{
                        fontSize: "13px",
                        cursor: "pointer",
                        color: "#007bff",
                        textDecoration: "underline",
                        marginTop: "20px"
                    }}
                >
                    Add
                </a>
            </div>
            
            {areaCenter && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", fontSize: "13px", color: "#333" }}>
                    <div style={{
                        width: "20px",
                        height: "20px",
                        border: `2px solid ${getColorForIndex(0)}`,
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: "bold",
                        color: getColorForIndex(0),
                        backgroundColor: "white"
                    }}>
                        1
                    </div>
                    <span>
                        {areaCenter.lat.toFixed(6)}, {areaCenter.lon.toFixed(6)}
                    </span>
                </div>
            )}
            
            {tableData.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "13px" }}>
                    <thead>
                        <tr style={{ borderBottom: "2px solid #ccc" }}>
                            <th style={{ padding: "8px", textAlign: "left" }}>Month</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>NDVI (avg)</th>
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
                                    <AreaSnapshot
                                        area={selectedArea}
                                        rectangleBounds={selectedArea.bounds}
                                        cloudTolerance={cloudTolerance}
                                        visibleRange={{
                                            startMonth: { year, month },
                                            endMonth: { year, month }
                                        }}
                                    />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <button
                                        onClick={() => handleRemoveMonth(year, month)}
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
            
            {chartData.labels.length > 0 && (
                <>
                    <div style={{ width: "100%", height: "350px", marginTop: "20px" }}>
                        <Line data={chartData} options={chartOptions} />
                    </div>
                    <NdviLegend yAxisRange={yAxisRange} />
                    <div style={{ position: "relative", marginTop: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "0 10px" }}>
                            <button
                                onClick={() => setYAxisRange(prev => prev === "0-1" ? "-1-1" : "0-1")}
                                style={{
                                    padding: "8px 16px",
                                    fontSize: "16px",
                                    cursor: "pointer",
                                    backgroundColor: "white",
                                    color: "#333",
                                    border: "1px solid #ddd",
                                    borderRadius: "8px",
                                    fontWeight: "500"
                                }}
                            >
                                {yAxisRange === "0-1" ? "↓" : "↑"}
                            </button>
                        </div>
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
