export interface Specialist {
  id: string
  business_id: string
  name: string
  slug: string
  email?: string
  phone?: string
  specialty?: string
  description?: string
  avatar?: string
  avatar_url?: string // URL de Supabase Storage
  bio?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SpecialistAvailability {
  id: string
  specialist_id: string
  day_of_week: number // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  start_time: string  // formato 'HH:MM'
  end_time: string    // formato 'HH:MM'
  is_available: boolean
  created_at: string
  updated_at?: string
}

export interface SpecialistBlockedSlot {
  id: string
  specialist_id: string
  blocked_date: string // formato 'YYYY-MM-DD'
  start_time: string | null // NULL = todo el día
  end_time: string | null   // NULL = todo el día
  reason?: string | null
  created_at: string
  created_by?: string | null
}
