import { useEffect, useRef } from "react"
import { monthKey } from "@/app/lib/dateUtils"
import { MONTH_NAMES_FULL } from "@/app/lib/config"
import { MESSAGES } from "@/app/lib/messageConstants"
import { isMonthInFuture, shouldUseMODISForMonth } from "@/app/lib/monthUtils"

export default function useNullDataDetection(dataMap, monthsToCheck, showToast, pointIndex = null, areaIndex = null) {
    const previousDataMapRef = useRef(null)
    
    useEffect(() => {
        if (dataMap && previousDataMapRef.current && monthsToCheck.length > 0) {
            monthsToCheck.forEach(({ year, month }) => {
                const key = monthKey(year, month)
                const currentValue = dataMap.dataMap.get(key)
                const previousValue = previousDataMapRef.current?.get(key)
                
                if (previousValue === undefined && currentValue === null) {
                    const monthName = MONTH_NAMES_FULL[month - 1]
                    const isFuture = isMonthInFuture(year, month)
                    const usesMODIS = shouldUseMODISForMonth(year, month)
                    const suffix = (isFuture || usesMODIS) ? "" : MESSAGES.NO_DATA_FOUND_SUFFIX
                    const index = pointIndex !== null ? pointIndex : areaIndex
                    showToast(`${MESSAGES.NO_DATA_FOUND_PREFIX} ${year} ${monthName} for `, pointIndex !== null ? pointIndex : null, areaIndex !== null ? areaIndex : null, suffix)
                }
            })
        }
        previousDataMapRef.current = dataMap?.dataMap ? new Map(dataMap.dataMap) : null
    }, [dataMap, monthsToCheck, showToast, pointIndex, areaIndex])
}

