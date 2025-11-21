import { useState, useCallback } from "react"

export default function useToast() {
    const [toastMessage, setToastMessage] = useState(null)
    const [toastKey, setToastKey] = useState(0)
    
    const showToast = useCallback((message, pointIndex = null, areaIndex = null, suffix = "") => {
        setToastMessage(null)
        setToastKey(prev => prev + 1)
        setTimeout(() => {
            setToastMessage({ message, pointIndex, areaIndex, suffix })
        }, 50)
    }, [])
    
    const hideToast = useCallback(() => {
        setToastMessage(null)
    }, [])
    
    return { toastMessage, toastKey, showToast, hideToast }
}

