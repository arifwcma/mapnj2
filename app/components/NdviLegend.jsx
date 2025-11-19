"use client"
import { useMemo } from "react"
import { ndviToColor } from "@/app/lib/ndviColorUtils"

export default function NdviLegend({ yAxisRange = "0-1", width = "100%" }) {
    const steps = useMemo(() => {
        const numSteps = 100
        const min = yAxisRange === "0-1" ? 0 : -1
        const max = 1
        const stepSize = (max - min) / numSteps
        
        return Array.from({ length: numSteps + 1 }, (_, i) => {
            const value = min + (i * stepSize)
            return {
                value,
                color: ndviToColor(value)
            }
        })
    }, [yAxisRange])
    
    const tickValues = useMemo(() => {
        const min = yAxisRange === "0-1" ? 0 : -1
        const max = 1
        
        if (yAxisRange === "0-1") {
            return [0, 0.2, 0.4, 0.6, 0.8, 1.0]
        } else {
            return [-1, -0.5, 0, 0.5, 1.0]
        }
    }, [yAxisRange])
    
    return (
        <div style={{ width, marginTop: "15px", marginBottom: "10px" }}>
            <div style={{ 
                display: "flex", 
                alignItems: "center",
                marginBottom: "8px"
            }}>
                {steps.map((step, index) => (
                    <div
                        key={index}
                        style={{
                            flex: 1,
                            height: "20px",
                            backgroundColor: step.color,
                            borderRight: index < steps.length - 1 ? "none" : "none"
                        }}
                    />
                ))}
            </div>
            <div style={{ 
                display: "flex", 
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#666",
                paddingTop: "4px"
            }}>
                {tickValues.map((value, index) => (
                    <span key={index}>
                        {value.toFixed(1)}
                    </span>
                ))}
            </div>
            <div style={{ 
                fontSize: "11px", 
                color: "#666", 
                marginTop: "4px",
                textAlign: "center"
            }}>
                NDVI Value
            </div>
        </div>
    )
}

