"use client"

export default function NoImageMessage({ endMonth }) {
    return (
        <div style={{
            color: "#555",
            backgroundColor: "#f8f9fa",
            border: "1px solid #e0e0e0",
            borderRadius: "4px",
            padding: "10px 15px",
            marginBottom: "15px",
            textAlign: "center"
        }}>
            <div>No image found for {endMonth}.</div>
            <div style={{ marginTop: "5px" }}>Consider increasing cloud tolerance.</div>
        </div>
    )
}

