"use client"

export default function ChartAverages({ plotData, secondPlotData }) {
    const validNdviValues = plotData.filter(d => d.ndvi !== null && d.ndvi !== undefined).map(d => d.ndvi)
    const average = validNdviValues.length > 0 
        ? validNdviValues.reduce((sum, val) => sum + val, 0) / validNdviValues.length 
        : null
    const validSecondNdviValues = secondPlotData.filter(d => d.ndvi !== null && d.ndvi !== undefined).map(d => d.ndvi)
    const secondAverage = validSecondNdviValues.length > 0 
        ? validSecondNdviValues.reduce((sum, val) => sum + val, 0) / validSecondNdviValues.length 
        : null

    if (average === null && secondAverage === null) {
        return null
    }

    return (
        <div style={{ color: "#555", marginTop: "10px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
            {average !== null && (
                <>
                    <img 
                        src="images/marker-icon.png" 
                        alt="Blue marker" 
                        style={{ width: "20px", height: "32px" }}
                    />
                    <span>Average: <strong>{average.toFixed(2)}</strong></span>
                </>
            )}
            {secondAverage !== null && (
                <>
                    <img 
                        src="images/marker-icon-red.png" 
                        alt="Red marker" 
                        style={{ width: "20px", height: "32px" }}
                    />
                    <span>Average: <strong>{secondAverage.toFixed(2)}</strong></span>
                </>
            )}
        </div>
    )
}

