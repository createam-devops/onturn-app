import { createClient } from '@/lib/supabase/client'

export interface Review {
  id: string
  business_id: string
  user_id: string | null
  appointment_id: string | null
  customer_name: string
  customer_email: string | null
  rating: number
  comment: string
  business_response: string | null
  responded_at: string | null
  responded_by: string | null
  is_verified: boolean
  is_visible: boolean
  is_flagged: boolean
  created_at: string
  updated_at: string
}

export interface CreateReviewData {
  business_id: string
  user_id?: string
  appointment_id?: string
  customer_name: string
  customer_email?: string
  rating: number
  comment: string
}

export interface BusinessRating {
  average: number
  count: number
  distribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

/**
 * Obtener todas las reviews de un negocio (públicas)
 */
export async function getBusinessReviews(businessId: string): Promise<Review[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_visible', true)
    .eq('is_flagged', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reviews:', error)
    throw error
  }

  return data || []
}

/**
 * Obtener rating promedio y distribución de un negocio
 */
export async function getBusinessRating(businessId: string): Promise<BusinessRating> {
  const supabase = createClient()
  
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('business_id', businessId)
    .eq('is_visible', true)
    .eq('is_flagged', false)

  if (error) {
    console.error('Error fetching rating:', error)
    return {
      average: 0,
      count: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    }
  }

  if (!reviews || reviews.length === 0) {
    return {
      average: 0,
      count: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    }
  }

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let sum = 0

  reviews.forEach(review => {
    sum += review.rating
    distribution[review.rating as keyof typeof distribution]++
  })

  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
    distribution
  }
}

/**
 * Crear una nueva review
 */
export async function createReview(data: CreateReviewData): Promise<Review> {
  const supabase = createClient()
  
  // Verificar si el usuario ya tiene una review para este negocio
  if (data.user_id) {
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('business_id', data.business_id)
      .eq('user_id', data.user_id)
      .maybeSingle()

    if (existing) {
      throw new Error('Ya has dejado una review para este negocio')
    }
  }

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      business_id: data.business_id,
      user_id: data.user_id || null,
      appointment_id: data.appointment_id || null,
      customer_name: data.customer_name,
      customer_email: data.customer_email || null,
      rating: data.rating,
      comment: data.comment,
      is_verified: !!data.appointment_id, // Si tiene cita, está verificada
      is_visible: true,
      is_flagged: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating review:', error)
    throw error
  }

  return review
}

/**
 * Actualizar una review (solo el usuario que la creó, dentro de 24h)
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  data: { rating: number; comment: string }
): Promise<Review> {
  const supabase = createClient()
  
  const { data: review, error } = await supabase
    .from('reviews')
    .update({
      rating: data.rating,
      comment: data.comment
    })
    .eq('id', reviewId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating review:', error)
    throw error
  }

  return review
}

/**
 * Responder a una review (solo business owner)
 */
export async function respondToReview(
  reviewId: string,
  businessResponse: string,
  respondedBy: string
): Promise<Review> {
  const supabase = createClient()
  
  const { data: review, error } = await supabase
    .from('reviews')
    .update({
      business_response: businessResponse,
      responded_at: new Date().toISOString(),
      responded_by: respondedBy
    })
    .eq('id', reviewId)
    .select()
    .single()

  if (error) {
    console.error('Error responding to review:', error)
    throw error
  }

  return review
}

/**
 * Marcar una review como visible/invisible (admin)
 */
export async function toggleReviewVisibility(
  reviewId: string,
  isVisible: boolean
): Promise<Review> {
  const supabase = createClient()
  
  const { data: review, error } = await supabase
    .from('reviews')
    .update({ is_visible: isVisible })
    .eq('id', reviewId)
    .select()
    .single()

  if (error) {
    console.error('Error toggling review visibility:', error)
    throw error
  }

  return review
}

/**
 * Marcar una review como reportada/flagged
 */
export async function flagReview(reviewId: string): Promise<Review> {
  const supabase = createClient()
  
  const { data: review, error } = await supabase
    .from('reviews')
    .update({ is_flagged: true })
    .eq('id', reviewId)
    .select()
    .single()

  if (error) {
    console.error('Error flagging review:', error)
    throw error
  }

  return review
}

/**
 * Obtener todas las reviews de un negocio (para admin - incluyendo ocultas)
 */
export async function getBusinessReviewsAdmin(businessId: string): Promise<Review[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching admin reviews:', error)
    throw error
  }

  return data || []
}

/**
 * Verificar si un usuario puede dejar review para un negocio
 */
export async function canUserReview(
  userId: string,
  businessId: string
): Promise<{ canReview: boolean; reason?: string }> {
  const supabase = createClient()
  
  // Verificar si ya tiene una review
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingReview) {
    return { canReview: false, reason: 'Ya has dejado una review para este negocio' }
  }

  // Verificar si tiene al menos una cita completada
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .limit(1)

  if (!appointments || appointments.length === 0) {
    return { 
      canReview: false, 
      reason: 'Necesitas tener al menos una cita completada para dejar una review' 
    }
  }

  return { canReview: true }
}
