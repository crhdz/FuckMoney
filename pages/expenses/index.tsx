import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

interface Expense {
  id: string
  name: string
  amount: number
  frequency: string
  category: string
  start_date: string
  end_date?: string
  is_recurring: boolean
  loan_id?: string
  created_at: string
  updated_at: string
}

interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export default function ExpensesManager() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_at')

  const frequencies = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'yearly', label: 'Anual' }
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchExpenses()
      fetchCategories()
    }
  }, [user])

  async function fetchExpenses() {
    if (!user) return
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
      alert('Error al cargar los gastos')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  async function handleUpdateExpense(expense: Expense) {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          name: expense.name,
          amount: expense.amount,
          frequency: expense.frequency,
          category: expense.category,
          start_date: expense.start_date,
          end_date: expense.end_date,
          is_recurring: expense.is_recurring,
          updated_at: new Date().toISOString()
        })
        .eq('id', expense.id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setEditingExpense(null)
      fetchExpenses()
      alert('Gasto actualizado correctamente')
    } catch (error) {
      console.error('Error updating expense:', error)
      alert('Error al actualizar el gasto')
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      fetchExpenses()
      setShowDeleteModal(false)
      setExpenseToDelete(null)
      alert('Gasto eliminado correctamente')
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Error al eliminar el gasto')
    }
  }

  // Filtrar y ordenar gastos
  const filteredExpenses = expenses
    .filter(expense => {
      // Filtro por tipo
      if (filter === 'recurring' && !expense.is_recurring) return false
      if (filter === 'one-time' && expense.is_recurring) return false
      
      // Filtro por búsqueda
      if (searchTerm && !expense.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !expense.category.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'amount':
          return b.amount - a.amount
        case 'category':
          return a.category.localeCompare(b.category)
        case 'frequency':
          return a.frequency.localeCompare(b.frequency)
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Inicia sesión para gestionar tus gastos
            </h1>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Gastos</h1>
              <p className="text-gray-600">Edita, elimina y organiza todos tus gastos</p>
            </div>
            <Link
              href="/expenses/add"
              className="btn btn-primary w-full md:w-auto text-center"
            >
              + Añadir Nuevo Gasto
            </Link>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por tipo
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input w-full"
              >
                <option value="all">Todos los gastos</option>
                <option value="recurring">Solo recurrentes</option>
                <option value="one-time">Solo únicos</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input w-full"
              >
                <option value="created_at">Fecha de creación</option>
                <option value="name">Nombre</option>
                <option value="amount">Cantidad</option>
                <option value="category">Categoría</option>
                <option value="frequency">Frecuencia</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <strong>{filteredExpenses.length}</strong> gasto{filteredExpenses.length !== 1 ? 's' : ''} encontrado{filteredExpenses.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de gastos */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Cargando gastos...</div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                {expenses.length === 0 
                  ? 'No tienes gastos registrados'
                  : 'No se encontraron gastos con los filtros aplicados'
                }
              </div>
              {expenses.length === 0 && (
                <Link href="/expenses/add" className="btn btn-primary">
                  Añadir tu primer gasto
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gasto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frecuencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {expense.name}
                          </div>
                          <div className="flex gap-2 mt-1">
                            {expense.is_recurring && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Recurrente
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          €{expense.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{expense.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {frequencies.find(f => f.value === expense.frequency)?.label || expense.frequency}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(expense.start_date).toLocaleDateString('es-ES')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setExpenseToDelete(expense.id)
                              setShowDeleteModal(true)
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de edición */}
        {editingExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Editar Gasto
              </h3>
              
              <form onSubmit={(e) => {
                e.preventDefault()
                handleUpdateExpense(editingExpense)
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del gasto
                    </label>
                    <input
                      type="text"
                      value={editingExpense.name}
                      onChange={(e) => setEditingExpense({
                        ...editingExpense,
                        name: e.target.value
                      })}
                      className="input w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingExpense.amount}
                      onChange={(e) => setEditingExpense({
                        ...editingExpense,
                        amount: parseFloat(e.target.value) || 0
                      })}
                      className="input w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría
                    </label>
                    <select
                      value={editingExpense.category}
                      onChange={(e) => setEditingExpense({
                        ...editingExpense,
                        category: e.target.value
                      })}
                      className="input w-full"
                      required
                    >
                      <option value="">Selecciona una categoría</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frecuencia
                    </label>
                    <select
                      value={editingExpense.frequency}
                      onChange={(e) => setEditingExpense({
                        ...editingExpense,
                        frequency: e.target.value
                      })}
                      className="input w-full"
                      required
                    >
                      {frequencies.map((freq) => (
                        <option key={freq.value} value={freq.value}>
                          {freq.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={editingExpense.start_date}
                      onChange={(e) => setEditingExpense({
                        ...editingExpense,
                        start_date: e.target.value
                      })}
                      className="input w-full"
                      required
                    />
                  </div>
                  
                  {!editingExpense.is_recurring && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de fin (opcional)
                      </label>
                      <input
                        type="date"
                        value={editingExpense.end_date || ''}
                        onChange={(e) => setEditingExpense({
                          ...editingExpense,
                          end_date: e.target.value || undefined
                        })}
                        className="input w-full"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={editingExpense.is_recurring}
                      onChange={(e) => setEditingExpense({
                        ...editingExpense,
                        is_recurring: e.target.checked
                      })}
                      className="mr-2"
                    />
                    <label htmlFor="is_recurring" className="text-sm text-gray-700">
                      Gasto recurrente
                    </label>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingExpense(null)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ¿Eliminar gasto?
              </h3>
              <p className="text-gray-600 mb-6">
                Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar este gasto?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setExpenseToDelete(null)
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => expenseToDelete && handleDeleteExpense(expenseToDelete)}
                  className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
