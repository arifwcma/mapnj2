import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath = path.join(process.cwd(), 'app', 'data', 'database.db')
const dbDir = path.dirname(dbPath)

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)

db.exec(`
    CREATE TABLE IF NOT EXISTS shares (
        token TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        data TEXT,
        timestamp INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
`)

export function saveShare(token, state) {
    const stmt = db.prepare('INSERT INTO shares (token, state, created_at) VALUES (?, ?, ?)')
    stmt.run(token, JSON.stringify(state), Date.now())
}

export function getShare(token) {
    const stmt = db.prepare('SELECT state FROM shares WHERE token = ?')
    const row = stmt.get(token)
    return row ? JSON.parse(row.state) : null
}

export function logAnalytics(eventType, data = null) {
    const stmt = db.prepare('INSERT INTO analytics (event_type, data, timestamp) VALUES (?, ?, ?)')
    stmt.run(eventType, data ? JSON.stringify(data) : null, Date.now())
}

export function getAnalyticsSummary(startDate = null, endDate = null) {
    let query = 'SELECT COUNT(*) as total FROM analytics'
    let params = []
    
    if (startDate || endDate) {
        const conditions = []
        if (startDate) {
            conditions.push('timestamp >= ?')
            params.push(startDate)
        }
        if (endDate) {
            conditions.push('timestamp <= ?')
            params.push(endDate)
        }
        query += ' WHERE ' + conditions.join(' AND ')
    }
    
    const totalStmt = db.prepare(query)
    const total = totalStmt.get(...params).total
    
    const now = Date.now()
    const day24h = now - 24 * 60 * 60 * 1000
    const day7d = now - 7 * 24 * 60 * 60 * 1000
    const day30d = now - 30 * 24 * 60 * 60 * 1000
    
    const events24hStmt = db.prepare('SELECT COUNT(*) as count FROM analytics WHERE timestamp >= ?')
    const events7dStmt = db.prepare('SELECT COUNT(*) as count FROM analytics WHERE timestamp >= ?')
    const events30dStmt = db.prepare('SELECT COUNT(*) as count FROM analytics WHERE timestamp >= ?')
    
    const events24h = events24hStmt.get(day24h).count
    const events7d = events7dStmt.get(day7d).count
    const events30d = events30dStmt.get(day30d).count
    
    let topEventsQuery = 'SELECT event_type, COUNT(*) as count FROM analytics'
    const topEventsParams = []
    if (startDate || endDate) {
        const topEventsConditions = []
        if (startDate) {
            topEventsConditions.push('timestamp >= ?')
            topEventsParams.push(startDate)
        }
        if (endDate) {
            topEventsConditions.push('timestamp <= ?')
            topEventsParams.push(endDate)
        }
        topEventsQuery += ' WHERE ' + topEventsConditions.join(' AND ')
    }
    topEventsQuery += ' GROUP BY event_type ORDER BY count DESC LIMIT 10'
    
    const topEventsStmt = db.prepare(topEventsQuery)
    const topEvents = topEventsStmt.all(...topEventsParams).map(row => ({
        event_type: row.event_type,
        count: row.count
    }))
    
    const totalSessions = 0
    
    let topUsers = []
    try {
        const topUsersStmt = db.prepare(`
            SELECT data FROM analytics 
            WHERE data IS NOT NULL
        `)
        const allEvents = topUsersStmt.all()
        const ipCounts = {}
        
        allEvents.forEach(row => {
            try {
                const data = JSON.parse(row.data)
                const ip = data.ip || 'Unknown'
                if (ip && ip !== 'Unknown') {
                    ipCounts[ip] = (ipCounts[ip] || 0) + 1
                }
            } catch {
            }
        })
        
        topUsers = Object.entries(ipCounts)
            .map(([ip, count]) => ({ ip, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
    } catch {
        topUsers = []
    }
    
    const avgSessionDuration = 0
    
    return {
        totalEvents: total,
        events24h,
        events7d,
        events30d,
        topEvents,
        topUsers,
        totalSessions,
        avgSessionDuration
    }
}

export function getAnalyticsEvents(options = {}) {
    const {
        page = 1,
        limit = 50,
        eventType = null,
        startDate = null,
        endDate = null
    } = options
    
    const offset = (page - 1) * limit
    const conditions = []
    const params = []
    
    if (eventType) {
        conditions.push('event_type = ?')
        params.push(eventType)
    }
    if (startDate) {
        conditions.push('timestamp >= ?')
        params.push(startDate)
    }
    if (endDate) {
        conditions.push('timestamp <= ?')
        params.push(endDate)
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
    
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM analytics ${whereClause}`)
    const total = countStmt.get(...params).total
    
    const eventsStmt = db.prepare(`
        SELECT id, event_type, data, timestamp 
        FROM analytics 
        ${whereClause}
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
    `)
    const events = eventsStmt.all(...params, limit, offset).map(row => ({
        id: row.id,
        event_type: row.event_type,
        data: row.data ? (() => {
            try {
                return JSON.parse(row.data)
            } catch {
                return row.data
            }
        })() : null,
        timestamp: row.timestamp
    }))
    
    return {
        events,
        total,
        page,
        limit
    }
}

export function getAnalyticsForExport(options = {}) {
    const {
        eventType = null,
        startDate = null,
        endDate = null
    } = options
    
    const conditions = []
    const params = []
    
    if (eventType) {
        conditions.push('event_type = ?')
        params.push(eventType)
    }
    if (startDate) {
        conditions.push('timestamp >= ?')
        params.push(startDate)
    }
    if (endDate) {
        conditions.push('timestamp <= ?')
        params.push(endDate)
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
    
    const stmt = db.prepare(`
        SELECT id, event_type, data, timestamp 
        FROM analytics 
        ${whereClause}
        ORDER BY timestamp DESC
    `)
    
    return stmt.all(...params).map(row => ({
        id: row.id,
        event_type: row.event_type,
        data: row.data ? (() => {
            try {
                return JSON.parse(row.data)
            } catch {
                return row.data
            }
        })() : null,
        timestamp: row.timestamp
    }))
}

export function clearAllAnalytics() {
    const stmt = db.prepare('DELETE FROM analytics')
    stmt.run()
}

export default db

