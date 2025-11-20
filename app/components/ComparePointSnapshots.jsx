"use client"
import { useState, useEffect, useRef } from "react"
import { getMonthDateRange, formatMonthLabel } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"
import { MIN_YEAR, MIN_MONTH } from "@/app/lib/config"
import { getColorForIndex } from "@/app/lib/colorUtils"
import PointSnapshot from "./PointSnapshot"

function getAllMonthsInRange(startMonth, endMonth) {
    const months = []
    let year = startMonth.year
    let month = startMonth.month
    
    while (year < endMonth.year || (year === endMonth.year && month <= endMonth.month)) {
        if (year < MIN_YEAR || (year === MIN_YEAR && month < MIN_MONTH)) {
            break
        }
        months.push({ year, month })
        
        if (month === 12) {
            year++
            month = 1
        } else {
            month++
        }
    }
    
    return months
}

export default function ComparePointSnapshots({ selectedPoints, cloudTolerance, visibleRange, rectangleBounds }) {
    const [showPopup, setShowPopup] = useState(false)
    const [ndviData, setNdviData] = useState({})
    const [loading, setLoading] = useState({})
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
    const fetchedRef = useRef(new Set())
    
    useEffect(() => {
        if (!showPopup || !visibleRange || selectedPoints.length === 0 || !rectangleBounds) {
            fetchedRef.current.clear()
            return
        }
        
        const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        const bboxStr = bboxToString(rectangleBounds)
        
        selectedPoints.forEach((point, pointIndex) => {
            months.forEach(({ year, month }) => {
                const key = `${pointIndex}-${year}-${month}`
                
                if (fetchedRef.current.has(key)) {
                    return
                }
                
                fetchedRef.current.add(key)
                setLoading(prev => ({ ...prev, [key]: true }))
                
                const dateRange = getMonthDateRange(year, month)
                const params = new URLSearchParams({
                    lat: point.lat.toString(),
                    lon: point.lon.toString(),
                    start: dateRange.start,
                    end: dateRange.end,
                    bbox: bboxStr,
                    cloud: cloudTolerance.toString()
                })
                
                fetch(`/api/ndvi/point?${params.toString()}`)
                    .then(async res => {
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}`)
                        }
                        return await res.json()
                    })
                    .then(data => {
                        setNdviData(prev => ({ ...prev, [key]: data.ndvi }))
                        setLoading(prev => ({ ...prev, [key]: false }))
                    })
                    .catch(err => {
                        console.error(`Error fetching snapshot for point ${pointIndex} ${year}-${month}:`, err)
                        setNdviData(prev => ({ ...prev, [key]: null }))
                        setLoading(prev => ({ ...prev, [key]: false }))
                        fetchedRef.current.delete(key)
                    })
            })
        })
    }, [showPopup, visibleRange, cloudTolerance, selectedPoints, rectangleBounds])
    
    const handleClose = () => {
        setShowPopup(false)
        setNdviData({})
        setLoading({})
        setPopupPosition({ x: 0, y: 0 })
        fetchedRef.current.clear()
    }
    
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('table')) {
            return
        }
        setIsDragging(true)
        const rect = e.currentTarget.getBoundingClientRect()
        setDragOffset({
            x: e.clientX - rect.left - rect.width / 2,
            y: e.clientY - rect.top - rect.height / 2
        })
    }
    
    useEffect(() => {
        if (!isDragging) return
        
        const handleMouseMove = (e) => {
            setPopupPosition({
                x: e.clientX - window.innerWidth / 2 - dragOffset.x,
                y: e.clientY - window.innerHeight / 2 - dragOffset.y
            })
        }
        
        const handleMouseUp = () => {
            setIsDragging(false)
        }
        
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, dragOffset])
    
    const months = visibleRange ? getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth) : []
    
    if (selectedPoints.length <= 1) {
        return null
    }
    
    return (
        <>
            <div style={{ marginBottom: "15px" }}>
                <button
                    onClick={() => setShowPopup(true)}
                    style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        margin: "10px 0",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "#0066cc",
                        textDecoration: "none",
                        fontFamily: "inherit"
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.textDecoration = "underline"
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.textDecoration = "none"
                    }}
                >
                    Compare snapshots
                </button>
            </div>
            
            {showPopup && (
                <>
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0,0,0,0.7)",
                            zIndex: 9999
                        }}
                        onClick={handleClose}
                    />
                    <div
                        style={{
                            position: "fixed",
                            top: "50%",
                            left: "50%",
                            transform: `translate(calc(-50% + ${popupPosition.x}px), calc(-50% + ${popupPosition.y}px))`,
                            backgroundColor: "white",
                            borderRadius: "8px",
                            padding: "20px",
                            zIndex: 10000,
                            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                            width: "95vw",
                            maxWidth: "1600px",
                            maxHeight: "95vh",
                            display: "flex",
                            flexDirection: "column",
                            cursor: isDragging ? "grabbing" : "default"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div 
                            style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center", 
                                marginBottom: "20px",
                                cursor: "grab",
                                userSelect: "none"
                            }}
                            onMouseDown={handleMouseDown}
                        >
                            <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                                Compare Snapshots
                            </div>
                            <button
                                onClick={handleClose}
                                style={{
                                    padding: "6px 12px",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    backgroundColor: "#dc3545",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px"
                                }}
                            >
                                Close
                            </button>
                        </div>
                        
                        <div
                            style={{
                                overflow: "auto",
                                flex: 1,
                                borderRadius: "4px"
                            }}
                        >
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: "13px"
                                }}
                            >
                                <thead style={{ position: "sticky", top: 0, backgroundColor: "white", zIndex: 10 }}>
                                    <tr>
                                        <th
                                            style={{
                                                padding: "12px",
                                                textAlign: "left",
                                                backgroundColor: "white",
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 11
                                            }}
                                        >
                                            Date
                                        </th>
                                        {selectedPoints.map((point, index) => (
                                            <th
                                                key={point.id}
                                                style={{
                                                    padding: "12px",
                                                    textAlign: "center",
                                                    backgroundColor: "white",
                                                    minWidth: "150px"
                                                }}
                                            >
                                                <div style={{
                                                    width: "20px",
                                                    height: "20px",
                                                    border: `2px solid ${getColorForIndex(index)}`,
                                                    borderRadius: "50%",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "10px",
                                                    fontWeight: "bold",
                                                    color: getColorForIndex(index),
                                                    backgroundColor: "white"
                                                }}>
                                                    {index + 1}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {months.map(({ year, month }) => (
                                        <tr key={`${year}-${month}`}>
                                            <td
                                                style={{
                                                    padding: "8px 12px",
                                                    backgroundColor: "white",
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: 9
                                                }}
                                            >
                                                {formatMonthLabel(year, month)}
                                            </td>
                                            {selectedPoints.map((point, pointIndex) => {
                                                const key = `${pointIndex}-${year}-${month}`
                                                const isLoading = loading[key]
                                                const ndvi = ndviData[key]
                                                return (
                                                    <td
                                                        key={key}
                                                        style={{
                                                            padding: "8px",
                                                            textAlign: "center"
                                                        }}
                                                    >
                                                        {isLoading ? (
                                                            <div className="text-xs text-gray-600">
                                                                <span className="animate-blink text-red-600">Loading...</span>
                                                            </div>
                                                        ) : ndvi !== null && ndvi !== undefined ? (
                                                            <PointSnapshot ndvi={ndvi} size={40} />
                                                        ) : (
                                                            <div style={{ fontSize: "12px", color: "#999" }}>No data</div>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}

