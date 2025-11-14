"use client"
import { useState, useEffect } from "react"
import { ndviToColor } from "@/app/lib/ndviColorUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"

export default function AreaSnapshot({ area, year, month, rectangleBounds, cloudTolerance, ndvi, size = 40 }) {
    const [showPopup, setShowPopup] = useState(false)
    const [tileUrl, setTileUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    
    useEffect(() => {
        if (showPopup && year && month && rectangleBounds) {
            setLoading(true)
            const dateRange = getMonthDateRange(year, month)
            const bboxStr = bboxToString(rectangleBounds)
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
            
            if (geometry) {
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
                            setTileUrl(data.tileUrl)
                        }
                        setLoading(false)
                    })
                    .catch(err => {
                        console.error("Error fetching area snapshot:", err)
                        setLoading(false)
                    })
            } else {
                setLoading(false)
            }
        }
    }, [showPopup, year, month, rectangleBounds, cloudTolerance, area])
    
    const color = ndviToColor(ndvi)
    
    if (ndvi === null || ndvi === undefined) {
        return (
            <div style={{ display: "inline-block", textAlign: "center" }}>
                <div
                    style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        borderRadius: "50%",
                        backgroundColor: "#808080",
                        border: "1px solid #ccc",
                        cursor: "pointer",
                        display: "inline-block"
                    }}
                    onClick={() => setShowPopup(true)}
                    title="No data"
                />
                {showPopup && (
                    <div
                        style={{
                            position: "fixed",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            backgroundColor: "white",
                            border: "2px solid #333",
                            borderRadius: "8px",
                            padding: "20px",
                            zIndex: 10000,
                            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                            maxWidth: "90vw",
                            maxHeight: "90vh"
                        }}
                    >
                        <div style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "bold" }}>
                            Area NDVI Snapshot
                        </div>
                        {loading ? (
                            <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
                        ) : tileUrl ? (
                            <img 
                                src={tileUrl.replace("{z}", "10").replace("{x}", "512").replace("{y}", "512")}
                                alt="NDVI Overlay"
                                style={{
                                    maxWidth: "600px",
                                    maxHeight: "600px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px"
                                }}
                            />
                        ) : (
                            <div style={{ textAlign: "center", padding: "40px" }}>No image available</div>
                        )}
                        <button
                            onClick={() => {
                                setShowPopup(false)
                                setTileUrl(null)
                            }}
                            style={{
                                display: "block",
                                margin: "10px auto 0",
                                padding: "8px 16px",
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
                )}
            </div>
        )
    }
    
    return (
        <div style={{ display: "inline-block", textAlign: "center" }}>
            <div
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: "1px solid #ccc",
                    cursor: "pointer",
                    display: "inline-block"
                }}
                onClick={() => setShowPopup(true)}
                title={`NDVI: ${ndvi !== null ? ndvi.toFixed(2) : 'N/A'}`}
            />
            {showPopup && (
                <>
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0,0,0,0.5)",
                            zIndex: 9999
                        }}
                        onClick={() => {
                            setShowPopup(false)
                            setTileUrl(null)
                        }}
                    />
                    <div
                        style={{
                            position: "fixed",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            backgroundColor: "white",
                            border: "2px solid #333",
                            borderRadius: "8px",
                            padding: "20px",
                            zIndex: 10000,
                            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                            maxWidth: "90vw",
                            maxHeight: "90vh"
                        }}
                    >
                        <div style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "bold" }}>
                            Area NDVI Snapshot
                        </div>
                        {loading ? (
                            <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
                        ) : tileUrl ? (
                            <img 
                                src={tileUrl.replace("{z}", "10").replace("{x}", "512").replace("{y}", "512")}
                                alt="NDVI Overlay"
                                style={{
                                    maxWidth: "600px",
                                    maxHeight: "600px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px"
                                }}
                            />
                        ) : (
                            <div style={{ textAlign: "center", padding: "40px" }}>
                                <div
                                    style={{
                                        width: "200px",
                                        height: "200px",
                                        borderRadius: "50%",
                                        backgroundColor: color,
                                        border: "2px solid #333",
                                        margin: "0 auto 10px"
                                    }}
                                />
                                <div>NDVI: {ndvi !== null ? ndvi.toFixed(2) : 'N/A'}</div>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                setShowPopup(false)
                                setTileUrl(null)
                            }}
                            style={{
                                display: "block",
                                margin: "10px auto 0",
                                padding: "8px 16px",
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
                </>
            )}
        </div>
    )
}

