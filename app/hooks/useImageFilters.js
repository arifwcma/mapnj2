import { useState, useCallback } from "react"
import { DEFAULT_CLOUD_TOLERANCE } from "@/app/lib/config"

export function useImageFilters() {
    const [cloudTolerance, setCloudTolerance] = useState(DEFAULT_CLOUD_TOLERANCE)
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

