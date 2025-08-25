import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos para la base de datos
export interface Expense {
  id: string
  name: string
  amount: number
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  category: string
  start_date: string
  end_date?: string
  is_recurring: boolean
  user_id?: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  user_id?: string
  created_at: string
}

// CRUD para gastos
export async function getExpenses(userId: string) {
  return supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) {
  return supabase
    .from('expenses')
    .insert([expense])
    .select()
}

export async function updateExpense(id: string, updates: Partial<Expense>) {
  return supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
}

export async function deleteExpense(id: string) {
  return supabase
    .from('expenses')
    .delete()
    .eq('id', id)
}

// CRUD para categorías
export async function getCategories(userId: string) {
  return supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function addCategory(category: Omit<Category, 'id' | 'created_at'>) {
  return supabase
    .from('categories')
    .insert([category])
    .select()
}

export async function updateCategory(id: string, updates: Partial<Category>) {
  return supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
}

export async function deleteCategory(id: string) {
  return supabase
    .from('categories')
    .delete()
    .eq('id', id)
}
