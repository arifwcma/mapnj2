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

export default function CompareSnapshots({ selectedAreas, cloudTolerance, visibleRange, selectedMonths = null, onShare, isOpen: externalIsOpen, setIsOpen: setExternalIsOpen }) {
    const [showPopup, setShowPopup] = useState(false)
    const [shareLoading, setShareLoading] = useState(false)
    const [shareUrl, setShareUrl] = useState("")
    const [showShareModal, setShowShareModal] = useState(false)
    const shareUrlInputRef = useRef(null)
    
    const isControlled = externalIsOpen !== undefined
    const isOpen = isControlled ? externalIsOpen : showPopup
    const setIsOpen = isControlled ? setExternalIsOpen : setShowPopup
    
    useEffect(() => {
        if (isControlled && externalIsOpen !== undefined) {
            setShowPopup(externalIsOpen)
        }
    }, [externalIsOpen, isControlled])
    const [tileUrls, setTileUrls] = useState({})
    const [loading, setLoading] = useState({})
    const fetchedRef = useRef(new Set())
    
    useEffect(() => {
        if (!isOpen || selectedAreas.length === 0) {
            fetchedRef.current.clear()
            return
        }
        
        if (!selectedMonths && !visibleRange) {
            fetchedRef.current.clear()
            return
        }
        
        const months = selectedMonths && selectedMonths.length > 0 
            ? [...selectedMonths] 
            : getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth)
        
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
    }, [isOpen, visibleRange, cloudTolerance, selectedAreas, selectedMonths])
    
    const months = selectedMonths && selectedMonths.length > 0 
        ? [...selectedMonths] 
        : (visibleRange ? getAllMonthsInRange(visibleRange.startMonth, visibleRange.endMonth) : [])
    
    const handleClose = () => {
        setIsOpen(false)
        setTileUrls({})
        setLoading({})
        fetchedRef.current.clear()
    }
    
    const handleShare = async () => {
        if (!onShare || shareLoading) return
        setShowShareModal(true)
        setShareLoading(true)
        setShareUrl("")
        try {
            const token = await onShare(false)
            if (token) {
                const url = new URL(window.location.href)
                url.searchParams.set('share', token)
                const urlString = url.toString()
                setShareUrl(urlString)
            }
        } catch (error) {
            console.error('Error sharing:', error)
            alert('Error creating share link. Please try again.')
            setShowShareModal(false)
        } finally {
            setShareLoading(false)
        }
    }
    
    const handleCopyFromModal = async () => {
        if (shareUrlInputRef.current) {
            shareUrlInputRef.current.select()
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(shareUrl)
                    setShowShareModal(false)
                } else {
                    const successful = document.execCommand('copy')
                    if (successful) {
                        setShowShareModal(false)
                    }
                }
            } catch (error) {
                console.error('Copy failed:', error)
            }
        }
    }
    
    useEffect(() => {
        if (showShareModal && shareUrl && shareUrlInputRef.current) {
            shareUrlInputRef.current.select()
        }
    }, [showShareModal, shareUrl])
    
    if (selectedAreas.length === 0) {
        return null
    }
    
    if (!selectedMonths && !visibleRange) {
        return null
    }
    
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    margin: "10px 0",
                    cursor: "pointer",
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
            
            {isOpen && (
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
                            maxWidth: "1600px",
                            maxHeight: "95vh",
                            display: "flex",
                            flexDirection: "column",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div 
                            style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center", 
                                marginBottom: "20px",
                            }}
                        >
                            <div style={{ fontWeight: "bold" }}>
                                Compare Snapshots
                            </div>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                {onShare && (
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            handleShare()
                                        }}
                                        style={{
                                            color: "#0066cc",
                                            textDecoration: "underline",
                                            cursor: "pointer",
                                            fontSize: "14px"
                                        }}
                                    >
                                        Share
                                    </a>
                                )}
                                <button
                                    onClick={handleClose}
                                    style={{
                                        padding: "6px 12px",
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
            
            {showShareModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 20000
                    }}
                    onClick={() => setShowShareModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: "white",
                            padding: "20px",
                            borderRadius: "8px",
                            maxWidth: "600px",
                            width: "90%",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>Share Link</h3>
                            <button
                                onClick={() => setShowShareModal(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    color: "#666",
                                    padding: 0,
                                    width: "30px",
                                    height: "30px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                ×
                            </button>
                        </div>
                        {shareLoading ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
                                <div
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        border: "4px solid #f3f3f3",
                                        borderTop: "4px solid #0066cc",
                                        borderRadius: "50%",
                                        animation: "spin 1s linear infinite"
                                    }}
                                />
                                <p style={{ marginTop: "15px", color: "#666", fontSize: "14px" }}>Creating share link...</p>
                                <style>{`
                                    @keyframes spin {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                `}</style>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: "15px" }}>
                                    <input
                                        ref={shareUrlInputRef}
                                        type="text"
                                        value={shareUrl}
                                        readOnly
                                        style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid #ccc",
                                            borderRadius: "4px",
                                            fontSize: "14px",
                                            fontFamily: "monospace"
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleCopyFromModal}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        backgroundColor: "#0066cc",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "bold"
                                    }}
                                >
                                    Copy URL
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

