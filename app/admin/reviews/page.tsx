'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { getUserBusinesses } from '@/lib/services/admin'
import { getBusinessReviewsAdmin, toggleReviewVisibility } from '@/lib/services/reviews'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Star, 
  MessageSquare, 
  Eye, 
  EyeOff, 
  Filter,
  TrendingUp
} from 'lucide-react'
import type { Review } from '@/lib/services/reviews'

export default function ReviewsAdminPage() {
  const router = useRouter()
  const { isAuthenticated, isBusinessOwner, loading, user } = useAuth()
  const { success, error: showError } = useToast()

  const [_business, setBusiness] = useState<any>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden' | 'pending'>('all')
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/admin/login')
      return
    }

    if (!loading && !isBusinessOwner) {
      router.push('/reservas')
      return
    }

    if (!loading && isAuthenticated && isBusinessOwner && user) {
      loadData()
    }
  }, [isAuthenticated, isBusinessOwner, loading, user])

  const loadData = async () => {
    try {
      if (!user?.id) return

      setLoadingData(true)

      const businesses = await getUserBusinesses(user.id)
      if (businesses.length === 0) {
        showError('No tienes un establecimiento asignado')
        return
      }

      const currentBusiness = businesses[0]
      setBusiness(currentBusiness)

      const reviewsData = await getBusinessReviewsAdmin(currentBusiness.id)
      setReviews(reviewsData)
      setFilteredReviews(reviewsData)
    } catch (error) {
      console.error('Error loading data:', error)
      showError('Error al cargar las reviews')
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    applyFilters()
  }, [filter, ratingFilter, reviews])

  const applyFilters = () => {
    let filtered = [...reviews]

    // Filtro de visibilidad
    if (filter === 'visible') {
      filtered = filtered.filter(r => r.is_visible)
    } else if (filter === 'hidden') {
      filtered = filtered.filter(r => !r.is_visible)
    } else if (filter === 'pending') {
      filtered = filtered.filter(r => !r.business_response)
    }

    // Filtro de rating
    if (ratingFilter !== null) {
      filtered = filtered.filter(r => r.rating === ratingFilter)
    }

    setFilteredReviews(filtered)
  }

  const handleToggleVisibility = async (reviewId: string, currentVisibility: boolean) => {
    try {
      await toggleReviewVisibility(reviewId, !currentVisibility)
      success(`Review ${!currentVisibility ? 'visible' : 'oculta'} correctamente`)
      loadData()
    } catch (error: any) {
      showError(error.message || 'Error al cambiar visibilidad')
    }
  }

  const stats = {
    total: reviews.length,
    visible: reviews.filter(r => r.is_visible).length,
    pending: reviews.filter(r => !r.business_response).length,
    average: reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0'
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Cargando reviews...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-2">
            Gestión de Reviews
          </h1>
          <p className="text-slate-600">
            Administra las opiniones de tus clientes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Reviews</p>
                  <p className="text-3xl font-bold text-[#003366]">{stats.total}</p>
                </div>
                <MessageSquare className="text-slate-400" size={32} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Promedio</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-[#00A896]">{stats.average}</p>
                    <Star size={20} className="text-yellow-400" fill="currentColor" />
                  </div>
                </div>
                <TrendingUp className="text-slate-400" size={32} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Visibles</p>
                  <p className="text-3xl font-bold text-green-600">{stats.visible}</p>
                </div>
                <Eye className="text-slate-400" size={32} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Sin Responder</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <MessageSquare className="text-slate-400" size={32} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter size={20} className="text-slate-600" />
            <h3 className="font-semibold text-slate-800">Filtros</h3>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setFilter('all')}
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
              >
                Todas ({reviews.length})
              </Button>
              <Button
                onClick={() => setFilter('visible')}
                variant={filter === 'visible' ? 'default' : 'outline'}
                size="sm"
              >
                <Eye size={14} className="mr-1" />
                Visibles ({stats.visible})
              </Button>
              <Button
                onClick={() => setFilter('hidden')}
                variant={filter === 'hidden' ? 'default' : 'outline'}
                size="sm"
              >
                <EyeOff size={14} className="mr-1" />
                Ocultas ({stats.total - stats.visible})
              </Button>
              <Button
                onClick={() => setFilter('pending')}
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
              >
                Sin Responder ({stats.pending})
              </Button>
            </div>

            <div className="flex gap-2 ml-auto">
              {[5, 4, 3, 2, 1].map(rating => (
                <Button
                  key={rating}
                  onClick={() => setRatingFilter(ratingFilter === rating ? null : rating)}
                  variant={ratingFilter === rating ? 'default' : 'outline'}
                  size="sm"
                >
                  {rating} <Star size={12} className="ml-1" fill="currentColor" />
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No hay reviews para mostrar
            </h3>
            <p className="text-slate-500">
              {filter !== 'all' ? 'Prueba cambiando los filtros' : 'Aún no has recibido ninguna review'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id} className="relative">
                <ReviewCard review={review} showActions onUpdate={loadData} />
                
                {/* Admin Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    onClick={() => handleToggleVisibility(review.id, review.is_visible)}
                    size="sm"
                    variant="outline"
                    className={review.is_visible ? '' : 'bg-red-50 border-red-200'}
                  >
                    {review.is_visible ? (
                      <>
                        <Eye size={14} className="mr-1" />
                        Visible
                      </>
                    ) : (
                      <>
                        <EyeOff size={14} className="mr-1" />
                        Oculta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
