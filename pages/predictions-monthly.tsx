import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

interface MonthlyData {
  recurringExpenses: number
  breakdown: {
    category: string
    amount: number
  }[]
}

export default function MonthlyRecurring() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({
    recurringExpenses: 0,
    breakdown: []
  })
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
      calculateMonthlyRecurring()
    }
  }, [user, selectedMonth, selectedYear])

  async function calculateMonthlyRecurring() {
    if (!user) return
    setLoading(true)

    try {
      // Obtener gastos recurrentes
      const { data: recurringExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_recurring', true)

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
              amount: monthlyAmount
            })
          }
          return acc
        }, [])

      setMonthlyData({
        recurringExpenses: monthlyRecurring,
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
        .map(expense => {
          // Calcular el día del mes basado en la frecuencia y fecha de inicio
          const expenseStart = new Date(expense.start_date)
          let dayOfMonth = expenseStart.getDate()
          
          // Para gastos mensuales, usar el día de la fecha de inicio
          if (expense.frequency === 'monthly') {
            // Si el día no existe en el mes actual (ej: 31 en febrero), usar el último día del mes
            const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
            dayOfMonth = Math.min(dayOfMonth, lastDayOfMonth)
          }
          
          return {
            name: expense.name,
            amount: expense.amount,
            category: expense.category || 'Sin categoría',
            date: startDate.toISOString().split('T')[0],
            dayOfMonth: dayOfMonth,
            frequency: expense.frequency,
            isRecurring: true
          }
        })

      setUpcomingExpenses(upcomingList)

    } catch (error) {
      console.error('Error calculating recurring expenses:', error)
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
                Gastos Recurrentes Mensuales
              </h1>
              <p className="text-gray-600">
                Gastos fijos confirmados para {months[selectedMonth]} {selectedYear}
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
          {/* Gastos recurrentes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Gastos Recurrentes del Mes
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Cargando gastos recurrentes...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="text-lg font-semibold text-gray-900">Total Gastos Recurrentes</span>
                  <span className="text-2xl font-bold text-blue-600">
                    €{monthlyData.recurringExpenses.toLocaleString()}
                  </span>
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
                          {expense.category} • Día {expense.dayOfMonth}
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
      </div>
    </Layout>
  )
}
