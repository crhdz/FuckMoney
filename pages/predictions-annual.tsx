import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

interface MonthlyBreakdown {
  month: string
  monthIndex: number
  recurringExpenses: number
  estimatedOneTime: number
  total: number
  confidence: number
  trend: 'up' | 'down' | 'stable'
}

interface YearlyPrediction {
  totalRecurring: number
  totalEstimated: number
  totalYear: number
  averageMonth: number
  confidence: number
  monthlyBreakdown: MonthlyBreakdown[]
  categoryBreakdown: {
    category: string
    yearlyAmount: number
    monthlyAverage: number
    percentage: number
  }[]
}

export default function AnnualPredictions() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [yearlyData, setYearlyData] = useState<YearlyPrediction>({
    totalRecurring: 0,
    totalEstimated: 0,
    totalYear: 0,
    averageMonth: 0,
    confidence: 0,
    monthlyBreakdown: [],
    categoryBreakdown: []
  })
  const [budget, setBudget] = useState('')
  const [budgetComparison, setBudgetComparison] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'monthly'>('overview')

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
      calculateYearlyPrediction()
    }
  }, [user, selectedYear])

  useEffect(() => {
    if (budget) {
      const budgetNum = parseFloat(budget)
      if (!isNaN(budgetNum)) {
        const predicted = yearlyData.totalYear
        const difference = budgetNum - predicted
        const percentage = budgetNum > 0 ? (difference / budgetNum) * 100 : 0
        
        setBudgetComparison({
          budget: budgetNum,
          predicted,
          difference,
          percentage
        })
      }
    } else {
      setBudgetComparison(null)
    }
  }, [budget, yearlyData])

  async function calculateYearlyPrediction() {
    if (!user) return
    setLoading(true)

    try {
      // Obtener todos los gastos recurrentes
      const { data: recurringExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_recurring', true)

      // Obtener gastos históricos del año
      const { data: historicalExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${selectedYear - 2}-01-01`)
        .lt('created_at', `${selectedYear}-01-01`)

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

      // Estimar gastos no recurrentes basándose en datos históricos
      const historicalOneTime = (historicalExpenses || [])
        .filter(expense => !expense.is_recurring)
        .reduce((total, expense) => total + expense.amount, 0)

      const historicalYears = Math.max(1, 
        new Set((historicalExpenses || []).map(e => new Date(e.created_at).getFullYear())).size
      )

      const estimatedOneTimeYearly = Math.max(
        (historicalOneTime / historicalYears) * 1.1, // 10% de inflación
        yearlyRecurring * 0.3 // Mínimo 30% de los gastos recurrentes
      )

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

        // Gastos no recurrentes estimados por mes
        const historicalForMonth = (historicalExpenses || [])
          .filter(expense => {
            const expenseDate = new Date(expense.created_at)
            return expenseDate.getMonth() === index && !expense.is_recurring
          })
          .reduce((total, expense) => total + expense.amount, 0)

        const monthlyOneTime = Math.max(
          historicalForMonth / historicalYears,
          monthlyRecurring * 0.2
        )

        const total = monthlyRecurring + monthlyOneTime
        
        // Determinar tendencia basándose en datos históricos
        let trend: 'up' | 'down' | 'stable' = 'stable'
        const avgHistorical = historicalForMonth / Math.max(1, historicalYears)
        if (avgHistorical > 0) {
          const change = (total - avgHistorical) / avgHistorical
          if (change > 0.15) trend = 'up'
          else if (change < -0.15) trend = 'down'
        }

        return {
          month,
          monthIndex: index,
          recurringExpenses: monthlyRecurring,
          estimatedOneTime: monthlyOneTime,
          total,
          confidence: Math.min(85, 60 + historicalYears * 10),
          trend
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

      // Calcular confianza general
      const hasHistoricalData = (historicalExpenses || []).length > 0
      const confidence = hasHistoricalData ? 
        Math.min(90, 65 + (historicalYears * 12)) : 70

      setYearlyData({
        totalRecurring: yearlyRecurring,
        totalEstimated: estimatedOneTimeYearly,
        totalYear: yearlyRecurring + estimatedOneTimeYearly,
        averageMonth: (yearlyRecurring + estimatedOneTimeYearly) / 12,
        confidence,
        monthlyBreakdown,
        categoryBreakdown
      })

    } catch (error) {
      console.error('Error calculating yearly predictions:', error)
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
                Predicciones Anuales
              </h1>
              <p className="text-gray-600">
                Análisis completo y proyecciones para {selectedYear}
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Total Anual
                      </h3>
                      <p className="text-3xl font-bold text-blue-600">
                        €{yearlyData.totalYear.toLocaleString()}
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
                        Gastos Recurrentes
                      </h3>
                      <p className="text-3xl font-bold text-purple-600">
                        €{yearlyData.totalRecurring.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Confianza
                      </h3>
                      <p className="text-3xl font-bold text-gray-900">
                        {yearlyData.confidence}%
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

                  {/* Comparación con presupuesto */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">
                      Comparación con Presupuesto Anual
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                          Tu presupuesto anual (€)
                        </label>
                        <input
                          type="number"
                          id="budget"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          className="input w-full"
                          placeholder="Introduce tu presupuesto..."
                          step="0.01"
                        />
                      </div>
                      
                      {budgetComparison && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">Tu Presupuesto</span>
                            <span className="font-bold text-gray-900">
                              €{budgetComparison.budget.toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">Gasto Predicho</span>
                            <span className="font-bold text-gray-900">
                              €{budgetComparison.predicted.toLocaleString()}
                            </span>
                          </div>
                          
                          <div className={`flex justify-between items-center p-3 rounded-lg ${
                            budgetComparison.difference >= 0 ? 'bg-green-50' : 'bg-red-50'
                          }`}>
                            <span className="font-medium text-gray-700">Diferencia</span>
                            <span className={`font-bold ${
                              budgetComparison.difference >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {budgetComparison.difference >= 0 ? '+' : ''}€{budgetComparison.difference.toFixed(0)}
                              <span className="text-sm ml-1">
                                ({budgetComparison.percentage >= 0 ? '+' : ''}{budgetComparison.percentage.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                          
                          {budgetComparison.difference < 0 && (
                            <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
                              <p className="text-red-800 text-sm">
                                ⚠️ <strong>Alerta:</strong> Tus gastos predichos superan tu presupuesto en €{Math.abs(budgetComparison.difference).toFixed(0)}
                              </p>
                            </div>
                          )}
                        </div>
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
                    Predicciones Mes por Mes - {selectedYear}
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gastos Estimados
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Confianza
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tendencia
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              €{month.estimatedOneTime.toFixed(0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              €{month.total.toFixed(0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm text-gray-900 mr-2">
                                {month.confidence}%
                              </div>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${month.confidence}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              month.trend === 'up' ? 'bg-red-100 text-red-800' :
                              month.trend === 'down' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {month.trend === 'up' ? '↗️ Subida' :
                               month.trend === 'down' ? '↘️ Bajada' : '➡️ Estable'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Resumen de la tabla */}
                <div className="p-6 bg-gray-50 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Recurrentes</p>
                      <p className="text-lg font-semibold text-blue-600">
                        €{yearlyData.totalRecurring.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Estimados</p>
                      <p className="text-lg font-semibold text-yellow-600">
                        €{yearlyData.totalEstimated.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Año</p>
                      <p className="text-lg font-semibold text-gray-900">
                        €{yearlyData.totalYear.toFixed(0)}
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
