'use client'

import { useState } from 'react'
import { StarRating } from './StarRating'
import { Button } from '@/components/ui/button'
import { reviewSchema } from '@/lib/schemas'
import { createReview } from '@/lib/services/reviews'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { MessageSquare } from 'lucide-react'

interface ReviewFormProps {
  businessId: string
  businessName: string
  appointmentId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReviewForm({
  businessId,
  businessName,
  appointmentId,
  onSuccess,
  onCancel
}: ReviewFormProps) {
  const { user } = useAuth()
  const { success: showSuccess, error: showError } = useToast()

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar con Zod
    const validation = reviewSchema.safeParse({
      rating,
      comment,
      customerName,
      customerEmail: customerEmail || undefined
    })

    if (!validation.success) {
      const firstError = validation.error.issues[0]
      showError(firstError.message)
      return
    }

    try {
      setSubmitting(true)

      await createReview({
        business_id: businessId,
        user_id: user?.id,
        appointment_id: appointmentId,
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        rating,
        comment
      })

      showSuccess('¡Gracias por tu review! Ha sido publicada correctamente')
      
      if (onSuccess) {
        onSuccess()
      }

      // Reset form
      setRating(5)
      setComment('')
      setCustomerName('')
      setCustomerEmail('')
    } catch (error: any) {
      console.error('Error creating review:', error)
      showError(error.message || 'Error al enviar la review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-[#00A896] rounded-full flex items-center justify-center">
          <MessageSquare size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#003366]">Deja tu opinión</h3>
          <p className="text-sm text-slate-500">sobre {businessName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Calificación
          </label>
          <StarRating
            rating={rating}
            interactive
            onChange={setRating}
            size={32}
            showLabel
          />
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Comentario <span className="text-red-500">*</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos sobre tu experiencia... (mínimo 10 caracteres)"
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/20 transition-colors resize-none"
            required
            minLength={10}
            maxLength={1000}
          />
          <p className="text-xs text-slate-400 mt-1">
            {comment.length}/1000 caracteres
          </p>
        </div>

        {/* Customer Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tu nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/20 transition-colors"
            required
          />
        </div>

        {/* Customer Email (optional) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email (opcional)
          </label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/20 transition-colors"
          />
          <p className="text-xs text-slate-400 mt-1">
            Tu email no será visible públicamente
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={submitting || !rating || !comment || !customerName}
            className="flex-1 bg-[#00A896] hover:bg-[#008c7a] text-white"
          >
            {submitting ? 'Enviando...' : 'Publicar Review'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              disabled={submitting}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
