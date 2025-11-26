export async function trackEvent(eventType, data = {}) {
    try {
        await fetch('/api/analytics/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                events: [{
                    event_type: eventType,
                    data: data,
                    timestamp: Date.now()
                }]
            })
        })
    } catch (error) {
        console.error('Analytics tracking failed:', error)
    }
}

