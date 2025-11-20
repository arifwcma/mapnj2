"use client"
import { FIELD_SELECTION_MIN_ZOOM } from "@/app/lib/config"

export default function AreaSelectionPrompt({ 
    onSelectParcel, 
    onDrawRectangle, 
    isSelectionMode, 
    onCancel,
    isDrawing,
    fieldSelectionMode,
    currentZoom,
    fieldsData
}) {
    const getMessage = () => {
        if (isDrawing) {
            return "Click and drag to draw a rectangle"
        }
        if (fieldSelectionMode) {
            if (currentZoom === null || currentZoom === undefined || currentZoom < FIELD_SELECTION_MIN_ZOOM) {
                return "Zoom in further to see parcels"
            }
            if (!fieldsData || fieldsData.features?.length === 0) {
                return "Loading parcel data..."
            }
            return "Click the desired parcel"
        }
        return null
    }

    const message = getMessage()
    const isLoadingMessage = message === "Loading parcel data..."

    return (
        <div className="text-sm text-gray-800 mb-4">
            {!isSelectionMode && (
                <>
                    Select area by choosing a{" "}
                    <button onClick={onSelectParcel} className="bg-transparent border-0 p-0 m-0 cursor-pointer text-sm text-blue-600 no-underline inline font-inherit hover:underline">
                        parcel
                    </button>
                    {" "}or drawing a{" "}
                    <button onClick={onDrawRectangle} className="bg-transparent border-0 p-0 m-0 cursor-pointer text-sm text-blue-600 no-underline inline font-inherit hover:underline">
                        rectangle
                    </button>
                    .
                </>
            )}
            {isSelectionMode && (
                <>
                    {message && (
                        <div className="mt-2.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 text-center">
                            <span className={isLoadingMessage ? "animate-blink text-red-600" : ""}>
                                {message}
                            </span>
                        </div>
                    )}
                    <div className="mt-2.5">
                        <button onClick={onCancel} className="bg-transparent border-0 p-0 m-0 cursor-pointer text-sm text-blue-600 no-underline font-inherit hover:underline">
                            Cancel
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

