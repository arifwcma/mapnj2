import { useState, useCallback, useRef } from "react"

export default function useRequestTracker() {
    const [pendingRequests, setPendingRequests] = useState(new Set())
    const batchIdRef = useRef(0)

    const registerRequest = useCallback((key) => {
        setPendingRequests(prev => {
            const newSet = new Set(prev)
            newSet.add(key)
            return newSet
        })
    }, [])

    const unregisterRequest = useCallback((key) => {
        setPendingRequests(prev => {
            const newSet = new Set(prev)
            newSet.delete(key)
            return newSet
        })
    }, [])

    const clearAll = useCallback(() => {
        setPendingRequests(new Set())
        batchIdRef.current += 1
    }, [])

    const getBatchId = useCallback(() => {
        return batchIdRef.current
    }, [])

    return {
        pendingCount: pendingRequests.size,
        allComplete: pendingRequests.size === 0,
        registerRequest,
        unregisterRequest,
        clearAll,
        getBatchId
    }
}

