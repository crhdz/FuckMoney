import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

interface MonthlyBreakdown {
  month: string
  monthIndex: number
  recurringExpenses: number
}

interface YearlyData {
  totalRecurring: number
  averageMonth: number
  monthlyBreakdown: MonthlyBreakdown[]
  categoryBreakdown: {
    category: string
    yearlyAmount: number
    monthlyAverage: number
    percentage: number
  }[]
}

export default function AnnualRecurring() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [yearlyData, setYearlyData] = useState<YearlyData>({
    totalRecurring: 0,
    averageMonth: 0,
    monthlyBreakdown: [],
    categoryBreakdown: []
  })
  const [viewMode, setViewMode] = useState<'overview' | 'monthly'>('monthly')

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
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
      calculateYearlyRecurring()
    }
  }, [user, selectedYear])

  async function calculateYearlyRecurring() {
    if (!user) return
    setLoading(true)

    try {
      // Obtener todos los gastos recurrentes
      const { data: recurringExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_recurring', true)

      // Calcular gastos recurrentes anuales
      const yearlyRecurring = (recurringExpenses || []).reduce((total, expense) => {
        let yearlyAmount = 0
        switch (expense.frequency) {
          case 'weekly':
            yearlyAmount = expense.amount * 52
            break
          case 'monthly':
            yearlyAmount = expense.amount * 12
            break
          case 'quarterly':
            yearlyAmount = expense.amount * 4
            break
          case 'yearly':
            yearlyAmount = expense.amount
            break
        }
        return total + yearlyAmount
      }, 0)

      // Calcular breakdown mensual
      const monthlyBreakdown: MonthlyBreakdown[] = months.map((month, index) => {
        // Gastos recurrentes del mes
        const monthlyRecurring = (recurringExpenses || []).reduce((total, expense) => {
          let monthlyAmount = 0
          switch (expense.frequency) {
            case 'weekly':
              monthlyAmount = expense.amount * 4.33
              break
            case 'monthly':
              monthlyAmount = expense.amount
              break
            case 'quarterly':
              monthlyAmount = index % 3 === 0 ? expense.amount : 0
              break
            case 'yearly':
              monthlyAmount = index === 0 ? expense.amount : 0 // Asumimos enero para gastos anuales
              break
          }
          return total + monthlyAmount
        }, 0)

        return {
          month,
          monthIndex: index,
          recurringExpenses: monthlyRecurring
        }
      })

      // Calcular breakdown por categoría
      const categoryBreakdown = (recurringExpenses || [])
        .reduce((acc: any[], expense) => {
          const existingCategory = acc.find(item => item.category === expense.category)
          let yearlyAmount = 0
          
          switch (expense.frequency) {
            case 'weekly':
              yearlyAmount = expense.amount * 52
              break
            case 'monthly':
              yearlyAmount = expense.amount * 12
              break
            case 'quarterly':
              yearlyAmount = expense.amount * 4
              break
            case 'yearly':
              yearlyAmount = expense.amount
              break
          }

          if (existingCategory) {
            existingCategory.yearlyAmount += yearlyAmount
          } else {
            acc.push({
              category: expense.category || 'Sin categoría',
              yearlyAmount,
              monthlyAverage: yearlyAmount / 12,
              percentage: 0 // Se calculará después
            })
          }
          return acc
        }, [])

      // Calcular porcentajes
      const totalCategoryAmount = categoryBreakdown.reduce((sum, cat) => sum + cat.yearlyAmount, 0)
      categoryBreakdown.forEach(cat => {
        cat.percentage = totalCategoryAmount > 0 ? (cat.yearlyAmount / totalCategoryAmount) * 100 : 0
      })

      setYearlyData({
        totalRecurring: yearlyRecurring,
        averageMonth: yearlyRecurring / 12,
        monthlyBreakdown,
        categoryBreakdown
      })

    } catch (error) {
      console.error('Error calculating yearly recurring expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Inicia sesión para ver las predicciones anuales
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
              <h1 className="text-3xl font-bold text-gray-900">
                Gastos Recurrentes Anuales
              </h1>
              <p className="text-gray-600">
                Gastos fijos confirmados para {selectedYear}
              </p>
            </div>
            
            <div className="flex gap-4">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'overview' | 'monthly')}
                className="input"
              >
                <option value="overview">Vista General</option>
                <option value="monthly">Desglose Mensual</option>
              </select>
              
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="input"
              >
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Calculando predicciones anuales...</div>
          </div>
        ) : (
          <>
            {viewMode === 'overview' ? (
              <>
                {/* Resumen anual */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Total Anual
                      </h3>
                      <p className="text-3xl font-bold text-blue-600">
                        €{yearlyData.totalRecurring.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Promedio Mensual
                      </h3>
                      <p className="text-3xl font-bold text-green-600">
                        €{yearlyData.averageMonth.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Gastos Confirmados
                      </h3>
                      <p className="text-3xl font-bold text-purple-600">
                        €{yearlyData.totalRecurring.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Breakdown por categoría */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">
                      Gastos por Categoría
                    </h3>
                    
                    <div className="space-y-4">
                      {yearlyData.categoryBreakdown.length === 0 ? (
                        <div className="text-gray-500 text-center py-4">
                          No hay categorías con gastos recurrentes
                        </div>
                      ) : (
                        yearlyData.categoryBreakdown.map((category, index) => (
                          <div key={index} className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-gray-700">
                                  {category.category}
                                </span>
                                <span className="text-sm text-gray-600">
                                  €{category.yearlyAmount.toFixed(0)} ({category.percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${category.percentage}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Promedio mensual: €{category.monthlyAverage.toFixed(0)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Vista mensual detallada */
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Gastos Recurrentes Mes por Mes - {selectedYear}
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gastos Recurrentes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {yearlyData.monthlyBreakdown.map((month, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {month.month}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              €{month.recurringExpenses.toFixed(0)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Resumen de la tabla */}
                <div className="p-6 bg-gray-50 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Anual</p>
                      <p className="text-lg font-semibold text-blue-600">
                        €{yearlyData.totalRecurring.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Promedio Mensual</p>
                      <p className="text-lg font-semibold text-green-600">
                        €{yearlyData.averageMonth.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
