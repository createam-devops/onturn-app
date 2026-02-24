'use client'

import { useEffect } from 'react'

export default function LandingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Asegurar que NO haya manifest en landing page
    useEffect(() => {
        const manifestLink = document.querySelector('link[rel="manifest"]')
        if (manifestLink) {
            manifestLink.remove()
        }
    }, [])

    return <>{children}</>
}
