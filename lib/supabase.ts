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
  start_date: string
  end_date?: string
  is_recurring: boolean
  created_at: string
  updated_at: string
  loan_id?: string // Nuevo campo para vincular a préstamos
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  user_id?: string
  created_at: string
}

export interface Loan {
  id: string
  name: string
  total_amount: number
  monthly_payment: number
  start_date: string
  end_date: string
  user_id?: string
  created_at: string
  updated_at: string
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

// CRUD para préstamos
export async function getLoans() {
  const result = await supabase
    .from('loans')
    .select('*')
    .order('created_at', { ascending: false });
  return result;
}

export async function addLoan(loan: Omit<Loan, 'id' | 'created_at' | 'updated_at'>) {
  return supabase
    .from('loans')
    .insert([loan])
    .select()
}

export async function updateLoan(id: string, updates: Partial<Loan>) {
  return supabase
    .from('loans')
    .update(updates)
    .eq('id', id)
    .select()
}

export async function deleteLoan(id: string) {
  return supabase
    .from('loans')
    .delete()
    .eq('id', id)
}

// Función simplificada para calcular información del préstamo
export async function calculateLoanInfo(loanId: string) {
  const { data: loan } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (!loan) return null;

  const today = new Date();
  const endDate = new Date(loan.end_date);
  const startDate = new Date(loan.start_date);
  
  // Calcular meses totales y transcurridos
  const totalMonths = Math.ceil(loan.total_amount / loan.monthly_payment);
  const elapsedMonths = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))); // 30.44 días promedio por mes
  const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
  
  return {
    totalMonths,
    elapsedMonths,
    remainingMonths,
    remainingAmount: remainingMonths * loan.monthly_payment,
    monthlyPayment: loan.monthly_payment
  };
}
