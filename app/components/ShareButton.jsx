"use client"

import { useState, useRef, useEffect } from "react"

export default function ShareButton({ onShare }) {
    const [isOpen, setIsOpen] = useState(false)
    const [shareUrl, setShareUrl] = useState("")
    const [copied, setCopied] = useState(false)
    const urlInputRef = useRef(null)

    const handleShareClick = async () => {
        const token = await onShare()
        if (token) {
            const url = new URL(window.location.href)
            url.searchParams.set('share', token)
            setShareUrl(url.toString())
            setIsOpen(true)
        }
    }

    const handleCopy = () => {
        if (urlInputRef.current) {
            urlInputRef.current.select()
            navigator.clipboard.writeText(shareUrl).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            })
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        setShareUrl("")
    }

    useEffect(() => {
        if (isOpen && urlInputRef.current) {
            urlInputRef.current.select()
        }
    }, [isOpen])

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
                    </div>
                </div>
            )}
        </>
    )
}

