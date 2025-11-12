"use client"

const statusMessageStyle = {
    fontSize: "13px",
    color: "#333",
    backgroundColor: "#f0f8ff",
    border: "1px solid #b3d9ff",
    borderRadius: "4px",
    padding: "10px 15px",
    marginBottom: "15px",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
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

export default function PointStatusMessage({ isReloading, isLoading, ndvi }) {
    if (isReloading) {
        return (
            <>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <div style={statusMessageStyle}>
                    <div style={spinnerStyle}></div>
                    <span>Reloading ...</span>
                </div>
            </>
        )
    }

    if (isLoading || (ndvi === null || ndvi === undefined)) {
        return (
            <>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <div style={statusMessageStyle}>
                    <div style={spinnerStyle}></div>
                    <span>Calculating NDVI ...</span>
                </div>
            </>
        )
    }

    return null
}

