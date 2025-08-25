import React, { useState } from 'react'
import Layout from '../components/Layout'

export default function MonthlyView() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [sortBy, setSortBy] = useState('date')

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const categories = [
    { name: 'Hogar', color: 'bg-blue-500', amount: 850 },
    { name: 'Transporte', color: 'bg-green-500', amount: 320 },
    { name: 'Ocio', color: 'bg-purple-500', amount: 180 },
    { name: 'Alimentación', color: 'bg-yellow-500', amount: 450 },
    { name: 'Servicios', color: 'bg-pink-500', amount: 125 },
    { name: 'Otros', color: 'bg-gray-500', amount: 75 }
  ]

  // Datos de ejemplo de gastos del mes
  const expenses = [
    { id: 1, name: 'Alquiler', amount: 800, category: 'Hogar', date: '2025-01-01', isRecurring: true },
    { id: 2, name: 'Netflix', amount: 15.99, category: 'Ocio', date: '2025-01-05', isRecurring: true },
    { id: 3, name: 'Gasolina', amount: 65, category: 'Transporte', date: '2025-01-08', isRecurring: false },
    { id: 4, name: 'Supermercado', amount: 120, category: 'Alimentación', date: '2025-01-10', isRecurring: false },
    { id: 5, name: 'Gimnasio', amount: 45, category: 'Otros', date: '2025-01-15', isRecurring: true },
    { id: 6, name: 'Internet', amount: 39.99, category: 'Servicios', date: '2025-01-20', isRecurring: true },
  ]

  const totalMonth = categories.reduce((sum, cat) => sum + cat.amount, 0)
  const totalExpenses = expenses.length

  const sortedExpenses = [...expenses].sort((a, b) => {
    switch (sortBy) {
      case 'amount':
        return b.amount - a.amount
      case 'category':
        return a.category.localeCompare(b.category)
      case 'name':
        return a.name.localeCompare(b.name)
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
  })

  return (
    <Layout title="Vista Mensual">
      <div className="space-y-6">
        {/* Header y controles */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Vista Mensual de Gastos
              </h2>
              <p className="text-gray-600">
                Detalle completo de {months[selectedMonth]} {selectedYear}
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
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resumen mensual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Total del Mes
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                €{totalMonth.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Número de Gastos
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {totalExpenses}
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Gasto Promedio
              </h3>
              <p className="text-3xl font-bold text-purple-600">
                €{(totalMonth / totalExpenses).toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de categorías */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Gastos por Categoría
            </h3>
            
            {/* Gráfico circular simulado */}
            <div className="space-y-4">
              {categories.map((category, index) => {
                const percentage = (category.amount / totalMonth) * 100
                
                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${category.color}`}></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {category.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          €{category.amount} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${category.color}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lista de gastos */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Lista de Gastos
              </h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input w-auto"
              >
                <option value="date">Ordenar por fecha</option>
                <option value="amount">Ordenar por cantidad</option>
                <option value="category">Ordenar por categoría</option>
                <option value="name">Ordenar por nombre</option>
              </select>
            </div>
            
            <div className="space-y-3">
              {sortedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
                        {expense.category} • {new Date(expense.date).toLocaleDateString()}
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
            </div>
          </div>
        </div>

        {/* Comparación con meses anteriores */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Comparación con Meses Anteriores
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Mes Anterior</p>
              <p className="text-xl font-bold text-gray-900">€1,850</p>
              <p className="text-sm text-red-600">+8.1% más</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Mismo Mes Año Anterior</p>
              <p className="text-xl font-bold text-gray-900">€1,720</p>
              <p className="text-sm text-red-600">+16.3% más</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Promedio 3 Meses</p>
              <p className="text-xl font-bold text-gray-900">€1,890</p>
              <p className="text-sm text-green-600">-2.1% menos</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
