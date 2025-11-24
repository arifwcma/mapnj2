import { logAnalytics } from "@/app/lib/db"

function getClientIP(request) {
    const forwarded = request.headers.get("x-forwarded-for")
    const realIP = request.headers.get("x-real-ip")
    const cfConnectingIP = request.headers.get("cf-connecting-ip")
    
    if (forwarded) {
        const ip = forwarded.split(",")[0].trim()
        if (ip && ip !== "::1" && ip !== "127.0.0.1") {
            return ip
        }
    }
    if (realIP) {
        const ip = realIP.trim()
        if (ip && ip !== "::1" && ip !== "127.0.0.1") {
            return ip
        }
    }
    if (cfConnectingIP) {
        const ip = cfConnectingIP.trim()
        if (ip && ip !== "::1" && ip !== "127.0.0.1") {
            return ip
        }
    }
    
    const isDevelopment = process.env.NODE_ENV === "development"
    
    if (isDevelopment) {
        const allHeaders = {}
        request.headers.forEach((value, key) => {
            allHeaders[key] = value
        })
        console.log("Available headers for IP detection:", Object.keys(allHeaders).filter(k => k.toLowerCase().includes("ip") || k.toLowerCase().includes("forward")))
        return "localhost"
    }
    
    return "Unknown"
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { events } = body

        if (!Array.isArray(events)) {
            return Response.json({ success: false, error: "Invalid request" }, { status: 400 })
        }

        const ip = getClientIP(request)
        console.log("Captured IP for this request:", ip)

        for (const event of events) {
            try {
                let data = event.data ? (typeof event.data === "string" ? event.data : JSON.stringify(event.data)) : null
                
                if (data) {
                    try {
                        const parsedData = typeof data === "string" ? JSON.parse(data) : data
                        parsedData.ip = ip
                        data = JSON.stringify(parsedData)
                    } catch (parseError) {
                        const newData = { ip }
                        if (typeof data === "string") {
                            try {
                                const parsed = JSON.parse(data)
                                Object.assign(newData, parsed)
                            } catch {
                                newData.raw = data
                            }
                        } else {
                            Object.assign(newData, data)
                        }
                        data = JSON.stringify(newData)
                    }
                } else {
                    data = JSON.stringify({ ip })
                }
                
                logAnalytics(event.event_type, data)
            } catch (error) {
                console.error("Failed to log analytics event:", error)
            }
        }

        return Response.json({ success: true })
    } catch (error) {
        console.error("Analytics log endpoint error:", error)
        return Response.json({ success: false, error: "Internal server error" }, { status: 500 })
    }
}

