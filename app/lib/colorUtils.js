export function getColorForIndex(index) {
    if (index === 0) return "rgb(0, 123, 255)"
    if (index === 1) return "rgb(220, 53, 69)"
    
    const predefinedColors = [
        "rgb(40, 167, 69)",
        "rgb(255, 193, 7)",
        "rgb(23, 162, 184)",
        "rgb(108, 117, 125)",
        "rgb(255, 87, 34)",
        "rgb(156, 39, 176)",
        "rgb(0, 150, 136)",
        "rgb(233, 30, 99)"
    ]
    
    if (index < 10) {
        return predefinedColors[index - 2]
    }
    
    const randomColors = [
        "rgb(121, 85, 72)",
        "rgb(63, 81, 181)",
        "rgb(76, 175, 80)",
        "rgb(255, 152, 0)",
        "rgb(233, 30, 99)",
        "rgb(0, 188, 212)",
        "rgb(139, 195, 74)",
        "rgb(255, 87, 34)",
        "rgb(171, 71, 188)",
        "rgb(96, 125, 139)"
    ]
    
    return randomColors[index % randomColors.length]
}

