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

export default function PointInfoPanel({ lat, lon, ndvi, isReloading, isLoading = false, selectedYear, selectedMonth, endYear, endMonthNum, rectangleBounds, cloudTolerance, secondPoint = null, onSecondPointLoadingChange = undefined }) {
    const [plotData, setPlotData] = useState([])
    const [secondPlotData, setSecondPlotData] = useState([])
    const [loading, setLoading] = useState(false)
    const [secondLoading, setSecondLoading] = useState(false)
    const fetchedMonthsRef = useRef(new Set())
    const secondFetchedMonthsRef = useRef(new Set())
    const fetchingRef = useRef(false)
    const secondFetchingRef = useRef(false)
    const arrowDebounceTimeoutRef = useRef(null)
    const previousSecondPointRef = useRef(null)
    const leftArrowClickCountRef = useRef(0)
    const rightArrowClickCountRef = useRef(0)
    const chartRef = useRef(null)
    const [firstPointHidden, setFirstPointHidden] = useState(false)
    const [secondPointHidden, setSecondPointHidden] = useState(false)
    
    const fetchMonthsData = async (monthsToFetch, pointLat, pointLon) => {
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
                    lat: pointLat,
                    lon: pointLon,
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
        if (!lat || !lon || !selectedYear || !selectedMonth || !rectangleBounds || !endYear || !endMonthNum || isLoading) {
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
        
        fetchMonthsData(initialMonths, lat, lon).then(results => {
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
    }, [lat, lon, endYear, endMonthNum, rectangleBounds, cloudTolerance, selectedYear, selectedMonth, isLoading])
    
    useEffect(() => {
        if (!secondPoint || !secondPoint.lat || !secondPoint.lon || !rectangleBounds || plotData.length === 0 || secondFetchingRef.current) {
            if (!secondPoint || !secondPoint.lat || !secondPoint.lon) {
                setSecondPlotData([])
                setSecondLoading(false)
                previousSecondPointRef.current = null
            }
            return
        }
        
        const currentPointKey = `${secondPoint.lat},${secondPoint.lon}`
        const previousPointKey = previousSecondPointRef.current 
            ? `${previousSecondPointRef.current.lat},${previousSecondPointRef.current.lon}`
            : null
        
        if (currentPointKey !== previousPointKey) {
            secondFetchedMonthsRef.current.clear()
            setSecondPlotData([])
            previousSecondPointRef.current = { lat: secondPoint.lat, lon: secondPoint.lon }
        }
        
        const monthsToFetch = plotData
            .map(d => ({ year: d.year, month: d.month }))
            .filter(m => {
                const key = `${m.year}-${m.month}`
                return !secondFetchedMonthsRef.current.has(key)
            })
        
        if (monthsToFetch.length === 0) {
            const existingData = plotData.map(d => {
                const existing = secondPlotData.find(s => s.year === d.year && s.month === d.month)
                return existing || {
                    year: d.year,
                    month: d.month,
                    label: formatMonthLabel(d.year, d.month),
                    ndvi: null
                }
            })
            setSecondPlotData(existingData)
            return
        }
        
        secondFetchingRef.current = true
        setSecondLoading(true)
        
        fetchMonthsData(monthsToFetch, secondPoint.lat, secondPoint.lon).then(results => {
            if (results.length > 0) {
                const newItems = results.map(item => ({
                    year: item.year,
                    month: item.month,
                    label: formatMonthLabel(item.year, item.month),
                    ndvi: item.ndvi
                }))
                
                results.forEach(item => {
                    const key = `${item.year}-${item.month}`
                    secondFetchedMonthsRef.current.add(key)
                })
                
                if (!previousSecondPointRef.current || 
                    previousSecondPointRef.current.lat !== secondPoint.lat || 
                    previousSecondPointRef.current.lon !== secondPoint.lon) {
                    previousSecondPointRef.current = { lat: secondPoint.lat, lon: secondPoint.lon }
                }
                
                setSecondPlotData(prev => {
                    const existingMap = new Map(prev.map(d => [`${d.year}-${d.month}`, d]))
                    newItems.forEach(item => {
                        existingMap.set(`${item.year}-${item.month}`, item)
                    })
                    return plotData.map(d => {
                        const key = `${d.year}-${d.month}`
                        return existingMap.get(key) || {
                            year: d.year,
                            month: d.month,
                            label: formatMonthLabel(d.year, d.month),
                            ndvi: null
                        }
                    })
                })
            }
            setSecondLoading(false)
            secondFetchingRef.current = false
        })
    }, [secondPoint, plotData, rectangleBounds, cloudTolerance])
    
    useEffect(() => {
        if (secondPoint && secondPoint.lat && secondPoint.lon && plotData.length > 0) {
            secondFetchedMonthsRef.current.clear()
        }
    }, [cloudTolerance, selectedYear, selectedMonth, secondPoint])
    
    useEffect(() => {
        if (onSecondPointLoadingChange) {
            onSecondPointLoadingChange(secondLoading)
        }
    }, [secondLoading, onSecondPointLoadingChange])
    
    const chartData = {
        labels: plotData.map(d => d.label),
        datasets: [
            {
                label: "First Point",
                data: plotData.map(d => d.ndvi),
                borderColor: "rgb(0, 123, 255)",
                backgroundColor: "rgba(0, 123, 255, 0.1)",
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "rgb(0, 123, 255)",
                tension: 0.1
            },
            ...(secondPlotData.length > 0 ? [{
                label: "Second Point",
                data: plotData.map(d => {
                    const secondData = secondPlotData.find(s => s.year === d.year && s.month === d.month)
                    return secondData ? secondData.ndvi : null
                }),
                borderColor: "rgb(220, 53, 69)",
                backgroundColor: "rgba(220, 53, 69, 0.1)",
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "rgb(220, 53, 69)",
                tension: 0.1
            }] : [])
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
        if (plotData.length === 0 || loading || fetchingRef.current) {
            return
        }

        if (!canGoLeft()) {
            return
        }

        leftArrowClickCountRef.current += 1

        if (arrowDebounceTimeoutRef.current) {
            clearTimeout(arrowDebounceTimeoutRef.current)
        }

        arrowDebounceTimeoutRef.current = setTimeout(() => {
            const offset = leftArrowClickCountRef.current
            leftArrowClickCountRef.current = 0

            if (offset === 0 || loading || fetchingRef.current || plotData.length === 0) {
                return
            }

            const firstMonth = plotData[0]
            const bboxStr = `${rectangleBounds[0][1]},${rectangleBounds[0][0]},${rectangleBounds[1][1]},${rectangleBounds[1][0]}`

            fetchingRef.current = true
            setLoading(true)

            fetch(`/api/ndvi/point/months/expand`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    lat,
                    lon,
                    startYear: firstMonth.year,
                    startMonth: firstMonth.month,
                    direction: "left",
                    offset,
                    bbox: bboxStr,
                    cloud: cloudTolerance
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to fetch months data")
                }
                return response.json()
            })
            .then(data => {
                if (data.results && data.results.length > 0) {
                    const newItems = data.results.map(item => ({
                        year: item.year,
                        month: item.month,
                        label: formatMonthLabel(item.year, item.month),
                        ndvi: item.ndvi
                    }))

                    newItems.forEach(item => {
                        const key = `${item.year}-${item.month}`
                        fetchedMonthsRef.current.add(key)
                    })

                    setPlotData(prev => {
                        const existingKeys = new Set(prev.map(d => `${d.year}-${d.month}`))
                        const itemsToAdd = newItems.filter(item => !existingKeys.has(`${item.year}-${item.month}`))
                        return [...itemsToAdd, ...prev].sort((a, b) => {
                            if (a.year !== b.year) return a.year - b.year
                            return a.month - b.month
                        })
                    })

                    if (secondPoint && secondPoint.lat && secondPoint.lon && !secondFetchingRef.current) {
                        fetch(`/api/ndvi/point/months/expand`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                lat: secondPoint.lat,
                                lon: secondPoint.lon,
                                startYear: firstMonth.year,
                                startMonth: firstMonth.month,
                                direction: "left",
                                offset,
                                bbox: bboxStr,
                                cloud: cloudTolerance
                            })
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error("Failed to fetch second point months data")
                            }
                            return response.json()
                        })
                        .then(data => {
                            if (data.results && data.results.length > 0) {
                                const secondNewItems = data.results.map(item => ({
                                    year: item.year,
                                    month: item.month,
                                    label: formatMonthLabel(item.year, item.month),
                                    ndvi: item.ndvi
                                }))

                                secondNewItems.forEach(item => {
                                    const key = `${item.year}-${item.month}`
                                    secondFetchedMonthsRef.current.add(key)
                                })

                                setSecondPlotData(prev => {
                                    const existingKeys = new Set(prev.map(d => `${d.year}-${d.month}`))
                                    const itemsToAdd = secondNewItems.filter(item => !existingKeys.has(`${item.year}-${item.month}`))
                                    return [...itemsToAdd, ...prev].sort((a, b) => {
                                        if (a.year !== b.year) return a.year - b.year
                                        return a.month - b.month
                                    })
                                })
                            }
                        })
                        .catch(error => {
                            console.error("Error fetching second point months data:", error)
                        })
                    }
                }

                setLoading(false)
                fetchingRef.current = false
            })
            .catch(error => {
                console.error("Error fetching months data:", error)
                setLoading(false)
                fetchingRef.current = false
            })
        }, 1000)
    }

    const handleRightArrow = () => {
        if (plotData.length === 0 || loading || fetchingRef.current) {
            return
        }

        if (!canGoRight()) {
            return
        }

        rightArrowClickCountRef.current += 1

        if (arrowDebounceTimeoutRef.current) {
            clearTimeout(arrowDebounceTimeoutRef.current)
        }

        arrowDebounceTimeoutRef.current = setTimeout(() => {
            const offset = rightArrowClickCountRef.current
            rightArrowClickCountRef.current = 0

            if (offset === 0 || loading || fetchingRef.current || plotData.length === 0) {
                return
            }

            const lastMonth = plotData[plotData.length - 1]
            const bboxStr = `${rectangleBounds[0][1]},${rectangleBounds[0][0]},${rectangleBounds[1][1]},${rectangleBounds[1][0]}`

            fetchingRef.current = true
            setLoading(true)

            fetch(`/api/ndvi/point/months/expand`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    lat,
                    lon,
                    startYear: lastMonth.year,
                    startMonth: lastMonth.month,
                    direction: "right",
                    offset,
                    bbox: bboxStr,
                    cloud: cloudTolerance
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to fetch months data")
                }
                return response.json()
            })
            .then(data => {
                if (data.results && data.results.length > 0) {
                    const newItems = data.results.map(item => ({
                        year: item.year,
                        month: item.month,
                        label: formatMonthLabel(item.year, item.month),
                        ndvi: item.ndvi
                    }))

                    newItems.forEach(item => {
                        const key = `${item.year}-${item.month}`
                        fetchedMonthsRef.current.add(key)
                    })

                    setPlotData(prev => {
                        const existingKeys = new Set(prev.map(d => `${d.year}-${d.month}`))
                        const itemsToAdd = newItems.filter(item => !existingKeys.has(`${item.year}-${item.month}`))
                        return [...prev, ...itemsToAdd].sort((a, b) => {
                            if (a.year !== b.year) return a.year - b.year
                            return a.month - b.month
                        })
                    })

                    if (secondPoint && secondPoint.lat && secondPoint.lon && !secondFetchingRef.current) {
                        fetch(`/api/ndvi/point/months/expand`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                lat: secondPoint.lat,
                                lon: secondPoint.lon,
                                startYear: lastMonth.year,
                                startMonth: lastMonth.month,
                                direction: "right",
                                offset,
                                bbox: bboxStr,
                                cloud: cloudTolerance
                            })
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error("Failed to fetch second point months data")
                            }
                            return response.json()
                        })
                        .then(data => {
                            if (data.results && data.results.length > 0) {
                                const secondNewItems = data.results.map(item => ({
                                    year: item.year,
                                    month: item.month,
                                    label: formatMonthLabel(item.year, item.month),
                                    ndvi: item.ndvi
                                }))

                                secondNewItems.forEach(item => {
                                    const key = `${item.year}-${item.month}`
                                    secondFetchedMonthsRef.current.add(key)
                                })

                                setSecondPlotData(prev => {
                                    const existingKeys = new Set(prev.map(d => `${d.year}-${d.month}`))
                                    const itemsToAdd = secondNewItems.filter(item => !existingKeys.has(`${item.year}-${item.month}`))
                                    return [...prev, ...itemsToAdd].sort((a, b) => {
                                        if (a.year !== b.year) return a.year - b.year
                                        return a.month - b.month
                                    })
                                })
                            }
                        })
                        .catch(error => {
                            console.error("Error fetching second point months data:", error)
                        })
                    }
                }

                setLoading(false)
                fetchingRef.current = false
            })
            .catch(error => {
                console.error("Error fetching months data:", error)
                setLoading(false)
                fetchingRef.current = false
            })
        }, 1000)
    }
    
    const statusMessageStyle = {
        fontSize: "14px",
        color: "#333",
        backgroundColor: "#f0f8ff",
        border: "1px solid #b3d9ff",
        borderRadius: "4px",
        padding: "10px 15px",
        marginBottom: "15px",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px"
    }

    const spinnerStyle = {
        display: "inline-block",
        width: "14px",
        height: "14px",
        border: "2px solid #b3d9ff",
        borderTop: "2px solid #0066cc",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
    }

    return (
        <div>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
            {isReloading ? (
                <div style={statusMessageStyle}>
                    <div style={spinnerStyle}></div>
                    <span>Reloading ...</span>
                </div>
            ) : isLoading || (ndvi === null || ndvi === undefined) ? (
                <div style={statusMessageStyle}>
                    <div style={spinnerStyle}></div>
                    <span>Calculating NDVI ...</span>
                </div>
            ) : ndvi !== null && ndvi !== undefined ? (
                <div style={{ fontSize: "16px", marginBottom: "20px" }}>
                    {(() => {
                        const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                        const timeLabel = selectedYear && selectedMonth 
                            ? ` (${MONTH_NAMES[selectedMonth - 1]} ${selectedYear})`
                            : ""
                        return <>NDVI{timeLabel}: {ndvi.toFixed(2)}</>
                    })()}
                </div>
            ) : null}
            {!isReloading && !isLoading && !loading && plotData.length > 0 && (
                <>
                    {secondPlotData.length > 0 && (
                        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px", marginBottom: "10px" }}>
                            <div 
                                style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "5px", 
                                    cursor: "pointer",
                                    opacity: firstPointHidden ? 0.5 : 1
                                }}
                                onClick={() => {
                                    if (chartRef.current) {
                                        const meta = chartRef.current.getDatasetMeta(0)
                                        meta.hidden = !meta.hidden
                                        setFirstPointHidden(meta.hidden)
                                        chartRef.current.update()
                                    }
                                }}
                            >
                                <img 
                                    src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png" 
                                    alt="Blue marker" 
                                    style={{ width: "16px", height: "25px" }}
                                />
                                <div style={{ width: "30px", height: "3px", backgroundColor: "rgb(0, 123, 255)" }}></div>
                            </div>
                            <div 
                                style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "5px", 
                                    cursor: "pointer",
                                    opacity: secondPointHidden ? 0.5 : 1
                                }}
                                onClick={() => {
                                    if (chartRef.current) {
                                        const meta = chartRef.current.getDatasetMeta(1)
                                        meta.hidden = !meta.hidden
                                        setSecondPointHidden(meta.hidden)
                                        chartRef.current.update()
                                    }
                                }}
                            >
                                <img 
                                    src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" 
                                    alt="Red marker" 
                                    style={{ width: "16px", height: "25px" }}
                                />
                                <div style={{ width: "30px", height: "3px", backgroundColor: "rgb(220, 53, 69)" }}></div>
                            </div>
                        </div>
                    )}
                    <div style={{ width: "100%", height: "350px", marginTop: "20px" }}>
                        <Line ref={chartRef} data={chartData} options={chartOptions} />
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
                        const validSecondNdviValues = secondPlotData.filter(d => d.ndvi !== null && d.ndvi !== undefined).map(d => d.ndvi)
                        const secondAverage = validSecondNdviValues.length > 0 
                            ? validSecondNdviValues.reduce((sum, val) => sum + val, 0) / validSecondNdviValues.length 
                            : null
                        return (
                            <>
                                {average !== null ? (
                                    <div style={{ fontSize: "14px", color: "#666", marginTop: "10px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                                        <img 
                                            src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png" 
                                            alt="Blue marker" 
                                            style={{ width: "20px", height: "32px" }}
                                        />
                                        <span>Average: {average.toFixed(2)}</span>
                                    </div>
                                ) : null}
                                {secondAverage !== null ? (
                                    <div style={{ fontSize: "14px", color: "#666", marginTop: "5px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                                        <img 
                                            src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" 
                                            alt="Red marker" 
                                            style={{ width: "20px", height: "32px" }}
                                        />
                                        <span>Average: {secondAverage.toFixed(2)}</span>
                                    </div>
                                ) : null}
                            </>
                        )
                    })()}
                </>
            )}
            {loading && (
                <div style={{
                    fontSize: "14px",
                    color: "#333",
                    backgroundColor: "#f0f8ff",
                    border: "1px solid #b3d9ff",
                    borderRadius: "4px",
                    padding: "10px 15px",
                    marginTop: "20px",
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                }}>
                    <div style={{
                        display: "inline-block",
                        width: "14px",
                        height: "14px",
                        border: "2px solid #b3d9ff",
                        borderTop: "2px solid #0066cc",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                    }}></div>
                    <span>Loading chart data...</span>
                </div>
            )}
        </div>
    )
}
