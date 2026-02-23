'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReviewForm } from './ReviewForm'
import { canUserReview } from '@/lib/services/reviews'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'

interface ReviewModalProps {
  businessId: string
  businessName: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ReviewModal({
  businessId,
  businessName,
  isOpen,
  onClose,
  onSuccess
}: ReviewModalProps) {
  const { user } = useAuth()
  const { error: showError } = useToast()
  const [canReview, setCanReview] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && user) {
      checkEligibility()
    }
  }, [isOpen, user, businessId])

  const checkEligibility = async () => {
    try {
      setLoading(true)
      const result = await canUserReview(user!.id, businessId)
      setCanReview(result.canReview)

      if (!result.canReview) {
        showError(result.reason || 'No puedes dejar una reseña en este momento')
      }
    } catch (error) {
      console.error('Error checking eligibility:', error)
      showError('Error al verificar elegibilidad')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    onSuccess?.()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-[#003366]">
            Dejar una Opinión
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A896]"></div>
            </div>
          ) : canReview ? (
            <ReviewForm
              businessId={businessId}
              businessName={businessName}
              onSuccess={handleSuccess}
              onCancel={onClose}
            />
          ) : (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-4">
                <X size={64} className="mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">
                No puedes dejar una reseña
              </h3>
              <p className="text-slate-600">
                Solo los clientes que han completado una cita pueden dejar opiniones.
              </p>
              <Button
                variant="secondary"
                className="mt-6"
                onClick={onClose}
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
