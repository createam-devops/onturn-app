'use client'

import { useEffect } from 'react'

export default function ReservasLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Actualizar manifest para PWA Customer
    useEffect(() => {
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
        if (manifestLink) {
            manifestLink.href = '/manifest-customer.json'
        }
    }, [])

    return (
        <>
            {children}
        </>
    )
}
