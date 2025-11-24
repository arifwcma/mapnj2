let leafletModule = null
let leafletPromise = null

export function getLeaflet() {
    if (leafletModule) return Promise.resolve(leafletModule)
    if (leafletPromise) return leafletPromise
    
    if (typeof window !== 'undefined') {
        leafletPromise = import('leaflet').then((L) => {
            leafletModule = L.default || L
            return leafletModule
        })
        return leafletPromise
    }
    
    return Promise.resolve(null)
}

export function preloadLeaflet() {
    if (typeof window !== 'undefined' && !leafletPromise) {
        getLeaflet()
    }
}

