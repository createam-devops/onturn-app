'use client'

import { useState } from 'react'
import { StarRating } from './StarRating'
import { Button } from '@/components/ui/button'
import { reviewResponseSchema } from '@/lib/schemas'
import { respondToReview } from '@/lib/services/reviews'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Calendar, 
  MessageCircle, 
  Reply, 
  CheckCircle
} from 'lucide-react'
import type { Review } from '@/lib/services/reviews'

interface ReviewCardProps {
  review: Review
  showActions?: boolean
  onUpdate?: () => void
}

export function ReviewCard({ review, showActions = false, onUpdate }: ReviewCardProps) {
  const { user } = useAuth()
  const { success: showSuccess, error: showError } = useToast()

  const [showResponseForm, setShowResponseForm] = useState(false)
  const [response, setResponse] = useState(review.business_response || '')
  const [submitting, setSubmitting] = useState(false)

  const handleRespond = async () => {
    if (!user?.id) return

    // Validar
    const validation = reviewResponseSchema.safeParse({
      businessResponse: response
    })

    if (!validation.success) {
      const firstError = validation.error.issues[0]
      showError(firstError.message)
      return
    }

    try {
      setSubmitting(true)
      await respondToReview(review.id, response, user.id)
      showSuccess('Respuesta publicada correctamente')
      setShowResponseForm(false)
      if (onUpdate) onUpdate()
    } catch (error: any) {
      showError(error.message || 'Error al responder')
    } finally {
      setSubmitting(false)
    }
  }

  const formattedDate = format(new Date(review.created_at), "d 'de' MMMM, yyyy", {
    locale: es
  })

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-gradient-to-br from-[#00A896] to-[#003366] rounded-full flex items-center justify-center text-white font-bold">
            {review.customer_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-slate-800">{review.customer_name}</h4>
              {review.is_verified && (
                <div className="flex items-center gap-1 text-xs text-[#00A896] bg-[#00A896]/10 px-2 py-1 rounded-full">
                  <CheckCircle size={12} />
                  <span>Verificada</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
        
        <StarRating rating={review.rating} size={18} />
      </div>

      {/* Comment */}
      <div className="mb-4">
        <p className="text-slate-700 leading-relaxed">{review.comment}</p>
      </div>

      {/* Business Response */}
      {review.business_response && (
        <div className="mt-4 bg-slate-50 rounded-xl p-4 border-l-4 border-[#00A896]">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={16} className="text-[#00A896]" />
            <span className="text-sm font-semibold text-[#003366]">
              Respuesta del negocio
            </span>
            {review.responded_at && (
              <span className="text-xs text-slate-500">
                · {format(new Date(review.responded_at), "d 'de' MMM", { locale: es })}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {review.business_response}
          </p>
        </div>
      )}

      {/* Response Form */}
      {showActions && !review.business_response && showResponseForm && (
        <div className="mt-4 space-y-3">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Escribe tu respuesta... (mínimo 10 caracteres)"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/20 transition-colors resize-none text-sm"
            minLength={10}
            maxLength={1000}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleRespond}
              disabled={submitting || response.length < 10}
              size="sm"
              className="bg-[#00A896] hover:bg-[#008c7a] text-white"
            >
              {submitting ? 'Enviando...' : 'Publicar Respuesta'}
            </Button>
            <Button
              onClick={() => setShowResponseForm(false)}
              disabled={submitting}
              size="sm"
              variant="outline"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && !review.business_response && !showResponseForm && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
          <Button
            onClick={() => setShowResponseForm(true)}
            size="sm"
            variant="outline"
            className="text-[#00A896] border-[#00A896] hover:bg-[#00A896]/10"
          >
            <Reply size={14} className="mr-1" />
            Responder
          </Button>
        </div>
      )}
    </div>
  )
}
