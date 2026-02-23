import { createClient } from '@/lib/supabase/client'
import type { Specialist, SpecialistAvailability } from '@/types/specialist'

const supabase = createClient()

export async function getSpecialistsByBusiness(businessId: string) {
  const { data, error } = await supabase
    .from('specialists')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data as Specialist[]
}

export async function getAllSpecialistsByBusiness(businessId: string, includeInactive = false) {
  let query = supabase
    .from('specialists')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Specialist[]
}
// Alias for compatibility
export const getSpecialists = getAllSpecialistsByBusiness
export async function getSpecialistBySlug(businessId: string, slug: string) {
  const { data, error } = await supabase
    .from('specialists')
    .select('*')
    .eq('business_id', businessId)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) throw error
  return data as Specialist
}

export async function getSpecialistById(specialistId: string) {
  const { data, error } = await supabase
    .from('specialists')
    .select('*')
    .eq('id', specialistId)
    .single()

  if (error) throw error
  return data as Specialist
}

export async function createSpecialist(specialist: Omit<Specialist, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('specialists')
    .insert(specialist)
    .select()
    .single()

  if (error) throw error
  return data as Specialist
}

export async function updateSpecialist(specialistId: string, updates: Partial<Specialist>) {
  const { data, error } = await supabase
    .from('specialists')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', specialistId)
    .select()
    .single()

  if (error) throw error
  return data as Specialist
}

export async function deleteSpecialist(specialistId: string) {
  // Soft delete - just mark as inactive
  const { error } = await supabase
    .from('specialists')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', specialistId)

  if (error) throw error
}

export async function getSpecialistAvailability(specialistId: string) {
  const { data, error } = await supabase
    .from('specialist_availability')
    .select('*')
    .eq('specialist_id', specialistId)
    .eq('is_available', true)
    .order('day_of_week', { ascending: true })

  if (error) throw error
  return data as SpecialistAvailability[]
}

export async function updateSpecialistAvailability(
  specialistId: string, 
  availability: Omit<SpecialistAvailability, 'id' | 'created_at'>[]
) {
  // Delete existing availability
  await supabase
    .from('specialist_availability')
    .delete()
    .eq('specialist_id', specialistId)

  // Insert new availability
  const { data, error } = await supabase
    .from('specialist_availability')
    .insert(availability)
    .select()

  if (error) throw error
  return data as SpecialistAvailability[]
}
