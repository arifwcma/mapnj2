import { useState, useEffect } from "react"

export default function useBoundary() {
    const [boundary, setBoundary] = useState(null)

    useEffect(() => {
        fetch("/data/boundary_4326.geojson")
            .then(res => res.json())
            .then(setBoundary)
    }, [])

    return boundary
}

