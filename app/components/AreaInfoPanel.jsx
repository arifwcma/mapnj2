"use client"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
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
import { MIN_YEAR, MIN_MONTH, DEFAULT_SATELLITE, getSatelliteConfig } from "@/app/lib/config"
import { formatMonthLabel, getPreviousMonth, getNextMonth, monthKey } from "@/app/lib/dateUtils"
import useAreaDataMap from "@/app/hooks/useAreaDataMap"
import useRequestTracker from "@/app/hooks/useRequestTracker"
import { Line } from "react-chartjs-2"
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

function getInitialVisibleRange(selectedYear, selectedMonth, endYear, endMonthNum, satellite = DEFAULT_SATELLITE) {
    if (!selectedYear || !selectedMonth || !endYear || !endMonthNum) {
        return null
    }
    
    const satelliteConfig = getSatelliteConfig(satellite)
    const minYear = satelliteConfig.minYear
    const minMonth = satelliteConfig.minMonth
    
    const months = []
    let year = selectedYear
    let month = selectedMonth
    
    for (let i = 0; i < 6; i++) {
        if (year < minYear || (year === minYear && month < minMonth)) {
            break
        }
        
        months.unshift({ year, month })
        
        if (month === 1) {
            month = 12
            year--
        } else {
            month--
        }
        
        if (year < minYear || (year === minYear && month < minMonth)) {
            break
        }
    }
    
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
    
    while (true) {
        months.push({ year, month })
        
        if (year === endMonth.year && month === endMonth.month) {
            break
        }
        
        if (month === 12) {
            month = 1
            year++
        } else {
            month++
        }
        
        if (year > endMonth.year || (year === endMonth.year && month > endMonth.month)) {
            break
        }
    }
    
    return months
}

function buildDisplayDataItem(month, dataMap) {
    return {
        year: month.year,
        month: month.month,
        label: formatMonthLabel(month.year, month.month),
        ndvi: dataMap.get(monthKey(month.year, month.month)) ?? null
    }
}

function getColorForArea(index) {
    if (index === 0) return "rgb(0, 123, 255)"
    if (index === 1) return "rgb(220, 53, 69)"
    
    const colors = [
        "rgb(40, 167, 69)",
        "rgb(255, 193, 7)",
        "rgb(23, 162, 184)",
        "rgb(108, 117, 125)",
        "rgb(255, 87, 34)",
        "rgb(156, 39, 176)",
        "rgb(0, 150, 136)",
        "rgb(244, 67, 54)"
    ]
    return colors[(index - 2) % colors.length]
}

function AreaDataWrapper({ area, index, rectangleBounds, cloudTolerance, reliability, requestTracker, onDataMapReady, satellite }) {
    const dataMap = useAreaDataMap(area, rectangleBounds, cloudTolerance, `AREA_${index}`, requestTracker, satellite, reliability)
    
    useEffect(() => {
        onDataMapReady(index, dataMap)
    }, [dataMap, index, onDataMapReady])
    
    return null
}

export default function AreaInfoPanel({ selectedAreas, selectedYear, selectedMonth, endYear, endMonthNum, rectangleBounds, cloudTolerance, reliability = 0, satellite = DEFAULT_SATELLITE }) {
    const requestTracker = useRequestTracker()
    const [areaDataMaps, setAreaDataMaps] = useState([])
    
    const handleDataMapReady = useCallback((index, dataMap) => {
        setAreaDataMaps(prev => {
            const newMaps = [...prev]
            newMaps[index] = dataMap
            return newMaps
        })
    }, [])


    const previousVisibleRangeRef = useRef(null)

    const [visibleRange, setVisibleRange] = useState(() => {
        if (!selectedYear || !selectedMonth || !endYear || !endMonthNum) {
            return null
        }
        return getInitialVisibleRange(selectedYear, selectedMonth, endYear, endMonthNum, satellite)
    })

    const previousSelectedYearRef = useRef(selectedYear)
    const previousSelectedMonthRef = useRef(selectedMonth)
    const previousCloudToleranceRef = useRef(cloudTolerance)

    useEffect(() => {
        const cloudChanged = previousCloudToleranceRef.current !== cloudTolerance
        const timeChanged = previousSelectedYearRef.current !== selectedYear || previousSelectedMonthRef.current !== selectedMonth

        if (cloudChanged) {
            previousCloudToleranceRef.current = cloudTolerance
        }

        if (timeChanged) {
            previousSelectedYearRef.current = selectedYear
            previousSelectedMonthRef.current = selectedMonth
        }

        if (selectedAreas.length === 0) {
            setVisibleRange(null)
            return
        }

        if (cloudChanged) {
            areaDataMaps.forEach(map => {
                if (map) map.reset()
            })
            setVisibleRange(() => {
                if (!selectedYear || !selectedMonth || !endYear || !endMonthNum) {
                    return null
                }
                return getInitialVisibleRange(selectedYear, selectedMonth, endYear, endMonthNum, satellite)
            })
        }

        if (timeChanged) {
            setVisibleRange(() => {
                if (!selectedYear || !selectedMonth || !endYear || !endMonthNum) {
                    return null
                }
                return getInitialVisibleRange(selectedYear, selectedMonth, endYear, endMonthNum, satellite)
            })
        }
    }, [cloudTolerance, selectedYear, selectedMonth, endYear, endMonthNum, selectedAreas.length])

    useEffect(() => {
        if (!visibleRange || selectedAreas.length === 0) {
            return
        }

        const rangeKey = `${visibleRange.startMonth.year}-${visibleRange.startMonth.month}-${visibleRange.endMonth.year}-${visibleRange.endMonth.month}`
        if (previousVisibleRangeRef.current !== rangeKey) {
            requestTracker.clearAll()
            previousVisibleRangeRef.current = rangeKey
        }

        const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        const monthKeys = months.map(m => monthKey(m.year, m.month))

        selectedAreas.forEach((area, index) => {
            if (areaDataMaps[index]) {
                areaDataMaps[index].fetchMissingMonths(monthKeys)
            }
        })
    }, [visibleRange, selectedAreas, requestTracker, areaDataMaps])

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

    const arrowDebounceTimeoutRef = useRef(null)
    const leftArrowClickCountRef = useRef(0)
    const rightArrowClickCountRef = useRef(0)
    const chartRef = useRef(null)
    const [hiddenAreas, setHiddenAreas] = useState(new Set())

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
            const color = getColorForArea(index)
            
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
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: "top"
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

    const canGoLeft = useCallback(() => {
        if (!visibleRange) return false
        const satelliteConfig = getSatelliteConfig(satellite)
        const minYear = satelliteConfig.minYear
        const minMonth = satelliteConfig.minMonth
        const startMonth = visibleRange.startMonth
        return !(startMonth.year < minYear || (startMonth.year === minYear && startMonth.month <= minMonth))
    }, [visibleRange, satellite])

    const canGoRight = useCallback(() => {
        if (!visibleRange) return false
        const endMonth = visibleRange.endMonth
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        return !(endMonth.year > currentYear || (endMonth.year === currentYear && endMonth.month >= currentMonth))
    }, [visibleRange])

    const handleLeftArrow = useCallback(() => {
        if (!visibleRange) {
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

            if (offset === 0) {
                return
            }

            let newStartMonth = { ...visibleRange.startMonth }
            for (let i = 0; i < offset; i++) {
                const prev = getPreviousMonth(newStartMonth.year, newStartMonth.month)
                const satelliteConfig = getSatelliteConfig(satellite)
                const minYear = satelliteConfig.minYear
                const minMonth = satelliteConfig.minMonth
                if (prev.year < minYear || (prev.year === minYear && prev.month < minMonth)) {
                    break
                }
                newStartMonth = prev
            }

            setVisibleRange(prev => ({
                startMonth: newStartMonth,
                endMonth: prev.endMonth
            }))
        }, 1000)
    }, [visibleRange, canGoLeft, satellite])

    const handleRightArrow = useCallback(() => {
        if (!visibleRange) {
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

            if (offset === 0) {
                return
            }

            const now = new Date()
            const currentYear = now.getFullYear()
            const currentMonth = now.getMonth() + 1

            let newEndMonth = { ...visibleRange.endMonth }
            for (let i = 0; i < offset; i++) {
                const next = getNextMonth(newEndMonth.year, newEndMonth.month)
                if (next.year > currentYear || (next.year === currentYear && next.month > currentMonth)) {
                    break
                }
                newEndMonth = next
            }

            setVisibleRange(prev => ({
                startMonth: prev.startMonth,
                endMonth: newEndMonth
            }))
        }, 1000)
    }, [visibleRange, canGoRight])

    const handleAreaToggle = useCallback((index) => {
        if (chartRef.current) {
            const meta = chartRef.current.getDatasetMeta(index)
            meta.hidden = !meta.hidden
            const newHidden = new Set(hiddenAreas)
            if (meta.hidden) {
                newHidden.add(index)
            } else {
                newHidden.delete(index)
            }
            setHiddenAreas(newHidden)
            chartRef.current.update()
        }
    }, [hiddenAreas])

    const isLoading = areaDataMaps.some(map => map && map.isLoading)

    return (
        <div>
            {selectedAreas.map((area, index) => (
                <AreaDataWrapper
                    key={area.id}
                    area={area}
                    index={index}
                    rectangleBounds={rectangleBounds}
                    cloudTolerance={cloudTolerance}
                    reliability={reliability}
                    requestTracker={requestTracker}
                    onDataMapReady={handleDataMapReady}
                    satellite={satellite}
                />
            ))}
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
                                background: "none",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                padding: "8px 12px",
                                cursor: !canGoLeft() ? "not-allowed" : "pointer",
                                opacity: !canGoLeft() ? 0.5 : 1,
                            }}
                        >
                            ←
                        </button>
                        <button
                            onClick={handleRightArrow}
                            disabled={!canGoRight()}
                            style={{
                                background: "none",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                padding: "8px 12px",
                                cursor: !canGoRight() ? "not-allowed" : "pointer",
                                opacity: !canGoRight() ? 0.5 : 1,
                            }}
                        >
                            →
                        </button>
                    </div>
                    {displayData.map((data, index) => {
                        const validData = data.filter(d => d.ndvi !== null && d.ndvi !== undefined)
                        if (validData.length === 0) return null
                        const sum = validData.reduce((acc, d) => acc + d.ndvi, 0)
                        const avg = sum / validData.length
                        return (
                            <div key={index} style={{ marginTop: "10px", textAlign: "center" }}>
                                {selectedAreas[index].label || `Area ${index + 1}`} Average NDVI: {avg.toFixed(4)}
                            </div>
                        )
                    })}
                </>
            )}
            <ChartLoadingMessage 
                loading={isLoading}
            />
        </div>
    )
}

