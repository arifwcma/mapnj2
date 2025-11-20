"use client"
import { useState, useEffect, useRef } from "react"
import { getMonthDateRange, formatMonthLabel } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"
import { MONTH_NAMES_FULL } from "@/app/lib/config"
import { getColorForIndex } from "@/app/lib/colorUtils"

function getAllMonthsInRange(startMonth, endMonth) {
    const months = []
    let year = startMonth.year
    let month = startMonth.month
    
    while (year < endMonth.year || (year === endMonth.year && month <= endMonth.month)) {
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

function calculateAspectRatio(area) {
    if (area.bounds) {
        const latDiff = Math.abs(area.bounds[1][0] - area.bounds[0][0])
        const lonDiff = Math.abs(area.bounds[1][1] - area.bounds[0][1])
        
        if (latDiff === 0) return 2.0
        if (lonDiff === 0) return 0.5
        
        const aspectRatio = lonDiff / latDiff
        return Math.max(0.5, Math.min(2.0, aspectRatio))
    }
    return 4/3
}

export default function CompareSnapshots({ selectedAreas, cloudTolerance, visibleRange }) {
    const [showPopup, setShowPopup] = useState(false)
    const [tileUrls, setTileUrls] = useState({})
    const [loading, setLoading] = useState({})
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
    const fetchedRef = useRef(new Set())
    
    useEffect(() => {
        if (!showPopup || !visibleRange || selectedAreas.length === 0) {
            fetchedRef.current.clear()
            return
        }
        
        const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        
        selectedAreas.forEach((area, areaIndex) => {
            if (!area.bounds) return
            
            const areaBboxStr = bboxToString(area.bounds)
            const geometry = area.geometry || (area.bounds ? {
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [area.bounds[0][1], area.bounds[0][0]],
                        [area.bounds[1][1], area.bounds[0][0]],
                        [area.bounds[1][1], area.bounds[1][0]],
                        [area.bounds[0][1], area.bounds[1][0]],
                        [area.bounds[0][1], area.bounds[0][0]]
                    ]]
                }
            } : null)
            
            if (!geometry) return
            
            months.forEach(({ year, month }) => {
                const key = `${areaIndex}-${year}-${month}`
                
                if (fetchedRef.current.has(key)) {
                    return
                }
                
                fetchedRef.current.add(key)
                setLoading(prev => ({ ...prev, [key]: true }))
                
                const dateRange = getMonthDateRange(year, month)
                
                const requestBody = {
                    start: dateRange.start,
                    end: dateRange.end,
                    bbox: areaBboxStr,
                    cloud: cloudTolerance.toString(),
                    geometry: geometry,
                    thumbnail: "true",
                    dimensions: "1024"
                }
                
                fetch(`/api/ndvi/average`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(async res => {
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}`)
                        }
                        return await res.json()
                    })
                    .then(data => {
                        if (data.imageUrl) {
                            setTileUrls(prev => ({ ...prev, [key]: data.imageUrl }))
                        } else if (data.imageUrl === null) {
                            setTileUrls(prev => ({ ...prev, [key]: null }))
                        }
                        setLoading(prev => ({ ...prev, [key]: false }))
                    })
                    .catch(err => {
                        console.error(`Error fetching snapshot for area ${areaIndex} ${year}-${month}:`, err)
                        setLoading(prev => ({ ...prev, [key]: false }))
                        fetchedRef.current.delete(key)
                    })
            })
        })
    }, [showPopup, visibleRange, cloudTolerance, selectedAreas])
    
    const handleClose = () => {
        setShowPopup(false)
        setTileUrls({})
        setLoading({})
        setPopupPosition({ x: 0, y: 0 })
        fetchedRef.current.clear()
    }
    
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('img') || e.target.closest('table')) {
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
        
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, dragOffset])
    
    if (!visibleRange || selectedAreas.length === 0) {
        return null
    }
    
    const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
    
    return (
        <>
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
                                        {selectedAreas.map((area, index) => (
                                            <th
                                                key={area.id}
                                                style={{
                                                    padding: "12px",
                                                    textAlign: "center",
                                                    minWidth: "200px",
                                                    backgroundColor: "white"
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
                                                    padding: "12px",
                                                    backgroundColor: "white",
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: 9,
                                                    fontWeight: "500"
                                                }}
                                            >
                                                {formatMonthLabel(year, month)}
                                            </td>
                                            {selectedAreas.map((area, areaIndex) => {
                                                const key = `${areaIndex}-${year}-${month}`
                                                const isLoading = loading[key]
                                                const tileUrl = tileUrls[key]
                                                const aspectRatio = calculateAspectRatio(area)
                                                
                                                return (
                                                    <td
                                                        key={`${area.id}-${year}-${month}`}
                                                        style={{
                                                            padding: "8px",
                                                            textAlign: "center",
                                                            verticalAlign: "middle"
                                                        }}
                                                    >
                                                        {isLoading ? (
                                                            <div
                                                                className="w-[180px] bg-gray-100 flex items-center justify-center text-xs text-gray-600 mx-auto"
                                                                style={{ aspectRatio: aspectRatio }}
                                                            >
                                                                <span className="animate-blink text-red-600">Loading...</span>
                                                            </div>
                                                        ) : tileUrl ? (
                                                            <div style={{ position: "relative", width: "180px", margin: "0 auto" }}>
                                                                <img
                                                                    src={tileUrl}
                                                                    alt={`NDVI ${year} ${MONTH_NAMES_FULL[month - 1]} - ${area.label}`}
                                                                    style={{
                                                                        width: "100%",
                                                                        height: "auto",
                                                                        display: "block",
                                                                        aspectRatio: aspectRatio,
                                                                        objectFit: "cover",
                                                                        borderRadius: "4px"
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: "180px",
                                                                    aspectRatio: aspectRatio,
                                                                    backgroundColor: "#e0e0e0",
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontSize: "12px",
                                                                    color: "#666",
                                                                    margin: "0 auto",
                                                                    borderRadius: "4px"
                                                                }}
                                                            >
                                                                <div>No data</div>
                                                            </div>
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

