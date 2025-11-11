"use client"
import { useState, useEffect, useRef } from "react"
import { Line } from "react-chartjs-2"
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from "chart.js"

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
)

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MIN_YEAR = 2019
const MIN_MONTH = 1

function formatMonthLabel(year, month) {
    return `${MONTH_NAMES[month - 1]} ${year}`
}

function getInitialMonthsRange(currentYear, currentMonth, endYear, endMonthNum) {
    const months = []
    let year = currentYear
    let month = currentMonth
    
    for (let i = 0; i < 6; i++) {
        if (year < MIN_YEAR || (year === MIN_YEAR && month < MIN_MONTH)) {
            break
        }
        if (year > endYear || (year === endYear && month > endMonthNum)) {
            break
        }
        
        months.unshift({ year, month })
        
        if (month === 1) {
            month = 12
            year--
        } else {
            month--
        }
    }
    
    return months
}

function getPreviousMonth(year, month) {
    if (month === 1) {
        return { year: year - 1, month: 12 }
    }
    return { year, month: month - 1 }
}

function getNextMonth(year, month) {
    if (month === 12) {
        return { year: year + 1, month: 1 }
    }
    return { year, month: month + 1 }
}

export default function PointInfoPanel({ lat, lon, ndvi, isReloading, selectedYear, selectedMonth, endYear, endMonthNum, rectangleBounds, cloudTolerance }) {
    const [plotData, setPlotData] = useState([])
    const [loading, setLoading] = useState(false)
    const fetchedMonthsRef = useRef(new Set())
    const fetchingRef = useRef(false)
    const arrowDebounceTimeoutRef = useRef(null)
    
    const fetchMonthsData = async (monthsToFetch) => {
        if (monthsToFetch.length === 0 || !rectangleBounds) {
            return []
        }
        
        const uniqueMonths = monthsToFetch.filter((m, index, self) => 
            index === self.findIndex(t => t.year === m.year && t.month === m.month)
        )
        
        const bboxStr = `${rectangleBounds[0][1]},${rectangleBounds[0][0]},${rectangleBounds[1][1]},${rectangleBounds[1][0]}`
        
        try {
            const response = await fetch("/api/ndvi/point/months", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    lat,
                    lon,
                    months: uniqueMonths,
                    bbox: bboxStr,
                    cloud: cloudTolerance
                })
            })
            
            if (!response.ok) {
                throw new Error("Failed to fetch months data")
            }
            
            const data = await response.json()
            return data.results || []
        } catch (error) {
            console.error("Error fetching months data:", error)
            return []
        }
    }
    
    useEffect(() => {
        if (!lat || !lon || !selectedYear || !selectedMonth || !rectangleBounds || !endYear || !endMonthNum) {
            return
        }
        
        if (fetchingRef.current) {
            return
        }
        
        const initialMonths = getInitialMonthsRange(selectedYear, selectedMonth, endYear, endMonthNum)
        if (initialMonths.length === 0) {
            return
        }
        
        fetchingRef.current = true
        setLoading(true)
        setPlotData([])
        fetchedMonthsRef.current.clear()
        
        initialMonths.forEach(m => {
            fetchedMonthsRef.current.add(`${m.year}-${m.month}`)
        })
        
        fetchMonthsData(initialMonths).then(results => {
            if (results.length > 0) {
                const plotArray = results.map(item => ({
                    year: item.year,
                    month: item.month,
                    label: formatMonthLabel(item.year, item.month),
                    ndvi: item.ndvi
                }))
                
                setPlotData(plotArray)
                
                results.forEach(item => {
                    const key = `${item.year}-${item.month}`
                    fetchedMonthsRef.current.add(key)
                })
            }
            setLoading(false)
            fetchingRef.current = false
        })
    }, [lat, lon, endYear, endMonthNum, rectangleBounds, cloudTolerance, selectedYear, selectedMonth])
    
    const chartData = {
        labels: plotData.map(d => d.label),
        datasets: [
            {
                label: "NDVI",
                data: plotData.map(d => d.ndvi),
                borderColor: "rgb(136, 132, 216)",
                backgroundColor: "rgba(136, 132, 216, 0.1)",
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "rgb(136, 132, 216)",
                tension: 0.1
            }
        ]
    }
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: true
            }
        },
        scales: {
            x: {
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    font: {
                        size: 10
                    }
                }
            },
            y: {
                min: -1,
                max: 1,
                ticks: {
                    font: {
                        size: 10
                    }
                }
            }
        }
    }

    const canGoLeft = () => {
        if (plotData.length === 0) return false
        const firstMonth = plotData[0]
        return !(firstMonth.year < MIN_YEAR || (firstMonth.year === MIN_YEAR && firstMonth.month <= MIN_MONTH))
    }

    const canGoRight = () => {
        if (plotData.length === 0) return false
        const lastMonth = plotData[plotData.length - 1]
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        return !(lastMonth.year > currentYear || (lastMonth.year === currentYear && lastMonth.month >= currentMonth))
    }

    const handleLeftArrow = () => {
        if (!canGoLeft() || loading || fetchingRef.current || plotData.length === 0) return

        const firstMonth = plotData[0]
        const prevMonth = getPreviousMonth(firstMonth.year, firstMonth.month)
        const key = `${prevMonth.year}-${prevMonth.month}`

        const existingIndex = plotData.findIndex(d => d.year === prevMonth.year && d.month === prevMonth.month)
        if (existingIndex !== -1) {
            return
        }

        if (arrowDebounceTimeoutRef.current) {
            clearTimeout(arrowDebounceTimeoutRef.current)
        }

        arrowDebounceTimeoutRef.current = setTimeout(async () => {
            fetchingRef.current = true
            setLoading(true)

            const results = await fetchMonthsData([prevMonth])
            if (results.length > 0) {
                const newItem = {
                    year: results[0].year,
                    month: results[0].month,
                    label: formatMonthLabel(results[0].year, results[0].month),
                    ndvi: results[0].ndvi
                }
                fetchedMonthsRef.current.add(key)
                setPlotData(prev => [newItem, ...prev])
            }

            setLoading(false)
            fetchingRef.current = false
        }, 1000)
    }

    const handleRightArrow = () => {
        if (!canGoRight() || loading || fetchingRef.current || plotData.length === 0) return

        const lastMonth = plotData[plotData.length - 1]
        const nextMonth = getNextMonth(lastMonth.year, lastMonth.month)
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        
        if (nextMonth.year > currentYear || (nextMonth.year === currentYear && nextMonth.month > currentMonth)) {
            return
        }

        const key = `${nextMonth.year}-${nextMonth.month}`

        const existingIndex = plotData.findIndex(d => d.year === nextMonth.year && d.month === nextMonth.month)
        if (existingIndex !== -1) {
            return
        }

        if (arrowDebounceTimeoutRef.current) {
            clearTimeout(arrowDebounceTimeoutRef.current)
        }

        arrowDebounceTimeoutRef.current = setTimeout(async () => {
            fetchingRef.current = true
            setLoading(true)

            const results = await fetchMonthsData([nextMonth])
            if (results.length > 0) {
                const newItem = {
                    year: results[0].year,
                    month: results[0].month,
                    label: formatMonthLabel(results[0].year, results[0].month),
                    ndvi: results[0].ndvi
                }
                fetchedMonthsRef.current.add(key)
                setPlotData(prev => [...prev, newItem])
            }

            setLoading(false)
            fetchingRef.current = false
        }, 1000)
    }
    
    return (
        <div>
            {isReloading ? (
                <div style={{ fontSize: "16px" }}>
                    Reloading ...
                </div>
            ) : ndvi !== null && ndvi !== undefined ? (
                <div style={{ fontSize: "16px", marginBottom: "20px" }}>
                    NDVI: {ndvi.toFixed(2)}
                </div>
            ) : null}
            {!isReloading && !loading && plotData.length > 0 && (
                <>
                    <div style={{ width: "100%", height: "350px", marginTop: "20px" }}>
                        <Line data={chartData} options={chartOptions} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", padding: "0 10px" }}>
                        <button
                            onClick={handleLeftArrow}
                            disabled={!canGoLeft() || loading}
                            style={{
                                background: "none",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                padding: "8px 12px",
                                cursor: (!canGoLeft() || loading) ? "not-allowed" : "pointer",
                                opacity: (!canGoLeft() || loading) ? 0.5 : 1,
                                fontSize: "18px"
                            }}
                        >
                            ←
                        </button>
                        <button
                            onClick={handleRightArrow}
                            disabled={!canGoRight() || loading}
                            style={{
                                background: "none",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                padding: "8px 12px",
                                cursor: (!canGoRight() || loading) ? "not-allowed" : "pointer",
                                opacity: (!canGoRight() || loading) ? 0.5 : 1,
                                fontSize: "18px"
                            }}
                        >
                            →
                        </button>
                    </div>
                    {(() => {
                        const validNdviValues = plotData.filter(d => d.ndvi !== null && d.ndvi !== undefined).map(d => d.ndvi)
                        const average = validNdviValues.length > 0 
                            ? validNdviValues.reduce((sum, val) => sum + val, 0) / validNdviValues.length 
                            : null
                        return average !== null ? (
                            <div style={{ fontSize: "14px", color: "#666", marginTop: "10px", textAlign: "center" }}>
                                Average: {average.toFixed(2)}
                            </div>
                        ) : null
                    })()}
                </>
            )}
            {loading && (
                <div style={{ fontSize: "14px", color: "#666", marginTop: "20px" }}>
                    Loading chart data...
                </div>
            )}
        </div>
    )
}
