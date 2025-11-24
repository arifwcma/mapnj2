export function serializeState(state) {
    return JSON.stringify(state)
}

export function deserializeState(jsonStringOrObject) {
    try {
        if (typeof jsonStringOrObject === 'string') {
            return JSON.parse(jsonStringOrObject)
        }
        return jsonStringOrObject
    } catch (error) {
        console.error('Error deserializing state:', error)
        return null
    }
}

