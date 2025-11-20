"use client"
import { useEffect } from "react"
import { useStatusMessage } from "./StatusMessage"

export default function ChartLoadingMessage({ loading }) {
    const { setStatusMessage } = useStatusMessage()

    useEffect(() => {
        if (loading) {
            setStatusMessage("Loading data...")
        } else {
            setStatusMessage(null)
        }
        return () => setStatusMessage(null)
    }, [loading, setStatusMessage])

    return null
}

