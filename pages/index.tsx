import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { formatEuro, formatEuroNoDecimals } from "../lib/formatters";

interface DashboardStats {
  monthlyRecurring: number;
  yearlyRecurring: number;
  totalExpenses: number;
  totalLoans: number;
  monthlyLoanPayments: number;
  remainingLoanAmount: number;
  nextExpenses: Array<{
    name: string;
    amount: number;
    daysUntil: number;
    category: string;
  }>;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRecurring: 0,
    yearlyRecurring: 0,
    totalExpenses: 0,
    totalLoans: 0,
    monthlyLoanPayments: 0,
    remainingLoanAmount: 0,
    nextExpenses: []
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
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
      loadDashboardData();
    }
  }, [user]);

  async function loadDashboardData() {
    if (!user) return;

    try {
      // Obtener gastos recurrentes
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_recurring', true);

      // Obtener préstamos
      const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user.id);

      // Calcular métricas
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      let monthlyRecurring = 0;
      let yearlyRecurring = 0;
      const nextExpenses: any[] = [];

      (expenses || []).forEach(expense => {
        let monthlyAmount = 0;
        let yearlyAmount = 0;

        switch (expense.frequency) {
          case 'weekly':
            monthlyAmount = expense.amount * 4.33;
            yearlyAmount = expense.amount * 52;
            break;
          case 'monthly':
            monthlyAmount = expense.amount;
            yearlyAmount = expense.amount * 12;
            break;
          case 'quarterly':
            monthlyAmount = expense.amount / 3;
            yearlyAmount = expense.amount * 4;
            break;
          case 'yearly':
            if (expense.start_date) {
              const startDate = new Date(expense.start_date);
              const expenseMonth = startDate.getMonth();
              monthlyAmount = expenseMonth === currentMonth ? expense.amount : 0;
            }
            yearlyAmount = expense.amount;
            break;
        }

        monthlyRecurring += monthlyAmount;
        yearlyRecurring += yearlyAmount;

        // Calcular próximos gastos (simplificado)
        if (expense.frequency === 'monthly') {
          const today = new Date();
          const nextPayment = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          const daysUntil = Math.ceil((nextPayment.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          nextExpenses.push({
            name: expense.name,
            amount: expense.amount,
            daysUntil,
            category: expense.category || 'Sin categoría'
          });
        }
      });

      // Calcular datos de préstamos
      let monthlyLoanPayments = 0;
      let remainingLoanAmount = 0;

      (loans || []).forEach(loan => {
        monthlyLoanPayments += loan.monthly_payment;
        
        // Calcular monto restante simplificado
        const today = new Date();
        const startDate = new Date(loan.start_date);
        const endDate = new Date(loan.end_date);
        
        if (today < endDate) {
          const totalMonths = Math.ceil(loan.total_amount / loan.monthly_payment);
          const elapsedMonths = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
          const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
          remainingLoanAmount += remainingMonths * loan.monthly_payment;
        }
      });

      setStats({
        monthlyRecurring,
        yearlyRecurring,
        totalExpenses: (expenses || []).length,
        totalLoans: (loans || []).length,
        monthlyLoanPayments,
        remainingLoanAmount,
        nextExpenses: nextExpenses.slice(0, 5) // Solo los próximos 5
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 FuckMoney</h1>
            <p className="text-gray-600">Tu gestor de finanzas personales</p>
          </div>
          
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">¡Bienvenido!</h2>
              <p className="text-gray-600 mb-6">Toma el control de tus gastos recurrentes y préstamos</p>
            </div>
            
            <button 
              onClick={handleLogin} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Iniciar sesión con Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout title="Dashboard - FuckMoney">
      <div className="space-y-6">
        {/* Header minimalista */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <button 
            onClick={handleLogout} 
            className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Este Mes</p>
            <p className="text-xl font-semibold text-gray-900">{formatEuroNoDecimals(stats.monthlyRecurring)}</p>
            <p className="text-xs text-gray-500">Gastos recurrentes</p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Este Año</p>
            <p className="text-xl font-semibold text-gray-900">{formatEuroNoDecimals(stats.yearlyRecurring)}</p>
            <p className="text-xs text-gray-500">Proyección anual</p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Préstamos</p>
            <p className="text-xl font-semibold text-gray-900">{formatEuroNoDecimals(stats.monthlyLoanPayments)}</p>
            <p className="text-xs text-gray-500">Pago mensual</p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Deuda Total</p>
            <p className="text-xl font-semibold text-gray-900">{formatEuroNoDecimals(stats.remainingLoanAmount)}</p>
            <p className="text-xs text-gray-500">Por pagar</p>
          </div>
        </div>

        {/* Grid principal con contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Próximos gastos */}
          <div className="lg:col-span-2 bg-white border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Próximos Gastos
            </h3>
            
            {stats.nextExpenses.length > 0 ? (
              <div className="space-y-3">
                {stats.nextExpenses.map((expense, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <div>
                      <h4 className="font-medium text-gray-900">{expense.name}</h4>
                      <p className="text-sm text-gray-600">{expense.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatEuro(expense.amount)}</p>
                      <p className="text-xs text-gray-500">En {expense.daysUntil} días</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No tienes gastos programados próximamente</p>
              </div>
            )}
          </div>

          {/* Acciones rápidas */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Acciones Rápidas
            </h3>
            
            <div className="space-y-2">
              <button 
                onClick={() => router.push('/expenses/add')}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-3 rounded text-sm transition-colors"
              >
                Nuevo Gasto
              </button>
              
              <button 
                onClick={() => router.push('/loans')}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-900 font-medium py-2 px-3 rounded text-sm transition-colors"
              >
                Gestionar Préstamos
              </button>
              
              <button 
                onClick={() => router.push('/predictions-monthly')}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-900 font-medium py-2 px-3 rounded text-sm transition-colors"
              >
                Ver Predicciones
              </button>
            </div>
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Resumen
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3">
              <p className="text-xl font-semibold text-gray-900">{stats.totalExpenses}</p>
              <p className="text-sm text-gray-600">Gastos Registrados</p>
            </div>
            
            <div className="text-center p-3">
              <p className="text-xl font-semibold text-gray-900">{stats.totalLoans}</p>
              <p className="text-sm text-gray-600">Préstamos Activos</p>
            </div>
            
            <div className="text-center p-3">
              <p className="text-xl font-semibold text-gray-900">
                {formatEuroNoDecimals(stats.monthlyRecurring + stats.monthlyLoanPayments)}
              </p>
              <p className="text-sm text-gray-600">Total Mensual</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
