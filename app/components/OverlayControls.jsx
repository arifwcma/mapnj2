"use client"
import NoImageMessage from "./NoImageMessage"

export default function OverlayControls({ overlayType, endMonth, imageCount, isImageAvailable, onOverlayChange }) {
    if (!endMonth || imageCount === null) {
        return null
    }

    if (!isImageAvailable) {
        return <NoImageMessage endMonth={endMonth} />
    }

    return (
        <div style={{ fontSize: "13px", color: "#333", marginBottom: "10px" }}>
            <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "15px" }}>
                <span style={{ fontSize: "13px", color: "#333" }}>Overlay:</span>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input
                        type="radio"
                        name="overlay"
                        value="NDVI"
                        checked={overlayType === "NDVI"}
                        onChange={() => onOverlayChange("NDVI")}
                    />
                    <span style={{ fontSize: "13px", color: "#333" }}>NDVI</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input
                        type="radio"
                        name="overlay"
                        value="RGB"
                        checked={overlayType === "RGB"}
                        onChange={() => onOverlayChange("RGB")}
                    />
                    <span style={{ fontSize: "13px", color: "#333" }}>RGB</span>
                </label>
            </div>
            <div>{overlayType} for <strong>{endMonth}</strong></div>
            <div>Based on <strong>{imageCount}</strong> image(s)</div>
        </div>
    )
}

