import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'

export default function AddExpense() {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    category: '',
    startDate: '',
    endDate: '',
    isRecurring: true
  })
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)

  const frequencies = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'yearly', label: 'Anual' }
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  async function fetchCategories() {
    if (!user) return;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
    if (!error && data) {
      setCategories(data);
    } else {
      // Si no hay categorías, usar las predeterminadas
      setCategories([
        { name: 'Hogar', id: 'hogar' },
        { name: 'Transporte', id: 'transporte' },
        { name: 'Ocio', id: 'ocio' },
        { name: 'Alimentación', id: 'alimentacion' },
        { name: 'Salud', id: 'salud' },
        { name: 'Educación', id: 'educacion' },
        { name: 'Servicios', id: 'servicios' },
        { name: 'Otros', id: 'otros' }
      ]);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    if (!user) {
      alert('Debes iniciar sesión para añadir gastos.')
      setLoading(false)
      return
    }
    
    // Eliminar gastos de prueba
    await supabase.from('expenses').delete().eq('name', 'prueba').eq('user_id', user.id)
    
    // Guardar nuevo gasto
    const { error } = await supabase.from('expenses').insert({
      name: formData.name,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      category: formData.category,
      start_date: formData.startDate,
      end_date: formData.endDate || null,
      is_recurring: formData.isRecurring,
      user_id: user.id,
    })
    
    setLoading(false)
    
    if (error) {
      alert('Error al guardar el gasto: ' + error.message)
      return
    }
    
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      category: '',
      startDate: '',
      endDate: '',
      isRecurring: true
    })
    alert('Gasto añadido correctamente')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  return (
    <Layout title="Añadir Gasto">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Añadir Nuevo Gasto
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre del gasto */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del gasto *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input w-full"
                placeholder="ej. Alquiler, Netflix, Gimnasio..."
                required
              />
            </div>

            {/* Cantidad */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad (€) *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="input w-full"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            {/* Frecuencia */}
            <div>
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
                Frecuencia *
              </label>
              <select
                id="frequency"
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                className="input w-full"
                required
              >
                {frequencies.map(freq => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Categoría *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input w-full"
                required
              >
                <option value="">Selecciona una categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha de inicio */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de inicio *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="input w-full"
                required
              />
            </div>

            {/* Fecha de fin (opcional) */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de fin (opcional)
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="input w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                Deja vacío para gastos sin fecha de finalización
              </p>
            </div>

            {/* Es recurrente */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isRecurring"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
                Es un gasto recurrente
              </label>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Añadiendo...' : 'Añadir Gasto'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => window.history.back()}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
