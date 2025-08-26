import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import RecentExpenses from "../components/RecentExpenses";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Acceso a FuckMoney</h2>
          <p className="mb-6 text-gray-600">Inicia sesión con tu cuenta de Google para continuar.</p>
          <button onClick={handleLogin} className="btn-primary w-full">Iniciar sesión con Google</button>
        </div>
      </div>
    );
  }

  return (
    <Layout title="Dashboard - FuckMoney">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Bienvenido a tu Dashboard Financiero
            </h2>
            <p className="text-gray-600">
              Gestiona tus gastos recurrentes y obtén una visión clara de tus finanzas
            </p>
          </div>
          <button onClick={handleLogout} className="btn-secondary">Cerrar sesión</button>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <span className="text-blue-600 text-xl">💰</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Gastos Mensuales
                </h3>
                <p className="text-2xl font-bold text-blue-600">€0</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <span className="text-green-600 text-xl">📊</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Proyección Anual
                </h3>
                <p className="text-2xl font-bold text-green-600">€0</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <span className="text-purple-600 text-xl">🔄</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Gastos Recurrentes
                </h3>
                <p className="text-2xl font-bold text-purple-600">0</p>
              </div>
            </div>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Acciones Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="btn-primary text-center" onClick={() => router.push('/expenses/add')}>
              Añadir Gasto Recurrente
            </button>
            <button className="btn-secondary text-center" onClick={() => router.push('/monthly')}>
              Ver Vista Mensual
            </button>
            <button className="btn-secondary text-center" onClick={() => router.push('/annual')}>
              Ver Vista Anual
            </button>
            <button className="btn-secondary text-center" onClick={() => router.push('/predictions')}>
              Ver Predicciones
            </button>
          </div>
        </div>
  {/* Gastos recientes reales */}
  <RecentExpenses user={user} />
      </div>
    </Layout>
  );
}
