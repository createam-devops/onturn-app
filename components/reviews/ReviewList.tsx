'use client'

import { useEffect, useState } from 'react'
import { ReviewCard } from './ReviewCard'
import { StarRating } from './StarRating'
import { getBusinessReviews, getBusinessRating } from '@/lib/services/reviews'
import type { Review, BusinessRating } from '@/lib/services/reviews'
import { Star, Users } from 'lucide-react'

interface ReviewListProps {
  businessId: string
  showActions?: boolean
  onUpdate?: () => void
}

export default function ReviewList({ businessId, showActions = false, onUpdate }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [rating, setRating] = useState<BusinessRating>({
    average: 0,
    count: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReviews()
  }, [businessId])

  const loadReviews = async () => {
    try {
      setLoading(true)
      const [reviewsData, ratingData] = await Promise.all([
        getBusinessReviews(businessId),
        getBusinessRating(businessId)
      ])
      setReviews(reviewsData)
      setRating(ratingData)
    } catch (error) {
      console.error('Error loading reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = () => {
    loadReviews()
    if (onUpdate) onUpdate()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-slate-100 rounded-2xl h-48 animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {rating.count > 0 && (
        <div className="bg-gradient-to-br from-[#003366] to-[#00A896] rounded-2xl p-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Average Rating */}
            <div className="text-center md:text-left">
              <div className="text-5xl font-bold mb-2">{rating.average}</div>
              <StarRating rating={rating.average} size={24} />
              <p className="text-white/80 mt-2 text-sm">
                Basado en {rating.count} opinión{rating.count !== 1 ? 'es' : ''}
              </p>
            </div>

            {/* Distribution */}
            <div className="md:col-span-2 space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = rating.distribution[stars as keyof typeof rating.distribution]
                const percentage = rating.count > 0 ? (count / rating.count) * 100 : 0

                return (
                  <div key={stars} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium">{stars}</span>
                      <Star size={14} fill="currentColor" />
                    </div>
                    <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-white h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm w-12 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="mx-auto w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
            <Star size={24} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            Aún no hay opiniones
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Sé el primero en compartir tu experiencia con este negocio
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#003366] flex items-center gap-2">
            <Users size={20} />
            Opiniones de clientes ({reviews.length})
          </h3>
          
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showActions={showActions}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
