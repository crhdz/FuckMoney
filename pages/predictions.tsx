import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function Predictions() {
  const [viewType, setViewType] = useState('monthly') // 'monthly' o 'yearly'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [budget, setBudget] = useState('')

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  // Estado para datos reales
  const [user, setUser] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState({
    recurringExpenses: 0, 
    estimatedOneTime: 0, 
    total: 0, 
    confidence: 100,
    historicalAverage: 0,
    trend: 'stable' as 'increasing' | 'decreasing' | 'stable'
  });
  const [yearlyData, setYearlyData] = useState({
    recurringExpenses: 0, 
    estimatedOneTime: 0, 
    total: 0, 
    monthlyAverage: 0, 
    confidence: 100,
    monthlyBreakdown: [] as any[]
  });
  const [upcomingExpenses, setUpcomingExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!user) return;
    setLoading(true);
    
    (async () => {
      if (viewType === 'monthly') {
        await calculateMonthlyPrediction();
      } else {
        await calculateYearlyPrediction();
      }
      setLoading(false);
    })();
  }, [user, viewType, selectedMonth, selectedYear]);

  // Función para calcular predicción mensual mejorada
  async function calculateMonthlyPrediction() {
    const monthNum = (selectedMonth + 1).toString().padStart(2, '0');
    const currentMonth = `${selectedYear}-${monthNum}`;
    
    // Obtener gastos recurrentes
    const { data: recurringExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_recurring', true);
    
    // Obtener gastos históricos del mismo mes en años anteriores para mejorar predicción
    const { data: historicalData } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .like('created_at', `%-${monthNum}-%`);
    
    // Calcular gastos recurrentes del mes
    const monthlyRecurring = (recurringExpenses || []).reduce((sum, expense) => {
      // Solo contar si el gasto está activo en el mes seleccionado
      const startDate = new Date(expense.start_date);
      const endDate = expense.end_date ? new Date(expense.end_date) : null;
      const targetDate = new Date(selectedYear, selectedMonth, 15); // Medio del mes
      
      if (startDate <= targetDate && (!endDate || endDate >= targetDate)) {
        return sum + (expense.amount || 0);
      }
      return sum;
    }, 0);
    
    // Calcular promedio histórico de gastos no recurrentes para este mes
    const historicalOneTime = (historicalData || [])
      .filter(e => !e.is_recurring)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const yearsOfData = Math.max(1, new Set(historicalData?.map(e => e.created_at.substring(0, 4)) || []).size);
    const estimatedOneTime = historicalOneTime / yearsOfData;
    
    // Calcular promedio histórico total para detectar tendencias
    const historicalTotal = (historicalData || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const historicalAverage = historicalTotal / yearsOfData;
    
    setMonthlyData({
      recurringExpenses: monthlyRecurring,
      estimatedOneTime: estimatedOneTime,
      total: monthlyRecurring + estimatedOneTime,
      confidence: recurringExpenses?.length ? Math.min(95, 60 + (recurringExpenses.length * 5)) : 50,
      historicalAverage: historicalAverage,
      trend: historicalAverage > (monthlyRecurring + estimatedOneTime) * 1.1 ? 'decreasing' : 
             historicalAverage < (monthlyRecurring + estimatedOneTime) * 0.9 ? 'increasing' : 'stable'
    });
    
    // Obtener próximos gastos programados
    const { data: upcoming } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_date', `${selectedYear}-${monthNum}-01`)
      .lte('start_date', `${selectedYear}-${monthNum}-31`);
    
    setUpcomingExpenses(upcoming || []);
  }

  // Función para calcular predicción anual mejorada
  async function calculateYearlyPrediction() {
    // Obtener todos los gastos recurrentes
    const { data: recurringExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_recurring', true);
    
    // Obtener gastos históricos del año
    const { data: yearData } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', `${selectedYear}-01-01`)
      .lte('created_at', `${selectedYear}-12-31`);
    
    // Calcular gastos recurrentes anuales
    const yearlyRecurring = (recurringExpenses || []).reduce((sum, expense) => {
      const startDate = new Date(expense.start_date);
      const endDate = expense.end_date ? new Date(expense.end_date) : new Date(selectedYear, 11, 31);
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31);
      
      // Calcular cuántos meses del año está activo el gasto
      const activeStart = new Date(Math.max(startDate.getTime(), yearStart.getTime()));
      const activeEnd = new Date(Math.min(endDate.getTime(), yearEnd.getTime()));
      const monthsActive = Math.max(0, (activeEnd.getFullYear() - activeStart.getFullYear()) * 12 + activeEnd.getMonth() - activeStart.getMonth() + 1);
      
      return sum + ((expense.amount || 0) * monthsActive);
    }, 0);
    
    // Estimar gastos no recurrentes basándose en datos históricos
    const nonRecurringData = (yearData || []).filter(e => !e.is_recurring);
    const estimatedNonRecurring = nonRecurringData.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Crear desglose mensual
    const monthlyBreakdown = months.map((month, index) => {
      const monthRecurring = (recurringExpenses || []).reduce((sum, expense) => {
        const startDate = new Date(expense.start_date);
        const endDate = expense.end_date ? new Date(expense.end_date) : null;
        const monthDate = new Date(selectedYear, index, 15);
        
        if (startDate <= monthDate && (!endDate || endDate >= monthDate)) {
          return sum + (expense.amount || 0);
        }
        return sum;
      }, 0);
      
      const monthActual = (yearData || [])
        .filter(e => new Date(e.created_at).getMonth() === index)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      return {
        month,
        recurring: monthRecurring,
        estimated: monthRecurring + (estimatedNonRecurring / 12),
        actual: monthActual
      };
    });
    
    const totalEstimated = yearlyRecurring + estimatedNonRecurring;
    
    setYearlyData({
      recurringExpenses: yearlyRecurring,
      estimatedOneTime: estimatedNonRecurring,
      total: totalEstimated,
      monthlyAverage: totalEstimated / 12,
      confidence: recurringExpenses?.length ? Math.min(90, 50 + (recurringExpenses.length * 3)) : 40,
      monthlyBreakdown: monthlyBreakdown
    });
    
    // Obtener próximos gastos del año
    const { data: upcoming } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_date', `${selectedYear}-01-01`)
      .lte('start_date', `${selectedYear}-12-31`);
    
    setUpcomingExpenses(upcoming || []);
  }

  const budgetComparison = budget ? {
    budget: parseFloat(budget),
    predicted: viewType === 'monthly' ? monthlyData.total : yearlyData.total,
    difference: parseFloat(budget) - (viewType === 'monthly' ? monthlyData.total : yearlyData.total),
    percentage: ((parseFloat(budget) - (viewType === 'monthly' ? monthlyData.total : yearlyData.total)) / parseFloat(budget)) * 100
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
                value={viewType}
                onChange={(e) => setViewType(e.target.value)}
                className="input"
              >
                <option value="monthly">Vista Mensual</option>
                <option value="yearly">Vista Anual</option>
              </select>
              
              {viewType === 'monthly' && (
                <>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="input"
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index}>{month}</option>
                    ))}
                  </select>
                </>
              )}
              
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

        {/* Predicción principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {viewType === 'monthly' ? 'Predicción Mensual' : 'Predicción Anual'}
              {viewType === 'monthly' && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  para {months[selectedMonth]} {selectedYear}
                </span>
              )}
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-gray-700">Gastos Recurrentes</span>
                <span className="font-bold text-blue-600">
                  €{(viewType === 'monthly' ? monthlyData.recurringExpenses : yearlyData.recurringExpenses).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="font-medium text-gray-700">Gastos Estimados Puntuales</span>
                <span className="font-bold text-yellow-600">
                  €{(viewType === 'monthly' ? monthlyData.estimatedOneTime : yearlyData.estimatedOneTime).toLocaleString()}
                </span>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg">
                  <span className="text-lg font-semibold text-gray-900">Total Estimado</span>
                  <span className="text-2xl font-bold text-gray-900">
                    €{(viewType === 'monthly' ? monthlyData.total : yearlyData.total).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Confianza de la predicción</span>
                  <span className="text-sm font-bold text-gray-900">
                    {viewType === 'monthly' ? monthlyData.confidence : yearlyData.confidence}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${viewType === 'monthly' ? monthlyData.confidence : yearlyData.confidence}%` }}
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
                  Tu presupuesto {viewType === 'monthly' ? 'mensual' : 'anual'} (€)
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
                Basándose en tus patrones, es recomendable reservar €{Math.round(monthlyData.total * 0.1)} adicionales para gastos imprevistos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
