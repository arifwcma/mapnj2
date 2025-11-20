"use client"

export default function ChartLoadingMessage({ loading }) {
    return (
        loading && (
            <div className="text-sm text-gray-800 bg-blue-50 border border-blue-200 rounded p-2.5 mt-5 text-center flex items-center justify-center gap-2">
                <div className="inline-block w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin-custom"></div>
                <span className="animate-blink text-red-600">Loading data...</span>
            </div>
        )
    )
}

