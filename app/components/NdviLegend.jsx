"use client"
import { useMemo } from "react"
import { getNdviColor } from "@/app/lib/ndviColorUtils"

export default function NdviLegend({ width = "100%" }) {
    const tickValues = useMemo(() => {
        return [-1, -0.5, 0, 0.5, 1.0]
    }, [])
    
    const gradientStops = useMemo(() => {
        const numSteps = 500
        const min = -1
        const max = 1
        const stepSize = (max - min) / numSteps
        
        const stops = []
        for (let i = 0; i <= numSteps; i++) {
            const value = min + (i * stepSize)
            const color = getNdviColor(value)
            const percentage = (i / numSteps) * 100
            stops.push(`${color} ${percentage}%`)
        }
        
        return stops.join(", ")
    }, [])
    
    return (
        <div style={{ width, marginTop: "15px", marginBottom: "10px" }}>
            <div style={{ 
                height: "20px",
                marginBottom: "8px",
                background: `linear-gradient(to right, ${gradientStops})`,
                borderRadius: "4px",
                border: "1px solid #ddd"
            }} />
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

