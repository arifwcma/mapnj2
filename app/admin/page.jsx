"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
    const router = useRouter()
    const [authenticated, setAuthenticated] = useState(null)
    const [summary, setSummary] = useState(null)
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [eventsLoading, setEventsLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [eventTypeFilter, setEventTypeFilter] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [eventTypes, setEventTypes] = useState([])

    useEffect(() => {
        checkAuth()
    }, [])

    useEffect(() => {
        if (authenticated) {
            loadSummary()
            loadEventTypes()
        }
    }, [authenticated])

    useEffect(() => {
        if (authenticated) {
            loadEvents()
        }
    }, [authenticated, page, eventTypeFilter, startDate, endDate])

    const checkAuth = async () => {
        try {
            const response = await fetch("/api/admin/login")
            const data = await response.json()
            if (data.authenticated) {
                setAuthenticated(true)
            } else {
                router.push("/admin/login")
            }
        } catch (error) {
            router.push("/admin/login")
        }
    }

    const loadSummary = async () => {
        try {
            const params = new URLSearchParams()
            if (startDate) params.append("startDate", new Date(startDate).getTime().toString())
            if (endDate) params.append("endDate", new Date(endDate).getTime().toString())
            
            const response = await fetch(`/api/admin/analytics/summary?${params}`)
            const data = await response.json()
            setSummary(data)
        } catch (error) {
            console.error("Failed to load summary:", error)
        } finally {
            setLoading(false)
        }
    }

    const loadEventTypes = async () => {
        try {
            const response = await fetch("/api/admin/analytics/events?limit=1000")
            const data = await response.json()
            const types = [...new Set(data.events.map(e => e.event_type))].sort()
            setEventTypes(types)
        } catch (error) {
            console.error("Failed to load event types:", error)
        }
    }

    const loadEvents = async () => {
        setEventsLoading(true)
        try {
            const params = new URLSearchParams()
            params.append("page", page.toString())
            params.append("limit", "50")
            if (eventTypeFilter) params.append("eventType", eventTypeFilter)
            if (startDate) params.append("startDate", new Date(startDate).getTime().toString())
            if (endDate) params.append("endDate", new Date(endDate).getTime().toString())
            
            const response = await fetch(`/api/admin/analytics/events?${params}`)
            const data = await response.json()
            setEvents(data.events)
        } catch (error) {
            console.error("Failed to load events:", error)
        } finally {
            setEventsLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await fetch("/api/admin/logout", { method: "POST" })
            router.push("/admin/login")
        } catch (error) {
            console.error("Logout error:", error)
        }
    }

    const handleExport = async (format) => {
        try {
            const params = new URLSearchParams()
            params.append("format", format)
            if (eventTypeFilter) params.append("eventType", eventTypeFilter)
            if (startDate) params.append("startDate", new Date(startDate).getTime().toString())
            if (endDate) params.append("endDate", new Date(endDate).getTime().toString())
            
            const response = await fetch(`/api/admin/analytics/export?${params}`)
            if (format === "csv") {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `analytics_${Date.now()}.csv`
                a.click()
            } else {
                const data = await response.json()
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `analytics_${Date.now()}.json`
                a.click()
            }
        } catch (error) {
            console.error("Export error:", error)
            alert("Export failed")
        }
    }

    const handleRefresh = () => {
        loadSummary()
        loadEvents()
    }

    if (authenticated === null || loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
                <div>Loading...</div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", padding: "20px" }}>
            <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                    <h1 style={{ margin: 0, color: "#333" }}>Analytics Dashboard</h1>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                        }}
                    >
                        Logout
                    </button>
                </div>

                <div style={{
                    backgroundColor: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}>
                    <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
                        <div style={{ flex: "1", minWidth: "200px" }}>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Event Type</label>
                            <select
                                value={eventTypeFilter}
                                onChange={(e) => {
                                    setEventTypeFilter(e.target.value)
                                    setPage(1)
                                }}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px"
                                }}
                            >
                                <option value="">All Events</option>
                                {eventTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: "1", minWidth: "200px" }}>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value)
                                    setPage(1)
                                }}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px"
                                }}
                            />
                        </div>
                        <div style={{ flex: "1", minWidth: "200px" }}>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value)
                                    setPage(1)
                                }}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px"
                                }}
                            />
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                            <button
                                onClick={handleRefresh}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#0066cc",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Refresh
                            </button>
                            <button
                                onClick={() => handleExport("csv")}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Export CSV
                            </button>
                            <button
                                onClick={() => handleExport("json")}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#17a2b8",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Export JSON
                            </button>
                        </div>
                    </div>
                </div>

                {summary && (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "20px",
                        marginBottom: "20px"
                    }}>
                        <div style={{
                            backgroundColor: "white",
                            padding: "20px",
                            borderRadius: "8px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Total Events</div>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#333" }}>{summary.totalEvents.toLocaleString()}</div>
                        </div>
                        <div style={{
                            backgroundColor: "white",
                            padding: "20px",
                            borderRadius: "8px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Last 24h</div>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#333" }}>{summary.events24h.toLocaleString()}</div>
                        </div>
                        <div style={{
                            backgroundColor: "white",
                            padding: "20px",
                            borderRadius: "8px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Last 7d</div>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#333" }}>{summary.events7d.toLocaleString()}</div>
                        </div>
                        <div style={{
                            backgroundColor: "white",
                            padding: "20px",
                            borderRadius: "8px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Last 30d</div>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#333" }}>{summary.events30d.toLocaleString()}</div>
                        </div>
                        <div style={{
                            backgroundColor: "white",
                            padding: "20px",
                            borderRadius: "8px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Total Sessions</div>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#333" }}>{summary.totalSessions.toLocaleString()}</div>
                        </div>
                        <div style={{
                            backgroundColor: "white",
                            padding: "20px",
                            borderRadius: "8px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Avg Session</div>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#333" }}>
                                {Math.round(summary.avgSessionDuration / 1000 / 60)}m
                            </div>
                        </div>
                    </div>
                )}

                {summary && summary.topEvents && summary.topEvents.length > 0 && (
                    <div style={{
                        backgroundColor: "white",
                        padding: "20px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}>
                        <h2 style={{ marginTop: 0, marginBottom: "15px" }}>Top 10 Event Types</h2>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "2px solid #ddd" }}>
                                    <th style={{ padding: "10px", textAlign: "left" }}>Event Type</th>
                                    <th style={{ padding: "10px", textAlign: "right" }}>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.topEvents.map((item, index) => (
                                    <tr key={item.event_type} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "10px" }}>{item.event_type}</td>
                                        <td style={{ padding: "10px", textAlign: "right" }}>{item.count.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{
                    backgroundColor: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}>
                    <h2 style={{ marginTop: 0, marginBottom: "15px" }}>Recent Events</h2>
                    {eventsLoading ? (
                        <div style={{ textAlign: "center", padding: "40px" }}>Loading events...</div>
                    ) : events.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>No events found</div>
                    ) : (
                        <>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid #ddd", backgroundColor: "#f8f9fa" }}>
                                            <th style={{ padding: "10px", textAlign: "left" }}>Timestamp</th>
                                            <th style={{ padding: "10px", textAlign: "left" }}>Event Type</th>
                                            <th style={{ padding: "10px", textAlign: "left" }}>Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.map((event) => (
                                            <tr key={event.id} style={{ borderBottom: "1px solid #eee" }}>
                                                <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                                                    {new Date(event.timestamp).toLocaleString()}
                                                </td>
                                                <td style={{ padding: "10px" }}>{event.event_type}</td>
                                                <td style={{ padding: "10px" }}>
                                                    {event.data ? (
                                                        <pre style={{
                                                            margin: 0,
                                                            fontSize: "12px",
                                                            maxWidth: "500px",
                                                            overflow: "auto",
                                                            whiteSpace: "pre-wrap",
                                                            wordBreak: "break-word"
                                                        }}>
                                                            {JSON.stringify(event.data, null, 2)}
                                                        </pre>
                                                    ) : (
                                                        <span style={{ color: "#999" }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: page === 1 ? "#ccc" : "#0066cc",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: page === 1 ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Previous
                                </button>
                                <span style={{ color: "#666" }}>Page {page}</span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={events.length < 50}
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: events.length < 50 ? "#ccc" : "#0066cc",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: events.length < 50 ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

