"use client"
import { useEffect } from "react"
import MapView from "@/app/components/MapView"
import useRectangleDraw from "@/app/hooks/useRectangleDraw"
import useNdviData from "@/app/hooks/useNdviData"

export default function Page() {
    const {
        isDrawing,
        rectangleBounds,
        currentBounds,
        startDrawing,
        resetRectangle,
        setStart,
        updateBounds,
        finalizeRectangle
    } = useRectangleDraw()

    const {
        ndviTileUrl,
        endMonth,
        imageCount,
        loading,
        cloudTolerance,
        loadNdviData,
        updateCloudTolerance,
        clearNdvi
    } = useNdviData()

    useEffect(() => {
        if (rectangleBounds) {
            loadNdviData(rectangleBounds, cloudTolerance)
        } else {
            clearNdvi()
        }
    }, [rectangleBounds, loadNdviData, clearNdvi])

    const handleButtonClick = () => {
        if (rectangleBounds) {
            resetRectangle()
            clearNdvi()
        } else {
            startDrawing()
        }
    }

    const handleFinalize = () => {
        finalizeRectangle()
    }

    return (
        <div>
            {isDrawing ? (
                <span style={{ padding: "10px 0", margin: "10px", fontSize: "16px", display: "inline-block" }}>
                    Click and drag to draw area ...
                </span>
            ) : (
                <div style={{ padding: "10px", margin: "10px" }}>
                    <button
                        onClick={handleButtonClick}
                        style={{
                            background: "none",
                            border: "none",
                            padding: "10px 0",
                            margin: "0 0 10px 0",
                            cursor: "pointer",
                            fontSize: "16px",
                            color: "#0066cc",
                            textDecoration: "none",
                            fontFamily: "inherit",
                            display: "block"
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                        onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                    >
                        {rectangleBounds ? "Reset area of interest" : "Select area of interest"}
                    </button>
                    {rectangleBounds && (
                        <>
                            {loading ? (
                                <div style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
                                    Loading NDVI data...
                                </div>
                            ) : endMonth && imageCount !== null ? (
                                <div style={{ fontSize: "14px", color: "#333", marginBottom: "10px" }}>
                                    Average NDVI for {endMonth} (based on {imageCount} images)
                                </div>
                            ) : null}
                            <div style={{ marginTop: "10px" }}>
                                <label style={{ fontSize: "14px", display: "block", marginBottom: "5px" }}>
                                    Cloud tolerance (%): {cloudTolerance}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={cloudTolerance}
                                    onChange={(e) => updateCloudTolerance(parseInt(e.target.value))}
                                    style={{ width: "200px" }}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
            <MapView
                isDrawing={isDrawing}
                rectangleBounds={rectangleBounds}
                currentBounds={currentBounds}
                onStart={setStart}
                onUpdate={updateBounds}
                onEnd={handleFinalize}
                onReset={resetRectangle}
                ndviTileUrl={ndviTileUrl}
            />
        </div>
    )
}