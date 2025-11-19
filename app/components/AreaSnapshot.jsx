"use client"
import { useState, useEffect } from "react"
import { getMonthDateRange, formatMonthLabel } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"
import { MONTH_NAMES_FULL } from "@/app/lib/config"

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

function latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom)
    const x = Math.floor((lng + 180) / 360 * n)
    const latRad = lat * Math.PI / 180
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
    return { x, y, z: zoom }
}

function getAreaCenter(area) {
    if (area.bounds) {
        const centerLat = (area.bounds[0][0] + area.bounds[1][0]) / 2
        const centerLon = (area.bounds[0][1] + area.bounds[1][1]) / 2
        return { lat: centerLat, lon: centerLon }
    }
    if (area.geometry?.geometry?.type === "Polygon" && area.geometry.geometry.coordinates?.[0]) {
        const coords = area.geometry.geometry.coordinates[0]
        let sumLat = 0, sumLon = 0
        for (let i = 0; i < coords.length - 1; i++) {
            sumLon += coords[i][0]
            sumLat += coords[i][1]
        }
        return {
            lat: sumLat / (coords.length - 1),
            lon: sumLon / (coords.length - 1)
        }
    }
    return null
}

export default function AreaSnapshot({ area, rectangleBounds, cloudTolerance, visibleRange }) {
    const [showPopup, setShowPopup] = useState(false)
    const [tileUrls, setTileUrls] = useState({})
    const [loading, setLoading] = useState({})
    
    useEffect(() => {
        if (showPopup && visibleRange && rectangleBounds) {
            const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
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
            
            const bboxStr = bboxToString(rectangleBounds)
            const newLoading = {}
            const newTileUrls = {}
            
            months.forEach(({ year, month }) => {
                const key = `${year}-${month}`
                newLoading[key] = true
                
                const dateRange = getMonthDateRange(year, month)
                const params = new URLSearchParams({
                    start: dateRange.start,
                    end: dateRange.end,
                    bbox: bboxStr,
                    cloud: cloudTolerance.toString(),
                    geometry: JSON.stringify(geometry)
                })
                
                fetch(`/api/ndvi/average?${params.toString()}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.tileUrl) {
                            setTileUrls(prev => ({ ...prev, [key]: data.tileUrl }))
                        }
                        setLoading(prev => ({ ...prev, [key]: false }))
                    })
                    .catch(err => {
                        console.error(`Error fetching tile for ${year}-${month}:`, err)
                        setLoading(prev => ({ ...prev, [key]: false }))
                    })
            })
            
            setLoading(newLoading)
        }
    }, [showPopup, visibleRange, rectangleBounds, cloudTolerance, area])
    
    const handleClose = () => {
        setShowPopup(false)
        setTileUrls({})
        setLoading({})
    }
    
    if (!visibleRange) {
        return null
    }
    
    const months = getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
    const center = getAreaCenter(area)
    const popupTile = center ? latLngToTile(center.lat, center.lon, 13) : null
    
    return (
        <>
            <div
                style={{
                    display: "inline-block",
                    cursor: "pointer",
                    verticalAlign: "middle",
                    fontSize: "18px",
                    color: "#007bff",
                    padding: "4px 8px"
                }}
                onClick={() => setShowPopup(true)}
                title="View snapshots"
            >
                👁️
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
                            transform: "translate(-50%, -50%)",
                            backgroundColor: "white",
                            borderRadius: "8px",
                            padding: "20px",
                            zIndex: 10000,
                            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                            width: "95vw",
                            maxWidth: "1400px",
                            maxHeight: "95vh",
                            overflow: "auto",
                            display: "flex",
                            flexDirection: "column"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                                Area Snapshots
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
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                                gap: "20px",
                                width: "100%"
                            }}
                        >
                            {months.map(({ year, month }) => {
                                const key = `${year}-${month}`
                                const isLoading = loading[key]
                                const tileUrl = tileUrls[key]
                                
                                return (
                                    <div
                                        key={key}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            position: "relative"
                                        }}
                                    >
                                        {isLoading ? (
                                            <div
                                                style={{
                                                    width: "100%",
                                                    aspectRatio: "4/3",
                                                    backgroundColor: "#f0f0f0",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "14px",
                                                    color: "#666"
                                                }}
                                            >
                                                Loading...
                                            </div>
                                        ) : tileUrl && popupTile ? (
                                            <div style={{ position: "relative", width: "100%" }}>
                                                <img
                                                    src={tileUrl
                                                        .replace("{z}", popupTile.z.toString())
                                                        .replace("{x}", popupTile.x.toString())
                                                        .replace("{y}", popupTile.y.toString())}
                                                    alt={`NDVI ${year} ${MONTH_NAMES_FULL[month - 1]}`}
                                                    style={{
                                                        width: "100%",
                                                        height: "auto",
                                                        display: "block",
                                                        aspectRatio: "4/3",
                                                        objectFit: "cover"
                                                    }}
                                                />
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        backgroundColor: "rgba(0,0,0,0.7)",
                                                        color: "white",
                                                        padding: "6px 8px",
                                                        fontSize: "13px",
                                                        textAlign: "center"
                                                    }}
                                                >
                                                    {formatMonthLabel(year, month)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    width: "100%",
                                                    aspectRatio: "4/3",
                                                    backgroundColor: "#e0e0e0",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "14px",
                                                    color: "#666"
                                                }}
                                            >
                                                <div>No data</div>
                                                <div
                                                    style={{
                                                        marginTop: "8px",
                                                        fontSize: "13px",
                                                        color: "#999"
                                                    }}
                                                >
                                                    {formatMonthLabel(year, month)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </>
    )
}
