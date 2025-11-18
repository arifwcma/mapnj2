import { useEffect, useRef } from "react"
import { monthKey } from "@/app/lib/dateUtils"
import { MONTH_NAMES_FULL } from "@/app/lib/config"

export default function useNullDataDetection(dataMap, monthsToCheck, showToast) {
    const previousDataMapRef = useRef(null)
    
    useEffect(() => {
        if (dataMap && previousDataMapRef.current && monthsToCheck.length > 0) {
            monthsToCheck.forEach(({ year, month }) => {
                const key = monthKey(year, month)
                const currentValue = dataMap.dataMap.get(key)
                const previousValue = previousDataMapRef.current?.get(key)
                
                if (previousValue === undefined && currentValue === null) {
                    const monthName = MONTH_NAMES_FULL[month - 1]
                    showToast(`No data found for ${year} ${monthName} at this point.\nConsider increasing cloud tolerance.`)
                }
            })
        }
        previousDataMapRef.current = dataMap?.dataMap ? new Map(dataMap.dataMap) : null
    }, [dataMap, monthsToCheck, showToast])
}

