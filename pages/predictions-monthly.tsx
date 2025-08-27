import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

interface MonthlyPrediction {
  recurringExpenses: number
  estimatedOneTime: number
  total: number
  confidence: number
  historicalAverage: number
  trend: 'up' | 'down' | 'stable'
  breakdown: {
    category: string
    amount: number
    confidence: number
  }[]
}

export default function MonthlyPredictions() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthlyData, setMonthlyData] = useState<MonthlyPrediction>({
    recurringExpenses: 0,
    estimatedOneTime: 0,
    total: 0,
    confidence: 0,
    historicalAverage: 0,
    trend: 'stable',
    breakdown: []
  })
  const [budget, setBudget] = useState('')
  const [budgetComparison, setBudgetComparison] = useState<any>(null)
  const [upcomingExpenses, setUpcomingExpenses] = useState<any[]>([])

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
      calculateMonthlyPrediction()
    }
  }, [user, selectedMonth, selectedYear])

  useEffect(() => {
    if (budget) {
      const budgetNum = parseFloat(budget)
      if (!isNaN(budgetNum)) {
        const predicted = monthlyData.total
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
  }, [budget, monthlyData])

  async function calculateMonthlyPrediction() {
    if (!user) return
    setLoading(true)

    try {
      // Obtener gastos recurrentes
      const { data: recurringExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_recurring', true)

      // Obtener gastos históricos del mismo mes en años anteriores para mejorar predicción
      const { data: historicalExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${selectedYear - 2}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`)
        .lt('created_at', `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`)

      // Calcular gastos recurrentes del mes
      const monthlyRecurring = (recurringExpenses || []).reduce((total, expense) => {
        let monthlyAmount = 0
        switch (expense.frequency) {
          case 'weekly':
            monthlyAmount = expense.amount * 4.33 // Promedio de semanas por mes
            break
          case 'monthly':
            monthlyAmount = expense.amount
            break
          case 'quarterly':
            monthlyAmount = expense.amount / 3
            break
          case 'yearly':
            monthlyAmount = expense.amount / 12
            break
        }
        return total + monthlyAmount
      }, 0)

      // Calcular promedio histórico de gastos no recurrentes para este mes
      const historicalByMonth = (historicalExpenses || [])
        .filter(expense => {
          const expenseDate = new Date(expense.created_at)
          return expenseDate.getMonth() === selectedMonth && !expense.is_recurring
        })
        .reduce((total, expense) => total + expense.amount, 0)

      const historicalMonths = Math.max(1, 
        (historicalExpenses || [])
          .filter(expense => {
            const expenseDate = new Date(expense.created_at)
            return expenseDate.getMonth() === selectedMonth && !expense.is_recurring
          })
          .length > 0 ? 2 : 1
      )

      const historicalAverage = historicalByMonth / historicalMonths
      const estimatedOneTime = Math.max(historicalAverage * 1.1, monthlyRecurring * 0.2) // Mínimo 20% de recurrentes

      // Calcular breakdown por categoría
      const categoryBreakdown = (recurringExpenses || [])
        .reduce((acc: any[], expense) => {
          const existingCategory = acc.find(item => item.category === expense.category)
          let monthlyAmount = 0
          
          switch (expense.frequency) {
            case 'weekly':
              monthlyAmount = expense.amount * 4.33
              break
            case 'monthly':
              monthlyAmount = expense.amount
              break
            case 'quarterly':
              monthlyAmount = expense.amount / 3
              break
            case 'yearly':
              monthlyAmount = expense.amount / 12
              break
          }

          if (existingCategory) {
            existingCategory.amount += monthlyAmount
          } else {
            acc.push({
              category: expense.category || 'Sin categoría',
              amount: monthlyAmount,
              confidence: 90
            })
          }
          return acc
        }, [])

      // Calcular confianza basándose en datos históricos
      const hasHistoricalData = (historicalExpenses || []).length > 0
      const confidence = hasHistoricalData ? 
        Math.min(90, 50 + (historicalMonths * 15)) : 65

      // Determinar tendencia
      const currentMonthTotal = monthlyRecurring + estimatedOneTime
      let trend: 'up' | 'down' | 'stable' = 'stable'
      
      if (hasHistoricalData && historicalAverage > 0) {
        const change = (currentMonthTotal - historicalAverage) / historicalAverage
        if (change > 0.1) trend = 'up'
        else if (change < -0.1) trend = 'down'
      }

      setMonthlyData({
        recurringExpenses: monthlyRecurring,
        estimatedOneTime,
        total: monthlyRecurring + estimatedOneTime,
        confidence,
        historicalAverage,
        trend,
        breakdown: categoryBreakdown
      })

      // Obtener próximos gastos programados
      const startDate = new Date(selectedYear, selectedMonth, 1)
      const endDate = new Date(selectedYear, selectedMonth + 1, 0)
      
      const upcomingList = (recurringExpenses || [])
        .filter(expense => {
          const expenseStart = new Date(expense.start_date)
          return expenseStart <= endDate
        })
        .map(expense => ({
          name: expense.name,
          amount: expense.amount,
          category: expense.category || 'Sin categoría',
          date: startDate.toISOString().split('T')[0],
          isRecurring: true
        }))

      setUpcomingExpenses(upcomingList)

    } catch (error) {
      console.error('Error calculating predictions:', error)
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
              Inicia sesión para ver las predicciones mensuales
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
                Predicciones Mensuales
              </h1>
              <p className="text-gray-600">
                Estimaciones detalladas para {months[selectedMonth]} {selectedYear}
              </p>
            </div>
            
            <div className="flex gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="input"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Predicción principal */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Predicción del Mes
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Calculando predicciones...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-gray-700">Gastos Recurrentes</span>
                  <span className="font-bold text-blue-600">
                    €{monthlyData.recurringExpenses.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="font-medium text-gray-700">Gastos Estimados Puntuales</span>
                  <span className="font-bold text-yellow-600">
                    €{monthlyData.estimatedOneTime.toLocaleString()}
                  </span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg">
                    <span className="text-lg font-semibold text-gray-900">Total Estimado</span>
                    <span className="text-2xl font-bold text-gray-900">
                      €{monthlyData.total.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Confianza de la predicción</span>
                    <span className="text-sm font-bold text-gray-900">
                      {monthlyData.confidence}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${monthlyData.confidence}%` }}
                    ></div>
                  </div>
                </div>

                {/* Breakdown por categoría */}
                {monthlyData.breakdown.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                      Desglose por Categoría
                    </h4>
                    <div className="space-y-2">
                      {monthlyData.breakdown.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{item.category}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            €{item.amount.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparación con presupuesto */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Comparación con Presupuesto
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                  Tu presupuesto mensual (€)
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

        {/* Próximos gastos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Gastos Programados para {months[selectedMonth]}
          </h3>
          
          <div className="space-y-3">
            {upcomingExpenses.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                No hay gastos programados para este mes
              </div>
            ) : (
              <>
                {upcomingExpenses.map((expense, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {expense.name}
                          {expense.isRecurring && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Recurrente
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {expense.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        €{expense.amount}
                      </p>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800">
                    <strong>Total gastos programados:</strong> €{upcomingExpenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Análisis de tendencias */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Análisis de Tendencias
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Promedio Histórico</p>
              <p className="text-xl font-bold text-gray-900">
                €{monthlyData.historicalAverage.toFixed(0)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Predicción Actual</p>
              <p className="text-xl font-bold text-gray-900">
                €{monthlyData.total.toFixed(0)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Tendencia</p>
              <p className={`text-xl font-bold ${
                monthlyData.trend === 'up' ? 'text-red-600' :
                monthlyData.trend === 'down' ? 'text-green-600' : 'text-gray-900'
              }`}>
                {monthlyData.trend === 'up' ? '↗️ Subida' :
                 monthlyData.trend === 'down' ? '↘️ Bajada' : '➡️ Estable'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
