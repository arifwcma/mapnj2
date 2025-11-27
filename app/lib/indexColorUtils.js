import { INDEX_VIS_CONFIG } from "@/app/lib/indexConfig"

function colorNameToHex(colorName) {
    const colorMap = {
        darkred: "#8B0000",
        orangered: "#FF4500",
        red: "#FF0000",
        yellow: "#FFFF00",
        darkgreen: "#006400"
    }
    return colorMap[colorName.toLowerCase()] || colorName
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16)
        return hex.length === 1 ? "0" + hex : hex
    }).join("")
}

function interpolateColor(color1, color2, factor) {
    const hex1 = colorNameToHex(color1)
    const hex2 = colorNameToHex(color2)
    const rgb1 = hexToRgb(hex1)
    const rgb2 = hexToRgb(hex2)
    
    if (!rgb1 || !rgb2) return hex1
    
    const r = rgb1.r + (rgb2.r - rgb1.r) * factor
    const g = rgb1.g + (rgb2.g - rgb1.g) * factor
    const b = rgb1.b + (rgb2.b - rgb1.b) * factor
    
    return rgbToHex(r, g, b)
}

export function getIndexColor(value, min = INDEX_VIS_CONFIG.min, max = INDEX_VIS_CONFIG.max, palette = INDEX_VIS_CONFIG.palette) {
    if (value === null || value === undefined) {
        return "#808080"
    }
    
    const clampedValue = Math.max(min, Math.min(max, value))
    const normalizedValue = (clampedValue - min) / (max - min)
    
    const numColors = palette.length
    const segmentSize = 1 / (numColors - 1)
    const segmentIndex = Math.min(Math.floor(normalizedValue / segmentSize), numColors - 2)
    
    const color1 = palette[segmentIndex]
    const color2 = palette[segmentIndex + 1]
    const segmentStart = segmentIndex * segmentSize
    const factor = (normalizedValue - segmentStart) / segmentSize
    
    return interpolateColor(color1, color2, factor)
}

export function getIndexVisConfig() {
    return { ...INDEX_VIS_CONFIG }
}

export function getIndexColorPalette() {
    return [...INDEX_VIS_CONFIG.palette]
}
