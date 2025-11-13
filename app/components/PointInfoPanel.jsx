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
import { MONTH_NAMES_SHORT, MONTH_NAMES_FULL, MIN_YEAR, MIN_MONTH } from "@/app/lib/constants"
import { formatMonthLabel, formatMonthLabelFull, getPreviousMonth, getNextMonth } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"
import PointStatusMessage from "./PointStatusMessage"
import PointNdviDisplay from "./PointNdviDisplay"
import SecondPointNdviDisplay from "./SecondPointNdviDisplay"
import ChartSection from "./ChartSection"
import ChartAverages from "./ChartAverages"
import ChartLoadingMessage from "./ChartLoadingMessage"

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
)

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
        
        const bboxStr = bboxToString(rectangleBounds)
        
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
                        size: 13
                    }
                }
            },
            y: {
                min: -1,
                max: 1,
                ticks: {
                    font: {
                        size: 13
                    }
                },
                title: {
                    display: true,
                    text: "NDVI",
                    font: {
                        size: 13
                    },
                    rotation: -90
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
            const bboxStr = bboxToString(rectangleBounds)

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
            const bboxStr = bboxToString(rectangleBounds)

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
    

    const handleFirstPointToggle = () => {
        if (chartRef.current) {
            const meta = chartRef.current.getDatasetMeta(0)
            meta.hidden = !meta.hidden
            setFirstPointHidden(meta.hidden)
            chartRef.current.update()
        }
    }

    const handleSecondPointToggle = () => {
        if (chartRef.current) {
            const meta = chartRef.current.getDatasetMeta(1)
            meta.hidden = !meta.hidden
            setSecondPointHidden(meta.hidden)
            chartRef.current.update()
        }
    }

    return (
        <div>
            <PointStatusMessage 
                isReloading={isReloading}
                isLoading={isLoading}
                ndvi={ndvi}
            />
            <PointNdviDisplay 
                ndvi={ndvi}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                isLoading={isLoading}
            />
            <SecondPointNdviDisplay 
                secondPoint={secondPoint}
                secondPlotData={secondPlotData}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
            />
            {!isReloading && !isLoading && !loading && plotData.length > 0 && (
                <>
                    <ChartSection 
                        chartData={chartData}
                        chartOptions={chartOptions}
                        chartRef={chartRef}
                        plotData={plotData}
                        loading={loading}
                        canGoLeft={canGoLeft}
                        canGoRight={canGoRight}
                        onLeftArrow={handleLeftArrow}
                        onRightArrow={handleRightArrow}
                        firstPointHidden={firstPointHidden}
                        secondPointHidden={secondPointHidden}
                        onFirstPointToggle={handleFirstPointToggle}
                        onSecondPointToggle={handleSecondPointToggle}
                        secondPlotData={secondPlotData}
                    />
                    <ChartAverages 
                        plotData={plotData}
                        secondPlotData={secondPlotData}
                    />
                </>
            )}
            <ChartLoadingMessage 
                loading={loading}
                secondLoading={secondLoading}
            />
        </div>
    )
}
