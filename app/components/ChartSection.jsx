"use client"
import { Line } from "react-chartjs-2"

export default function ChartSection({ 
    chartData, 
    chartOptions, 
    chartRef, 
    plotData, 
    loading, 
    canGoLeft, 
    canGoRight, 
    onLeftArrow, 
    onRightArrow,
    firstPointHidden,
    secondPointHidden,
    onFirstPointToggle,
    onSecondPointToggle,
    secondPlotData
}) {
    return (
        <>
            {secondPlotData.some(d => d.ndvi !== null && d.ndvi !== undefined) ? (
                <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px", marginBottom: "10px" }}>
                    <div 
                        style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "5px", 
                            cursor: "pointer",
                            opacity: firstPointHidden ? 0.5 : 1
                        }}
                        onClick={onFirstPointToggle}
                    >
                        <img 
                            src="images/marker-icon.png" 
                            alt="Blue marker" 
                            style={{ width: "16px", height: "25px" }}
                        />
                        <div style={{ width: "30px", height: "3px", backgroundColor: "rgb(0, 123, 255)" }}></div>
                    </div>
                    <div 
                        style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "5px", 
                            cursor: "pointer",
                            opacity: secondPointHidden ? 0.5 : 1
                        }}
                        onClick={onSecondPointToggle}
                    >
                        <img 
                            src="images/marker-icon-red.png" 
                            alt="Red marker" 
                            style={{ width: "16px", height: "25px" }}
                        />
                        <div style={{ width: "30px", height: "3px", backgroundColor: "rgb(220, 53, 69)" }}></div>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px", marginBottom: "10px" }}>
                    <div 
                        style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "5px", 
                            cursor: "pointer",
                            opacity: firstPointHidden ? 0.5 : 1
                        }}
                        onClick={onFirstPointToggle}
                    >
                        <img 
                            src="images/marker-icon.png" 
                            alt="Blue marker" 
                            style={{ width: "16px", height: "25px" }}
                        />
                        <div style={{ width: "30px", height: "3px", backgroundColor: "rgb(0, 123, 255)" }}></div>
                    </div>
                </div>
            )}
            <div style={{ width: "100%", height: "350px", marginTop: "20px" }}>
                <Line ref={chartRef} data={chartData} options={chartOptions} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", padding: "0 10px" }}>
                <button
                    onClick={onLeftArrow}
                    disabled={!canGoLeft() || loading}
                    style={{
                        background: "none",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        cursor: (!canGoLeft() || loading) ? "not-allowed" : "pointer",
                        opacity: (!canGoLeft() || loading) ? 0.5 : 1,
                        fontSize: "13px"
                    }}
                >
                    ←
                </button>
                <button
                    onClick={onRightArrow}
                    disabled={!canGoRight() || loading}
                    style={{
                        background: "none",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        cursor: (!canGoRight() || loading) ? "not-allowed" : "pointer",
                        opacity: (!canGoRight() || loading) ? 0.5 : 1,
                        fontSize: "13px"
                    }}
                >
                    →
                </button>
            </div>
        </>
    )
}

