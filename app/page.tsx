"use client"
import MapView from "@/app/components/MapView"
import useRectangleDraw from "@/app/hooks/useRectangleDraw"

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

    const handleButtonClick = () => {
        if (rectangleBounds) {
            resetRectangle()
        } else {
            startDrawing()
        }
    }

    return (
        <div>
            {isDrawing ? (
                <span style={{ padding: "10px 0", margin: "10px", fontSize: "16px", display: "inline-block" }}>
                    Click and drag to draw area ...
                </span>
            ) : (
                <button
                    onClick={handleButtonClick}
                    style={{
                        background: "none",
                        border: "none",
                        padding: "10px 0",
                        margin: "10px",
                        cursor: "pointer",
                        fontSize: "16px",
                        color: "#0066cc",
                        textDecoration: "none",
                        fontFamily: "inherit"
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                    onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                >
                    {rectangleBounds ? "Reset area of interest" : "Select area of interest"}
                </button>
            )}
            <MapView
                isDrawing={isDrawing}
                rectangleBounds={rectangleBounds}
                currentBounds={currentBounds}
                onStart={setStart}
                onUpdate={updateBounds}
                onEnd={finalizeRectangle}
                onReset={resetRectangle}
            />
        </div>
    )
}