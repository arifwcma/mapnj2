"use client"
import { useEffect } from "react"
import { useStatusMessage } from "./StatusMessage"

export default function PointStatusMessage({ isReloading, isLoading, ndvi }) {
    const { setStatusMessage } = useStatusMessage()

    useEffect(() => {
        if (isReloading) {
            setStatusMessage("Reloading ...")
        } else {
            setStatusMessage(null)
        }
        return () => setStatusMessage(null)
    }, [isReloading, setStatusMessage])

    return null
}

