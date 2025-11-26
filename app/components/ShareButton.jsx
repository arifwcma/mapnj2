"use client"

import { useState, useRef, useEffect } from "react"
import { trackEvent } from "@/app/lib/analytics"

export default function ShareButton({ onShare }) {
    const [isOpen, setIsOpen] = useState(false)
    const [shareUrl, setShareUrl] = useState("")
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(false)
    const urlInputRef = useRef(null)

    const handleShareClick = async () => {
        setIsOpen(true)
        setLoading(true)
        setShareUrl("")
        setCopied(false)
        trackEvent("share_button_clicked", {})
        
        try {
            const token = await onShare()
            if (token) {
                const url = new URL(window.location.href)
                url.searchParams.set('share', token)
                setShareUrl(url.toString())
            }
        } catch (error) {
            console.error('Error creating share link:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = async () => {
        if (urlInputRef.current) {
            urlInputRef.current.select()
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(shareUrl)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                    const url = new URL(shareUrl)
                    const token = url.searchParams.get('share')
                    trackEvent("share_url_copied", { token: token || null })
                } else {
                    const successful = document.execCommand('copy')
                    if (successful) {
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                        const url = new URL(shareUrl)
                        const token = url.searchParams.get('share')
                        trackEvent("share_url_copied", { token: token || null })
                    } else {
                        alert('Failed to copy. Please select and copy manually.')
                    }
                }
            } catch (err) {
                const successful = document.execCommand('copy')
                if (successful) {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                    const url = new URL(shareUrl)
                    const token = url.searchParams.get('share')
                    trackEvent("share_url_copied", { token: token || null })
                } else {
                    alert('Failed to copy. Please select and copy manually.')
                }
            }
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        setShareUrl("")
    }

    useEffect(() => {
        if (isOpen && !loading && shareUrl && urlInputRef.current) {
            urlInputRef.current.select()
        }
    }, [isOpen, loading, shareUrl])

    return (
        <>
            <div style={{ marginBottom: "15px" }}>
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault()
                        handleShareClick()
                    }}
                    style={{
                        color: "#0066cc",
                        textDecoration: "underline",
                        cursor: "pointer",
                        fontSize: "14px"
                    }}
                >
                    Share
                </a>
            </div>

            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10000
                    }}
                    onClick={handleClose}
                >
                    <div
                        style={{
                            backgroundColor: "white",
                            padding: "20px",
                            borderRadius: "8px",
                            maxWidth: "600px",
                            width: "90%",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>Share Link</h3>
                            <button
                                onClick={handleClose}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    color: "#666",
                                    padding: 0,
                                    width: "30px",
                                    height: "30px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                ×
                            </button>
                        </div>
                        {loading ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
                                <div
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        border: "4px solid #f3f3f3",
                                        borderTop: "4px solid #0066cc",
                                        borderRadius: "50%",
                                        animation: "spin 1s linear infinite"
                                    }}
                                />
                                <p style={{ marginTop: "15px", color: "#666", fontSize: "14px" }}>Creating share link...</p>
                                <style>{`
                                    @keyframes spin {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                `}</style>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: "15px" }}>
                                    <input
                                        ref={urlInputRef}
                                        type="text"
                                        value={shareUrl}
                                        readOnly
                                        style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid #ccc",
                                            borderRadius: "4px",
                                            fontSize: "14px",
                                            fontFamily: "monospace"
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleCopy}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        backgroundColor: copied ? "#28a745" : "#0066cc",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "bold"
                                    }}
                                >
                                    {copied ? "Copied!" : "Copy URL"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
