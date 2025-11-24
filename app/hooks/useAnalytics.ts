"use client"
import { useRef, useCallback, useEffect } from "react"

const BATCH_SIZE = 50
const BATCH_INTERVAL = 8000
const STORAGE_KEY = "analytics_queue"

export default function useAnalytics() {
    const queueRef = useRef<any[]>([])
    const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const sessionStartTimeRef = useRef(Date.now())
    const sessionEventCountRef = useRef(0)

    const loadQueueFromStorage = useCallback(() => {
        if (typeof window !== "undefined") {
            try {
                const stored = sessionStorage.getItem(STORAGE_KEY)
                if (stored) {
                    const parsed = JSON.parse(stored)
                    queueRef.current = parsed
                }
            } catch (e) {
                console.error("Failed to load analytics queue from storage:", e)
            }
        }
    }, [])

    const saveQueueToStorage = useCallback(() => {
        if (typeof window !== "undefined") {
            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(queueRef.current))
            } catch (e) {
                console.error("Failed to save analytics queue to storage:", e)
            }
        }
    }, [])

    const sendBatch = useCallback(async (events: any[]) => {
        if (events.length === 0) return

        try {
            await fetch("/api/analytics/log", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ events }),
            })
        } catch (error) {
            console.error("Analytics batch send failed:", error)
        }
    }, [])

    const processQueue = useCallback(async () => {
        if (queueRef.current.length === 0) return

        const batch = queueRef.current.splice(0, BATCH_SIZE)
        saveQueueToStorage()

        await sendBatch(batch)
    }, [sendBatch, saveQueueToStorage])

    const scheduleBatch = useCallback(() => {
        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current)
        }

        batchTimeoutRef.current = setTimeout(() => {
            processQueue()
            batchTimeoutRef.current = null
        }, BATCH_INTERVAL)
    }, [processQueue])

    const trackEvent = useCallback((eventType: string, data: any = null) => {
        try {
            const event = {
                event_type: eventType,
                data: data ? JSON.stringify(data) : null,
                timestamp: Date.now(),
            }

            queueRef.current.push(event)
            sessionEventCountRef.current++
            saveQueueToStorage()

            if (queueRef.current.length >= BATCH_SIZE) {
                processQueue()
            } else {
                scheduleBatch()
            }
        } catch (error) {
            console.error("Analytics tracking failed:", error)
        }
    }, [processQueue, scheduleBatch, saveQueueToStorage])

    useEffect(() => {
        loadQueueFromStorage()

        const handleBeforeUnload = () => {
            if (queueRef.current.length > 0) {
                const events = [...queueRef.current]
                queueRef.current = []
                
                navigator.sendBeacon(
                    "/api/analytics/log",
                    JSON.stringify({ events })
                )
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload)

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current)
            }
            processQueue()
        }
    }, [loadQueueFromStorage, processQueue])

    return { trackEvent }
}

