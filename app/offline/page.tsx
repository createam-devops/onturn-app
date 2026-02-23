/**
 * OFFLINE PAGE
 * Se muestra cuando no hay conexión a internet
 */

import Link from 'next/link'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <WifiOff className="h-10 w-10 text-blue-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin conexión</h1>

          <p className="text-gray-600">
            Parece que no tienes conexión a internet. Algunas funciones pueden no estar
            disponibles.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            Reintentar
          </button>

          <Link
            href="/"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            Volver al inicio
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Algunas páginas visitadas recientemente pueden estar disponibles sin conexión.
          </p>
        </div>
      </div>
    </div>
  )
}
