const COLORS = [
    "#007bff",
    "#dc3545",
    "#28a745",
    "#ffc107",
    "#17a2b8",
    "#6f42c1",
    "#fd7e14",
    "#20c997",
    "#e83e8c",
    "#6c757d"
]

export function getColorForIndex(index) {
    return COLORS[index % COLORS.length]
}

