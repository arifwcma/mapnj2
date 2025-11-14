"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from "chart.js"
import { Line } from "react-chartjs-2"
import MonthDropdown from "./MonthDropdown"
import usePointDataMap from "@/app/hooks/usePointDataMap"
import useRequestTracker from "@/app/hooks/useRequestTracker"
import { formatMonthLabel } from "@/app/lib/dateUtils"
import { getPreviousCalendarMonth } from "@/app/lib/monthUtils"
import ChartLoadingMessage from "./ChartLoadingMessage"
import PointSnapshot from "./PointSnapshot"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function PointMonthsDataWrapper({ point, rectangleBounds, cloudTolerance, requestTracker, onDataMapReady }) {
    const dataMap = usePointDataMap(point, rectangleBounds, cloudTolerance, "POINT_MONTHS", requestTracker)
    const dataMapRef = useRef(dataMap)
    
    useEffect(() => {
        dataMapRef.current = dataMap
    }, [dataMap])
    
    useEffect(() => {
        if (dataMapRef.current) {
            onDataMapReady(dataMapRef.current)
        }
    }, [onDataMapReady])
    
    return null
}

export default function PointMonthsModePanel({ 
    selectedPoint,
    rectangleBounds,
    cloudTolerance,
    onMonthChange
}) {
    const requestTracker = useRequestTracker()
    const [dataMap, setDataMap] = useState(null)
    const [selectedMonths, setSelectedMonths] = useState([])
    const [selectedYear, setSelectedYear] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(null)
    
    const prevMonth = getPreviousCalendarMonth()
    
    useEffect(() => {
        if (!selectedYear || !selectedMonth) {
            setSelectedYear(prevMonth.year)
            setSelectedMonth(prevMonth.month)
        }
    }, [selectedYear, selectedMonth])
    
    const handleDataMapReady = useCallback((dm) => {
        setDataMap(dm)
    }, [])
    
    const handleAddMonth = useCallback(() => {
        if (!selectedYear || !selectedMonth) return
        
        const monthKey = `${selectedYear}-${selectedMonth}`
        const exists = selectedMonths.some(m => `${m.year}-${m.month}` === monthKey)
        
        if (!exists) {
            setSelectedMonths(prev => [...prev, { year: selectedYear, month: selectedMonth }])
            
            if (dataMap) {
                const { monthKey: mk } = require("@/app/lib/dateUtils")
                dataMap.fetchMissingMonths([mk(selectedYear, selectedMonth)])
            }
        }
    }, [selectedYear, selectedMonth, dataMap])
    
    const handleMonthDropdownChange = useCallback((year, month) => {
        setSelectedYear(year)
        setSelectedMonth(month)
        onMonthChange(year, month)
    }, [onMonthChange])
    
    const tableData = useMemo(() => {
        if (!dataMap || selectedMonths.length === 0) {
            return []
        }
        
        const { monthKey: mk } = require("@/app/lib/dateUtils")
        return selectedMonths.map(({ year, month }) => {
            const key = mk(year, month)
            const ndvi = dataMap.dataMap.get(key)
            return {
                year,
                month,
                ndvi: ndvi !== null && ndvi !== undefined ? parseFloat(ndvi.toFixed(2)) : null
            }
        })
    }, [dataMap, selectedMonths])
    
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
    
    const chartOptions = {
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
                min: -1,
                max: 1
            }
        }
    }
    
    const isLoading = dataMap?.isLoading || false
    
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
            />
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                <div style={{ flex: 1 }}>
                    <MonthDropdown 
                        selectedYear={selectedYear} 
                        selectedMonth={selectedMonth} 
                        onMonthChange={handleMonthDropdownChange} 
                    />
                </div>
                <button
                    onClick={handleAddMonth}
                    style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        cursor: "pointer",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        marginTop: "20px"
                    }}
                >
                    Add
                </button>
            </div>
            
            {tableData.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "13px" }}>
                    <thead>
                        <tr style={{ borderBottom: "2px solid #ccc" }}>
                            <th style={{ padding: "8px", textAlign: "left" }}>Month</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>NDVI (avg)</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Snapshot</th>
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
                                    <PointSnapshot ndvi={ndvi} size={30} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            
            {chartData.labels.length > 0 && (
                <div style={{ width: "100%", height: "350px", marginTop: "20px" }}>
                    <Line data={chartData} options={chartOptions} />
                </div>
            )}
            
            <ChartLoadingMessage loading={isLoading} />
        </div>
    )
}

