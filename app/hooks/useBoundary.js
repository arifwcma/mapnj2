import { useState, useEffect } from "react"
import { BOUNDARY_FILE_PATH } from "@/app/lib/config"

export default function useBoundary() {
    const [boundary, setBoundary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetch(BOUNDARY_FILE_PATH)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch boundary: ${res.statusText}`)
                return res.json()
            })
            .then(setBoundary)
            .catch(setError)
            .finally(() => setLoading(false))
    }, [])

    return { boundary, loading, error }
}

