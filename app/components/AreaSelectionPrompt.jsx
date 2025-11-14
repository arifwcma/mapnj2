"use client"

const linkStyle = {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    fontSize: "13px",
    color: "#0066cc",
    textDecoration: "none",
    fontFamily: "inherit",
    display: "inline"
}

export default function AreaSelectionPrompt({ onSelectParcel, onDrawRectangle }) {
    return (
        <div style={{ fontSize: "13px", color: "#333", marginBottom: "15px" }}>
            Select area by choosing a{" "}
            <button onClick={onSelectParcel} style={linkStyle}>
                parcel
            </button>
            {" "}or drawing a{" "}
            <button onClick={onDrawRectangle} style={linkStyle}>
                rectangle
            </button>
            .
        </div>
    )
}

