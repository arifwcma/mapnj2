import { NextResponse } from "next/server"
import { join } from "path"
import { existsSync, readFileSync } from "fs"
import { read } from "shapefile"
import proj4 from "proj4"

const sourceProj = "+proj=tmerc +lat_0=0 +lon_0=141 +k=0.9996 +x_0=500000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
const targetProj = "EPSG:4326"

function transformCoordinates(coords, transformFn) {
    if (Array.isArray(coords[0])) {
        return coords.map(coord => transformCoordinates(coord, transformFn))
    }
    const [x, y] = coords
    const [lon, lat] = transformFn([x, y])
    return [lon, lat]
}

export async function GET() {
    try {
        const shapefilePath = join(process.cwd(), "public", "data", "wparcel", "PARCEL_VIEW.shp")
        const dbfPath = join(process.cwd(), "public", "data", "wparcel", "PARCEL_VIEW.dbf")
        
        if (!existsSync(shapefilePath)) {
            console.error("Shapefile not found at:", shapefilePath)
            return NextResponse.json(
                { error: "Shapefile not found", details: `Path: ${shapefilePath}` },
                { status: 404 }
            )
        }
        
        if (!existsSync(dbfPath)) {
            console.error("DBF file not found at:", dbfPath)
            return NextResponse.json(
                { error: "DBF file not found", details: `Path: ${dbfPath}` },
                { status: 404 }
            )
        }
        
        console.log("Reading shapefile from:", shapefilePath)
        
        const shpBuffer = readFileSync(shapefilePath)
        const dbfBuffer = readFileSync(dbfPath)
        
        const featureCollection = await read(shpBuffer.buffer, dbfBuffer.buffer)
        console.log("Shapefile read successfully, features:", featureCollection.features?.length || 0)
        
        try {
            const transformedFeatures = featureCollection.features.map((feature, idx) => {
                try {
                    const transformedGeometry = {
                        ...feature.geometry,
                        coordinates: transformCoordinates(feature.geometry.coordinates, (coords) => {
                            return proj4(sourceProj, targetProj, coords)
                        })
                    }
                    return {
                        ...feature,
                        geometry: transformedGeometry
                    }
                } catch (err) {
                    console.error(`Error transforming feature ${idx}:`, err)
                    throw err
                }
            })
            
            const transformedCollection = {
                ...featureCollection,
                features: transformedFeatures
            }
            
            console.log("Coordinates transformed to WGS84")
            
            return NextResponse.json(transformedCollection)
        } catch (transformError) {
            console.error("Error during coordinate transformation:", transformError)
            console.error("Transform error message:", transformError.message)
            console.error("Transform error stack:", transformError.stack)
            throw transformError
        }
    } catch (error) {
        console.error("Error converting shapefile to GeoJSON:", error)
        console.error("Error message:", error.message)
        console.error("Error stack:", error.stack)
        return NextResponse.json(
            { error: "Failed to load shapefile", details: error.message || String(error) },
            { status: 500 }
        )
    }
}

