import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { formatEuro, formatEuroNoDecimals } from '../lib/formatters'

export default function AnnualView() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedCategory, setSelectedCategory] = useState('all')

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const categories = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'hogar', label: 'Hogar' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'ocio', label: 'Ocio' },
    { value: 'alimentacion', label: 'Alimentación' },
    { value: 'salud', label: 'Salud' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'otros', label: 'Otros' }
  ]

  const [user, setUser] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<{month: string, total: number, expenses: number}[]>(months.map(month => ({ month, total: 0, expenses: 0 })));
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
    if (!user) {
      setMonthlyData(months.map(month => ({ month, total: 0, expenses: 0 })));
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${selectedYear}-01-01`)
        .lte('created_at', `${selectedYear}-12-31`);
      if (error || !data) {
        setMonthlyData(months.map(month => ({ month, total: 0, expenses: 0 })));
        setLoading(false);
        return;
      }
      // Agrupar por mes
      const result = months.map((month, idx) => {
        const monthNum = (idx+1).toString().padStart(2, '0');
        const filtered = data.filter(e => e.created_at.startsWith(`${selectedYear}-${monthNum}`));
        return {
          month,
          total: filtered.reduce((sum, e) => sum + (e.amount || 0), 0),
          expenses: filtered.length
        };
      });
      setMonthlyData(result);
      setLoading(false);
    })();
  }, [user, selectedYear]);

  const totalYear = monthlyData.reduce((sum, month) => sum + month.total, 0);
  const averageMonth = totalYear / 12;

  return (
    <Layout title="Vista Anual">
      <div className="space-y-6">
        {/* Header y controles */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Vista Anual de Gastos
              </h2>
              <p className="text-gray-600">
                Resumen completo de tus gastos para el año {selectedYear}
              </p>
            </div>
            
            <div className="flex gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="input"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resumen anual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Total Anual
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {formatEuroNoDecimals(totalYear)}
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Promedio Mensual
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {formatEuroNoDecimals(averageMonth)}
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Mes Más Costoso
              </h3>
              <p className="text-3xl font-bold text-red-600">
                {formatEuroNoDecimals(Math.max(...monthlyData.map(m => m.total)))}
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico de barras mensual */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Gastos por Mes
          </h3>
          
          <div className="space-y-4">
            {loading ? (
              <div className="text-gray-500">Cargando gastos...</div>
            ) : monthlyData.map((data, index) => {
              const percentage = monthlyData.length ? (data.total / Math.max(...monthlyData.map(m => m.total))) * 100 : 0;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-gray-700">{data.month}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2" style={{ width: `${percentage}%` }}>
                      <span className="text-white text-xs font-medium">{formatEuroNoDecimals(data.total)}</span>
                    </div>
                  </div>
                  <div className="w-16 text-sm text-gray-500">{data.expenses} gastos</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendario anual */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Calendario de Gastos
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {months.map((month, index) => {
              const monthData = monthlyData[index]
              const isHighExpense = monthData.total > averageMonth * 1.2
              
              return (
                <div
                  key={month}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    isHighExpense 
                      ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <h4 className="font-semibold text-gray-900">{month}</h4>
                  <p className="text-2xl font-bold text-blue-600 mt-2">
                    {formatEuroNoDecimals(monthData.total)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {monthData.expenses} gastos
                  </p>
                  {isHighExpense && (
                    <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      Mes costoso
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Proyección */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Proyección Anual
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              <strong>Estimación:</strong> Basándose en tus gastos actuales, necesitarás aproximadamente{' '}
              <span className="font-bold">{formatEuroNoDecimals(totalYear)}</span> para cubrir todos tus gastos en {selectedYear}.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
