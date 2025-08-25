import React from "react";
import Layout from "../components/Layout";

export default function Home() {
  return (
    <Layout title="Dashboard - FuckMoney">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido a tu Dashboard Financiero
          </h2>
          <p className="text-gray-600">
            Gestiona tus gastos recurrentes y obtén una visión clara de tus finanzas
          </p>
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
            <button className="btn-primary text-center">
              Añadir Gasto Recurrente
            </button>
            <button className="btn-secondary text-center">
              Ver Vista Mensual
            </button>
            <button className="btn-secondary text-center">
              Ver Vista Anual
            </button>
            <button className="btn-secondary text-center">
              Ver Predicciones
            </button>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Gastos Recientes
          </h3>
          <div className="text-center py-8 text-gray-500">
            <p>No hay gastos registrados aún.</p>
            <p className="text-sm mt-2">
              Comienza añadiendo tu primer gasto recurrente.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
