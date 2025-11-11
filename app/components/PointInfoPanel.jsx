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

export default function PointInfoPanel({ lat, lon, ndvi, isReloading, selectedYear, selectedMonth, endYear, endMonthNum, rectangleBounds, cloudTolerance }) {
    const [plotData, setPlotData] = useState([])
    const [loading, setLoading] = useState(false)
    const fetchedMonthsRef = useRef(new Set())
    const fetchingRef = useRef(false)
    
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
            {!isReloading && plotData.length > 0 && (
                <div style={{ width: "100%", height: "350px", marginTop: "20px" }}>
                    <Line data={chartData} options={chartOptions} />
                </div>
            )}
            {loading && (
                <div style={{ fontSize: "14px", color: "#666", marginTop: "20px" }}>
                    Loading chart data...
                </div>
            )}
        </div>
    )
}
