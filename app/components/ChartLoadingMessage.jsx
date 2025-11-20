"use client"

const loadingMessageStyle = {
    fontSize: "13px",
    color: "#333",
    backgroundColor: "#f0f8ff",
    border: "1px solid #b3d9ff",
    borderRadius: "4px",
    padding: "10px 15px",
    marginTop: "20px",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
}

const secondLoadingMessageStyle = {
    ...loadingMessageStyle,
    marginTop: "10px"
}

const spinnerStyle = {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border: "2px solid #b3d9ff",
    borderTop: "2px solid #0066cc",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
}

export default function ChartLoadingMessage({ loading }) {
    return (
        <>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
            {loading && (
                <div style={loadingMessageStyle}>
                    <div style={spinnerStyle}></div>
                    <span style={{ animation: "blink 0.8s ease-in-out infinite", color: "#dc3545" }}>Loading data...</span>
                </div>
            )}
        </>
    )
}

