import { NextResponse } from "next/server"

const WFS_BASE_URL = "http://testpozi.online/cgi-bin/qgis_mapserv.fcgi?MAP=/var/www/qgis_projects/wimmera_parcels/wimmera_parcels.qgz"

export async function GET(request) {
    console.log("[API] GET /api/fields/geojson - Request received")
    const { searchParams } = new URL(request.url)
    const bboxParam = searchParams.get("bbox")
    const zoomParam = searchParams.get("zoom")
    
    const zoom = zoomParam ? parseFloat(zoomParam) : null
    
    if (zoom !== null && zoom < 13) {
        return NextResponse.json({
            type: "FeatureCollection",
            features: []
        })
    }
    
    if (!bboxParam) {
        console.log("[API] No bbox parameter provided")
        return NextResponse.json({
            type: "FeatureCollection",
            features: []
        })
    }
    
    try {
        const [minLng, minLat, maxLng, maxLat] = bboxParam.split(",").map(parseFloat)
        console.log("[API] Parsed bbox values:", { minLng, minLat, maxLng, maxLat })
        
        if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
            console.log("[API] Invalid bbox values (NaN detected)")
            return NextResponse.json({
                type: "FeatureCollection",
                features: []
            })
        }
        
        const bbox = `${minLng},${minLat},${maxLng},${maxLat},EPSG:4326`
        const wfsUrl = `${WFS_BASE_URL}&SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&TYPENAME=PARCEL_VIEW&OUTPUTFORMAT=application/vnd.geo+json&SRSNAME=EPSG:4326&BBOX=${bbox}`
        
        console.log("[API] Fetching from WFS:", wfsUrl)
        
        const wfsResponse = await fetch(wfsUrl)
        
        if (!wfsResponse.ok) {
            console.error("[API] WFS request failed:", wfsResponse.status, wfsResponse.statusText)
            throw new Error(`WFS request failed: ${wfsResponse.status} ${wfsResponse.statusText}`)
        }
        
        const geoJsonData = await wfsResponse.json()
        console.log("[API] WFS response received", { 
            type: geoJsonData?.type, 
            featureCount: geoJsonData?.features?.length || 0 
        })
        
        return NextResponse.json(geoJsonData)
    } catch (error) {
        console.error("[API] Error fetching from WFS:", error)
        console.error("[API] Error message:", error.message)
        console.error("[API] Error stack:", error.stack)
        return NextResponse.json(
            { 
                error: "Failed to fetch parcels from WFS", 
                details: error.message || String(error) 
            },
            { status: 500 }
        )
    }
}
