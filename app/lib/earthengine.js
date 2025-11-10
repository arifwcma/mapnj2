import fs from "fs"
import path from "path"
import ee from "@google/earthengine"

let initialized = false

export async function initEarthEngine() {
    if (initialized) return

    const serviceAccountPath = path.join(process.cwd(), "sensitive_resources", "service-account.json")
    const privateKey = JSON.parse(
        fs.readFileSync(serviceAccountPath, "utf8")
    )

    await new Promise((resolve, reject) => {
        ee.data.authenticateViaPrivateKey(privateKey, () => {
            ee.initialize(null, null, () => {
                console.log("✅ Earth Engine initialized")
                initialized = true
                resolve()
            }, reject)
        })
    })
}

export { ee }

