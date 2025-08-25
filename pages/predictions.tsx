import React, { useState } from 'react'
import Layout from '../components/Layout'

export default function Predictions() {
  const [predictionType, setPredictionType] = useState('monthly')
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1)
  const [targetYear, setTargetYear] = useState(new Date().getFullYear())
  const [budget, setBudget] = useState('')

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  // Datos de predicción de ejemplo
  const monthlyPrediction = {
    recurringExpenses: 1450,
    estimatedOneTime: 350,
    total: 1800,
    confidence: 85
  }

  const annualPrediction = {
    recurringExpenses: 17400,
    estimatedOneTime: 4200,
    total: 21600,
    monthlyAverage: 1800,
    confidence: 78
  }

  const upcomingExpenses = [
    { name: 'Alquiler', amount: 800, date: '2025-02-01', category: 'Hogar', isRecurring: true },
    { name: 'Seguro del coche', amount: 250, date: '2025-02-15', category: 'Transporte', isRecurring: false },
    { name: 'Netflix', amount: 15.99, date: '2025-02-05', category: 'Ocio', isRecurring: true },
    { name: 'Gimnasio', amount: 45, date: '2025-02-01', category: 'Salud', isRecurring: true },
    { name: 'Internet', amount: 39.99, date: '2025-02-20', category: 'Servicios', isRecurring: true },
  ]

  const budgetComparison = budget ? {
    budget: parseFloat(budget),
    predicted: predictionType === 'monthly' ? monthlyPrediction.total : annualPrediction.total,
    difference: parseFloat(budget) - (predictionType === 'monthly' ? monthlyPrediction.total : annualPrediction.total),
    percentage: ((parseFloat(budget) - (predictionType === 'monthly' ? monthlyPrediction.total : annualPrediction.total)) / parseFloat(budget)) * 100
  } : null

  return (
    <Layout title="Predicciones">
      <div className="space-y-6">
        {/* Header y controles */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Predicciones de Gastos
              </h2>
              <p className="text-gray-600">
                Estimaciones basadas en tus gastos recurrentes y patrones históricos
              </p>
            </div>
            
            <div className="flex gap-4">
              <select
                value={predictionType}
                onChange={(e) => setPredictionType(e.target.value)}
                className="input"
              >
                <option value="monthly">Predicción Mensual</option>
                <option value="annual">Predicción Anual</option>
              </select>
              
              {predictionType === 'monthly' && (
                <>
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(Number(e.target.value))}
                    className="input"
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index + 1}>{month}</option>
                    ))}
                  </select>
                  
                  <select
                    value={targetYear}
                    onChange={(e) => setTargetYear(Number(e.target.value))}
                    className="input"
                  >
                    {[2025, 2026, 2027].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Predicción principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {predictionType === 'monthly' ? 'Predicción Mensual' : 'Predicción Anual'}
              {predictionType === 'monthly' && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  para {months[targetMonth - 1]} {targetYear}
                </span>
              )}
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-gray-700">Gastos Recurrentes</span>
                <span className="font-bold text-blue-600">
                  €{(predictionType === 'monthly' ? monthlyPrediction.recurringExpenses : annualPrediction.recurringExpenses).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="font-medium text-gray-700">Gastos Estimados Puntuales</span>
                <span className="font-bold text-yellow-600">
                  €{(predictionType === 'monthly' ? monthlyPrediction.estimatedOneTime : annualPrediction.estimatedOneTime).toLocaleString()}
                </span>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg">
                  <span className="text-lg font-semibold text-gray-900">Total Estimado</span>
                  <span className="text-2xl font-bold text-gray-900">
                    €{(predictionType === 'monthly' ? monthlyPrediction.total : annualPrediction.total).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Confianza de la predicción</span>
                  <span className="text-sm font-bold text-gray-900">
                    {predictionType === 'monthly' ? monthlyPrediction.confidence : annualPrediction.confidence}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${predictionType === 'monthly' ? monthlyPrediction.confidence : annualPrediction.confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparación con presupuesto */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Comparación con Presupuesto
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                  Tu presupuesto {predictionType === 'monthly' ? 'mensual' : 'anual'} (€)
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
            Próximos Gastos Programados
          </h3>
          
          <div className="space-y-3">
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
                      {expense.category} • {new Date(expense.date).toLocaleDateString('es-ES')}
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
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              <strong>Total próximos gastos:</strong> €{upcomingExpenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Recomendaciones
          </h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">💡 Optimización</h4>
              <p className="text-green-700 text-sm">
                Puedes ahorrar aproximadamente €45/mes revisando tus suscripciones de streaming y servicios no utilizados.
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Atención</h4>
              <p className="text-yellow-700 text-sm">
                Tus gastos en la categoría "Ocio" han aumentado un 15% respecto al mes anterior. Considera establecer un límite.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📊 Tendencia</h4>
              <p className="text-blue-700 text-sm">
                Basándose en tus patrones, es recomendable reservar €{Math.round(monthlyPrediction.total * 0.1)} adicionales para gastos imprevistos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
