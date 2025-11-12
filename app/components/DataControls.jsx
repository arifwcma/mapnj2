"use client"

export default function DataControls({ endMonth, imageCount, children }) {
    if (!endMonth || imageCount === null) {
        return null
    }

    return <>{children}</>
}

