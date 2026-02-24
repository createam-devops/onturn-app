'use client'

import { ManifestInjector } from '@/components/shared/ManifestInjector'

export default function MisReservasLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <ManifestInjector manifestPath="/manifest-customer.json" />
            {children}
        </>
    )
}
