'use client'

import { ManifestInjector } from '@/components/shared/ManifestInjector'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-100">
            <ManifestInjector manifestPath="/manifest-superadmin.json" />
            {children}
        </div>
    )
}
