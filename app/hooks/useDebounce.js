import { useRef, useCallback } from "react"

export function useDebounce(callback, delay = 1000) {
    const timeoutRef = useRef(null)
    
    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
            callback(...args)
        }, delay)
    }, [callback, delay])
    
    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }, [])
    
    return { debouncedCallback, cancel }
}

