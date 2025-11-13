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
import { MIN_YEAR, MIN_MONTH } from "@/app/lib/constants"
import { formatMonthLabel, getPreviousMonth, getNextMonth, monthKey } from "@/app/lib/dateUtils"
import usePointDataMap from "@/app/hooks/usePointDataMap"
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

function getInitialVisibleRange(selectedYear, selectedMonth, endYear, endMonthNum) {
    const months = []
    let year = selectedYear
    let month = selectedMonth
    
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

export default function PointInfoPanel({ lat, lon, ndvi, isReloading, isLoading = false, selectedYear, selectedMonth, endYear, endMonthNum, rectangleBounds, cloudTolerance, secondPoint = null, secondPointNdvi = null, secondPointNdviLoading = false, onSecondPointLoadingChange = undefined, onFirstPointMove = undefined, onSecondPointMove = undefined }) {
    const firstPoint = lat !== null && lon !== null ? { lat, lon } : null
    const secondPointForHook = secondPoint && secondPoint.lat !== null && secondPoint.lon !== null ? secondPoint : null

    const blueDataMap = usePointDataMap(firstPoint, rectangleBounds, cloudTolerance)
    const redDataMap = usePointDataMap(secondPointForHook, rectangleBounds, cloudTolerance)

    const [visibleRange, setVisibleRange] = useState(() => {
        if (!selectedYear || !selectedMonth || !endYear || !endMonthNum) {
            return null
        }
        return getInitialVisibleRange(selectedYear, selectedMonth, endYear, endMonthNum)
    })

    const previousSelectedYearRef = useRef(selectedYear)
    const previousSelectedMonthRef = useRef(selectedMonth)
    const previousCloudToleranceRef = useRef(cloudTolerance)
    const previousFirstPointLatRef = useRef(lat)
    const previousFirstPointLonRef = useRef(lon)

    useEffect(() => {
        if (onSecondPointLoadingChange) {
            onSecondPointLoadingChange(redDataMap.isLoading)
        }
    }, [redDataMap.isLoading, onSecondPointLoadingChange])

    useEffect(() => {
        const cloudChanged = previousCloudToleranceRef.current !== cloudTolerance
        const timeChanged = previousSelectedYearRef.current !== selectedYear || previousSelectedMonthRef.current !== selectedMonth
        const pointChanged = previousFirstPointLatRef.current !== lat || previousFirstPointLonRef.current !== lon

        if (cloudChanged) {
            previousCloudToleranceRef.current = cloudTolerance
        }

        if (timeChanged) {
            previousSelectedYearRef.current = selectedYear
            previousSelectedMonthRef.current = selectedMonth
        }

        if (pointChanged) {
            previousFirstPointLatRef.current = lat
            previousFirstPointLonRef.current = lon
        }

        if (!firstPoint) {
            setVisibleRange(null)
            return
        }

        if (cloudChanged || timeChanged) {
            setVisibleRange(() => {
                if (!selectedYear || !selectedMonth || !endYear || !endMonthNum) {
                    return null
                }
                return getInitialVisibleRange(selectedYear, selectedMonth, endYear, endMonthNum)
            })
        }
    }, [cloudTolerance, selectedYear, selectedMonth, endYear, endMonthNum, lat, lon, firstPoint])

    useEffect(() => {
        if (!visibleRange || !firstPoint && !secondPointForHook) {
            return
        }

        const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        const monthKeys = months.map(m => monthKey(m.year, m.month))

        if (firstPoint) {
            blueDataMap.fetchMissingMonths(monthKeys)
        }

        if (secondPointForHook) {
            redDataMap.fetchMissingMonths(monthKeys)
        }
    }, [visibleRange, firstPoint, secondPointForHook, blueDataMap, redDataMap])

    const displayData = useMemo(() => {
        if (!visibleRange) {
            return { blueData: [], redData: [] }
        }

        const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        
        const blueData = months.map(m => buildDisplayDataItem(m, blueDataMap.dataMap))
        const redData = months.map(m => buildDisplayDataItem(m, redDataMap.dataMap))

        return { blueData, redData }
    }, [visibleRange, blueDataMap.dataMap, redDataMap.dataMap])

    const arrowDebounceTimeoutRef = useRef(null)
    const leftArrowClickCountRef = useRef(0)
    const rightArrowClickCountRef = useRef(0)
    const chartRef = useRef(null)
    const [firstPointHidden, setFirstPointHidden] = useState(false)
    const [secondPointHidden, setSecondPointHidden] = useState(false)

    const chartData = useMemo(() => {
        const labels = displayData.blueData.length > 0 
            ? displayData.blueData.map(d => d.label)
            : displayData.redData.map(d => d.label)

        const blueValues = labels.map(label => {
            const blueItem = displayData.blueData.find(d => d.label === label)
            return blueItem ? blueItem.ndvi : null
        })

        const redValues = labels.map(label => {
            const redItem = displayData.redData.find(d => d.label === label)
            return redItem ? redItem.ndvi : null
        })

        return {
            labels,
            datasets: [
                ...(displayData.blueData.length > 0 ? [{
                    label: "First Point",
                    data: blueValues,
                    borderColor: "rgb(0, 123, 255)",
                    backgroundColor: "rgba(0, 123, 255, 0.1)",
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: "rgb(0, 123, 255)",
                    tension: 0.1
                }] : []),
                ...(displayData.redData.length > 0 ? [{
                    label: "Second Point",
                    data: redValues,
                    borderColor: "rgb(220, 53, 69)",
                    backgroundColor: "rgba(220, 53, 69, 0.1)",
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: "rgb(220, 53, 69)",
                    tension: 0.1
                }] : [])
            ]
        }
    }, [displayData])
    
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

    const canGoLeft = useCallback(() => {
        if (!visibleRange) return false
        const startMonth = visibleRange.startMonth
        return !(startMonth.year < MIN_YEAR || (startMonth.year === MIN_YEAR && startMonth.month <= MIN_MONTH))
    }, [visibleRange])

    const canGoRight = useCallback(() => {
        if (!visibleRange) return false
        const endMonth = visibleRange.endMonth
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        return !(endMonth.year > currentYear || (endMonth.year === currentYear && endMonth.month >= currentMonth))
    }, [visibleRange])

    const handleLeftArrow = useCallback(() => {
        if (!visibleRange || blueDataMap.isLoading || redDataMap.isLoading) {
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
                if (prev.year < MIN_YEAR || (prev.year === MIN_YEAR && prev.month < MIN_MONTH)) {
                    break
                }
                newStartMonth = prev
            }

            setVisibleRange(prev => ({
                startMonth: newStartMonth,
                endMonth: prev.endMonth
            }))
        }, 1000)
    }, [visibleRange, blueDataMap.isLoading, redDataMap.isLoading, canGoLeft])

    const handleRightArrow = useCallback(() => {
        if (!visibleRange || blueDataMap.isLoading || redDataMap.isLoading) {
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
    }, [visibleRange, blueDataMap.isLoading, redDataMap.isLoading, canGoRight])

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
                secondNdvi={secondPointNdvi}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                isLoading={secondPointNdviLoading}
            />
            {!isReloading && !isLoading && displayData.blueData.length > 0 && (
                <>
                    <ChartSection 
                        chartData={chartData}
                        chartOptions={chartOptions}
                        chartRef={chartRef}
                        plotData={displayData.blueData}
                        loading={blueDataMap.isLoading || redDataMap.isLoading}
                        canGoLeft={canGoLeft}
                        canGoRight={canGoRight}
                        onLeftArrow={handleLeftArrow}
                        onRightArrow={handleRightArrow}
                        firstPointHidden={firstPointHidden}
                        secondPointHidden={secondPointHidden}
                        onFirstPointToggle={handleFirstPointToggle}
                        onSecondPointToggle={handleSecondPointToggle}
                        secondPlotData={displayData.redData}
                    />
                    <ChartAverages 
                        plotData={displayData.blueData}
                        secondPlotData={displayData.redData}
                    />
                </>
            )}
            <ChartLoadingMessage 
                loading={blueDataMap.isLoading || redDataMap.isLoading}
            />
        </div>
    )
}

