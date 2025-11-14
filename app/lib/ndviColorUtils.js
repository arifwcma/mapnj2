export function ndviToColor(ndvi) {
    if (ndvi === null || ndvi === undefined) {
        return "#808080"
    }
    
    if (ndvi < -1) return "#8B0000"
    if (ndvi < -0.5) return "#A0522D"
    if (ndvi < 0) return "#FF6347"
    if (ndvi < 0.1) return "#FFA500"
    if (ndvi < 0.2) return "#FFFF00"
    if (ndvi < 0.3) return "#ADFF2F"
    if (ndvi < 0.4) return "#32CD32"
    if (ndvi < 0.5) return "#228B22"
    if (ndvi < 0.6) return "#006400"
    if (ndvi < 0.7) return "#004d00"
    if (ndvi < 0.8) return "#003300"
    return "#001a00"
}

export function getNdviColorPalette() {
    return ["darkred", "orangered", "red", "yellow", "darkgreen"]
}

