"use client"
import { useState } from "react"
import { getNdviColor } from "@/app/lib/ndviColorUtils"

export default function PointSnapshot({ ndvi, size = 40 }) {
    const [showPopup, setShowPopup] = useState(false)
    const color = getNdviColor(ndvi)
    
    if (ndvi === null || ndvi === undefined) {
        return null
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
                        onClick={() => setShowPopup(false)}
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
                            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
                        }}
                    >
                        <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
                            NDVI Snapshot
                        </div>
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
                        <div style={{ textAlign: "center", marginBottom: "10px" }}>
                            NDVI: {ndvi !== null ? ndvi.toFixed(2) : 'N/A'}
                        </div>
                        <button
                            onClick={() => setShowPopup(false)}
                            style={{
                                display: "block",
                                margin: "0 auto",
                                padding: "8px 16px",
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

