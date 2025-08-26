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
// Comprobar conexión a la base de datos
export async function checkSupabaseConnection() {
  const { error } = await supabase.from('categories').select('id').limit(1);
  return !error;
}
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
  console.log('getCategories called with userId:', userId);
  // Si estamos usando RLS, no necesitamos filtrar por user_id
  const result = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: false });
  console.log('getCategories result:', result);
  return result;
}

export async function addCategory(category: Omit<Category, 'id' | 'created_at'>) {
  // No incluir user_id explícito, dejar que RLS lo maneje automáticamente
  const categoryData = {
    name: category.name,
    color: category.color,
    icon: category.icon
  };
  
  return supabase
    .from('categories')
    .insert([categoryData])
    .select()
}

// Función simplificada que usa solo RLS sin user_id explícito
export async function addCategorySimple(name: string, color: string, icon: string) {
  console.log('addCategorySimple called with:', { name, color, icon });
  
  const result = await supabase
    .from('categories')
    .insert([{
      name: name,
      color: color,
      icon: icon
    }])
    .select();
    
  console.log('addCategorySimple result:', result);
  return result;
}

// Función de emergencia que usa SQL directo
export async function addCategoryDirect(name: string, color: string, icon: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: { message: 'Usuario no autenticado' } };
  }

  // Usar rpc para insertar sin restricciones de FK
  return supabase.rpc('insert_category', {
    category_name: name,
    category_color: color,
    category_icon: icon,
    category_user_id: user.id
  });
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
