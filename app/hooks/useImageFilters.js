import { useState, useCallback } from "react"

export function useImageFilters() {
    const [cloudTolerance, setCloudTolerance] = useState(30)
    const [imageCount, setImageCount] = useState(null)

    const updateCloudTolerance = useCallback((cloud) => {
        setCloudTolerance(cloud)
    }, [])

    const clearFilters = useCallback(() => {
        setImageCount(null)
    }, [])

    const isImageAvailable = useCallback(() => {
        return imageCount !== null && imageCount > 0
    }, [imageCount])

    return {
        cloudTolerance,
        imageCount,
        updateCloudTolerance,
        setImageCount,
        clearFilters,
        isImageAvailable
    }
}

