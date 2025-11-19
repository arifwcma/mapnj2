"use client"
import { useState, useEffect } from "react"
import { ndviToColor } from "@/app/lib/ndviColorUtils"
import { getMonthDateRange } from "@/app/lib/dateUtils"
import { bboxToString } from "@/app/lib/bboxUtils"

function latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom)
    const x = Math.floor((lng + 180) / 360 * n)
    const latRad = lat * Math.PI / 180
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
    return { x, y, z: zoom }
}

function getAreaBounds(area) {
    if (area.bounds) {
        return {
            minLat: area.bounds[0][0],
            maxLat: area.bounds[1][0],
            minLon: area.bounds[0][1],
            maxLon: area.bounds[1][1]
        }
    }
    if (area.geometry?.geometry?.type === "Polygon" && area.geometry.geometry.coordinates?.[0]) {
        const coords = area.geometry.geometry.coordinates[0]
        let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
        for (let i = 0; i < coords.length; i++) {
            const [lon, lat] = coords[i]
            minLat = Math.min(minLat, lat)
            maxLat = Math.max(maxLat, lat)
            minLon = Math.min(minLon, lon)
            maxLon = Math.max(maxLon, lon)
        }
        return { minLat, maxLat, minLon, maxLon }
    }
    return null
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

export default function AreaSnapshot({ area, year, month, rectangleBounds, cloudTolerance, ndvi, size = 40 }) {
    const [showPopup, setShowPopup] = useState(false)
    const [tileUrl, setTileUrl] = useState(null)
    const [loading, setLoading] = useState(false)
    const [thumbnailUrl, setThumbnailUrl] = useState(null)
    const [thumbnailLoading, setThumbnailLoading] = useState(false)
    
    useEffect(() => {
        if (year && month && rectangleBounds) {
            setThumbnailLoading(true)
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
                            const center = getAreaCenter(area)
                            if (center) {
                                const thumbnailTile = latLngToTile(center.lat, center.lon, 11)
                                const thumbUrl = data.tileUrl
                                    .replace("{z}", thumbnailTile.z.toString())
                                    .replace("{x}", thumbnailTile.x.toString())
                                    .replace("{y}", thumbnailTile.y.toString())
                                setThumbnailUrl(thumbUrl)
                            }
                        }
                        setThumbnailLoading(false)
                    })
                    .catch(err => {
                        console.error("Error fetching area snapshot:", err)
                        setThumbnailLoading(false)
                    })
            } else {
                setThumbnailLoading(false)
            }
        }
    }, [year, month, rectangleBounds, cloudTolerance, area])
    
    useEffect(() => {
        if (showPopup && tileUrl) {
            setLoading(true)
            setTimeout(() => setLoading(false), 100)
        }
    }, [showPopup, tileUrl])
    
    const color = ndviToColor(ndvi)
    
    if (ndvi === null || ndvi === undefined) {
        return (
            <div style={{ display: "inline-block", textAlign: "center" }}>
                {thumbnailLoading ? (
                    <div
                        style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            borderRadius: "4px",
                            backgroundColor: "#f0f0f0",
                            border: "1px solid #ccc",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            color: "#666"
                        }}
                    >
                        ...
                    </div>
                ) : thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt="Area snapshot"
                        style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            objectFit: "cover",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            cursor: "pointer",
                            display: "inline-block"
                        }}
                        onClick={() => setShowPopup(true)}
                        title="Click to view full size"
                    />
                ) : (
                    <div
                        style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            borderRadius: "4px",
                            backgroundColor: "#808080",
                            border: "1px solid #ccc",
                            cursor: "pointer",
                            display: "inline-block"
                        }}
                        onClick={() => setShowPopup(true)}
                        title="No data"
                    />
                )}
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
                                maxHeight: "90vh",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center"
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "bold" }}>
                                Area NDVI Snapshot
                            </div>
                            {loading ? (
                                <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
                            ) : tileUrl ? (
                            <div style={{ position: "relative", width: "100%", maxWidth: "800px" }}>
                                {(() => {
                                    const center = getAreaCenter(area)
                                    if (center) {
                                        const popupTile = latLngToTile(center.lat, center.lon, 13)
                                        return (
                                            <img
                                                src={tileUrl
                                                    .replace("{z}", popupTile.z.toString())
                                                    .replace("{x}", popupTile.x.toString())
                                                    .replace("{y}", popupTile.y.toString())}
                                                alt="NDVI Overlay"
                                                style={{
                                                    width: "100%",
                                                    height: "auto",
                                                    maxHeight: "70vh",
                                                    border: "1px solid #ccc",
                                                    borderRadius: "4px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                        )
                                    }
                                    return <div>Unable to calculate tile coordinates</div>
                                })()}
                            </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "40px" }}>No image available</div>
                            )}
                            <button
                                onClick={() => {
                                    setShowPopup(false)
                                }}
                                style={{
                                    marginTop: "15px",
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
    
    return (
        <div style={{ display: "inline-block", textAlign: "center" }}>
            {thumbnailLoading ? (
                <div
                    style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        borderRadius: "4px",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ccc",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        color: "#666"
                    }}
                >
                    ...
                </div>
            ) : thumbnailUrl ? (
                <img
                    src={thumbnailUrl}
                    alt="Area snapshot"
                    style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        objectFit: "cover",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "inline-block"
                    }}
                    onClick={() => setShowPopup(true)}
                    title={`NDVI: ${ndvi !== null ? ndvi.toFixed(2) : 'N/A'} - Click to view full size`}
                />
            ) : (
                <div
                    style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        borderRadius: "4px",
                        backgroundColor: color,
                        border: "1px solid #ccc",
                        cursor: "pointer",
                        display: "inline-block"
                    }}
                    onClick={() => setShowPopup(true)}
                    title={`NDVI: ${ndvi !== null ? ndvi.toFixed(2) : 'N/A'}`}
                />
            )}
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
                            maxHeight: "90vh",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "bold" }}>
                            Area NDVI Snapshot
                        </div>
                        {loading ? (
                            <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
                        ) : tileUrl ? (
                            <div style={{ position: "relative", width: "100%", maxWidth: "800px" }}>
                                {(() => {
                                    const center = getAreaCenter(area)
                                    if (center) {
                                        const popupTile = latLngToTile(center.lat, center.lon, 13)
                                        return (
                                            <img
                                                src={tileUrl
                                                    .replace("{z}", popupTile.z.toString())
                                                    .replace("{x}", popupTile.x.toString())
                                                    .replace("{y}", popupTile.y.toString())}
                                                alt="NDVI Overlay"
                                                style={{
                                                    width: "100%",
                                                    height: "auto",
                                                    maxHeight: "70vh",
                                                    border: "1px solid #ccc",
                                                    borderRadius: "4px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                        )
                                    }
                                    return <div>Unable to calculate tile coordinates</div>
                                })()}
                            </div>
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
                            }}
                            style={{
                                marginTop: "15px",
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

