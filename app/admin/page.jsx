"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
    const router = useRouter()
    const [authenticated, setAuthenticated] = useState(false)
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState(null)
    const [events, setEvents] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [filters, setFilters] = useState({
        eventType: "",
        startDate: "",
        endDate: ""
    })
    const [refreshing, setRefreshing] = useState(false)
    
    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/analytics/summary")
            if (response.status === 401) {
                router.push("/admin/login")
                return false
            }
            return true
        } catch {
            router.push("/admin/login")
            return false
        }
    }, [router])
    
    const loadSummary = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (filters.startDate) {
                params.append("startDate", new Date(filters.startDate).getTime().toString())
            }
            if (filters.endDate) {
                params.append("endDate", new Date(filters.endDate + "T23:59:59").getTime().toString())
            }
            
            const response = await fetch(`/api/admin/analytics/summary?${params}`)
            if (response.ok) {
                const data = await response.json()
                setSummary(data)
            }
        } catch (error) {
            console.error("Failed to load summary:", error)
        }
    }, [filters.startDate, filters.endDate])
    
    const loadEvents = useCallback(async (page = 1) => {
        try {
            const params = new URLSearchParams()
            params.append("page", page.toString())
            params.append("limit", "50")
            if (filters.eventType) {
                params.append("eventType", filters.eventType)
            }
            if (filters.startDate) {
                params.append("startDate", new Date(filters.startDate).getTime().toString())
            }
            if (filters.endDate) {
                params.append("endDate", new Date(filters.endDate + "T23:59:59").getTime().toString())
            }
            
            const response = await fetch(`/api/admin/analytics/events?${params}`)
            if (response.ok) {
                const data = await response.json()
                setEvents(data.events)
                setTotalPages(Math.ceil(data.total / data.limit))
                setCurrentPage(page)
            }
        } catch (error) {
            console.error("Failed to load events:", error)
        }
    }, [filters])
    
    const handleRefresh = useCallback(async () => {
        setRefreshing(true)
        await Promise.all([loadSummary(), loadEvents(currentPage)])
        setRefreshing(false)
    }, [loadSummary, loadEvents, currentPage])
    
    const handleLogout = useCallback(async () => {
        try {
            await fetch("/api/admin/logout", { method: "POST" })
            router.push("/admin/login")
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }, [router])
    
    const handleExport = useCallback(async (format) => {
        try {
            const params = new URLSearchParams()
            params.append("format", format)
            if (filters.eventType) {
                params.append("eventType", filters.eventType)
            }
            if (filters.startDate) {
                params.append("startDate", new Date(filters.startDate).getTime().toString())
            }
            if (filters.endDate) {
                params.append("endDate", new Date(filters.endDate + "T23:59:59").getTime().toString())
            }
            
            const response = await fetch(`/api/admin/analytics/export?${params}`)
            if (response.ok) {
                if (format === "csv") {
                    const blob = await response.blob()
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `analytics-${Date.now()}.csv`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    window.URL.revokeObjectURL(url)
                } else {
                    const data = await response.json()
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `analytics-${Date.now()}.json`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    window.URL.revokeObjectURL(url)
                }
            }
        } catch (error) {
            console.error("Export failed:", error)
        }
    }, [filters])
    
    useEffect(() => {
        const init = async () => {
            const auth = await checkAuth()
            if (auth) {
                setAuthenticated(true)
                await Promise.all([loadSummary(), loadEvents()])
            }
            setLoading(false)
        }
        init()
    }, [])
    
    useEffect(() => {
        if (authenticated) {
            loadSummary()
            loadEvents(1)
        }
    }, [filters, authenticated, loadSummary, loadEvents])
    
    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
                <div>Loading...</div>
            </div>
        )
    }
    
    if (!authenticated) {
        return null
    }
    
    const eventTypes = summary?.topEvents?.map(e => e.event_type) || []
    
    return (
        <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <h1 style={{ fontSize: "28px", margin: 0 }}>Analytics Dashboard</h1>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#0066cc",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: refreshing ? "not-allowed" : "pointer"
                        }}
                    >
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
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
            </div>
            
            {summary && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
                    <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                        <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "8px" }}>Total Events</div>
                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>{summary.totalEvents.toLocaleString()}</div>
                    </div>
                    <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                        <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "8px" }}>Last 24h</div>
                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>{summary.events24h.toLocaleString()}</div>
                    </div>
                    <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                        <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "8px" }}>Last 7 Days</div>
                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>{summary.events7d.toLocaleString()}</div>
                    </div>
                    <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                        <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "8px" }}>Last 30 Days</div>
                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>{summary.events30d.toLocaleString()}</div>
                    </div>
                    <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                        <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "8px" }}>Total Sessions</div>
                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>{summary.totalSessions.toLocaleString()}</div>
                    </div>
                    <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                        <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "8px" }}>Avg Session Duration</div>
                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>
                            {Math.round(summary.avgSessionDuration / 1000 / 60)}m
                        </div>
                    </div>
                </div>
            )}
            
            {summary?.topEvents && summary.topEvents.length > 0 && (
                <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", border: "1px solid #dee2e6", marginBottom: "30px" }}>
                    <h2 style={{ fontSize: "20px", marginBottom: "15px" }}>Top 10 Event Types</h2>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "2px solid #dee2e6" }}>
                                <th style={{ padding: "10px", textAlign: "left" }}>Event Type</th>
                                <th style={{ padding: "10px", textAlign: "right" }}>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.topEvents.map((event, index) => (
                                <tr key={index} style={{ borderBottom: "1px solid #dee2e6" }}>
                                    <td style={{ padding: "10px" }}>{event.event_type}</td>
                                    <td style={{ padding: "10px", textAlign: "right" }}>{event.count.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ fontSize: "20px", margin: 0 }}>Recent Events</h2>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            onClick={() => handleExport("csv")}
                            style={{
                                padding: "6px 12px",
                                backgroundColor: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "14px"
                            }}
                        >
                            Export CSV
                        </button>
                        <button
                            onClick={() => handleExport("json")}
                            style={{
                                padding: "6px 12px",
                                backgroundColor: "#17a2b8",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "14px"
                            }}
                        >
                            Export JSON
                        </button>
                    </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                            Event Type
                        </label>
                        <select
                            value={filters.eventType}
                            onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
                            style={{
                                width: "100%",
                                padding: "8px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                fontSize: "14px"
                            }}
                        >
                            <option value="">All Events</option>
                            {eventTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            style={{
                                width: "100%",
                                padding: "8px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                fontSize: "14px"
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                            End Date
                        </label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            style={{
                                width: "100%",
                                padding: "8px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                fontSize: "14px"
                            }}
                        />
                    </div>
                </div>
                
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: "2px solid #dee2e6" }}>
                            <th style={{ padding: "10px", textAlign: "left" }}>ID</th>
                            <th style={{ padding: "10px", textAlign: "left" }}>Event Type</th>
                            <th style={{ padding: "10px", textAlign: "left" }}>Timestamp</th>
                            <th style={{ padding: "10px", textAlign: "left" }}>Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((event) => (
                            <tr key={event.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                                <td style={{ padding: "10px" }}>{event.id}</td>
                                <td style={{ padding: "10px" }}>{event.event_type}</td>
                                <td style={{ padding: "10px" }}>
                                    {new Date(event.timestamp).toLocaleString()}
                                </td>
                                <td style={{ padding: "10px", fontSize: "12px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {event.data ? JSON.stringify(event.data).substring(0, 100) : "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
                        <button
                            onClick={() => loadEvents(currentPage - 1)}
                            disabled={currentPage === 1}
                            style={{
                                padding: "8px 16px",
                                backgroundColor: currentPage === 1 ? "#ccc" : "#0066cc",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: currentPage === 1 ? "not-allowed" : "pointer"
                            }}
                        >
                            Previous
                        </button>
                        <span style={{ padding: "8px 16px", display: "flex", alignItems: "center" }}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => loadEvents(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: "8px 16px",
                                backgroundColor: currentPage === totalPages ? "#ccc" : "#0066cc",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

