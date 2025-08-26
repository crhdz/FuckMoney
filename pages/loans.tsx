import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase, getLoans, addLoan, updateLoan, deleteLoan, calculateRemainingPayments } from '../lib/supabase'

export default function Loans() {
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLoan, setEditingLoan] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    total_amount: '',
    monthly_payment: '',
    interest_rate: '',
    start_date: '',
    end_date: ''
  })

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
    if (user) {
      fetchLoans();
    }
  }, [user]);

  async function fetchLoans() {
    setLoading(true);
    const { data, error } = await getLoans();
    if (!error && data) {
      const loansWithCalculations = await Promise.all(
        data.map(async (loan) => {
          const remaining = await calculateRemainingPayments(loan.id);
          return { ...loan, remaining };
        })
      );
      setLoans(loansWithCalculations);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const loanData = {
      name: formData.name,
      total_amount: parseFloat(formData.total_amount),
      remaining_amount: parseFloat(formData.total_amount), // Inicialmente el monto total
      monthly_payment: parseFloat(formData.monthly_payment),
      interest_rate: parseFloat(formData.interest_rate),
      start_date: formData.start_date,
      end_date: formData.end_date,
      user_id: user.id
    };

    let error;
    if (editingLoan) {
      ({ error } = await updateLoan(editingLoan.id, loanData));
    } else {
      ({ error } = await addLoan(loanData));
    }

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }

    setFormData({
      name: '',
      total_amount: '',
      monthly_payment: '',
      interest_rate: '',
      start_date: '',
      end_date: ''
    });
    setShowForm(false);
    setEditingLoan(null);
    fetchLoans();
  }

  async function handleDelete(id: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este préstamo?')) {
      const { error } = await deleteLoan(id);
      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }
      fetchLoans();
    }
  }

  function startEdit(loan: any) {
    setEditingLoan(loan);
    setFormData({
      name: loan.name,
      total_amount: loan.total_amount.toString(),
      monthly_payment: loan.monthly_payment.toString(),
      interest_rate: loan.interest_rate.toString(),
      start_date: loan.start_date,
      end_date: loan.end_date
    });
    setShowForm(true);
  }

  if (loading) {
    return (
      <Layout title="Préstamos">
        <div className="text-center text-gray-500">Cargando préstamos...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Préstamos">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Préstamos</h2>
              <p className="text-gray-600">Controla tus préstamos y cuánto falta por pagar</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              ➕ Nuevo Préstamo
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Préstamos</h3>
            <p className="text-3xl font-bold text-blue-600">{loans.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pagos Mensuales</h3>
            <p className="text-3xl font-bold text-orange-600">
              €{loans.reduce((sum, loan) => sum + loan.monthly_payment, 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Por Pagar Total</h3>
            <p className="text-3xl font-bold text-red-600">
              €{loans.reduce((sum, loan) => sum + (loan.remaining?.remainingAmount || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Lista de préstamos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Tus Préstamos</h3>
          </div>
          {loans.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No tienes préstamos registrados. ¡Agrega tu primer préstamo!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {loans.map(loan => (
                <div key={loan.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{loan.name}</h4>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Pago mensual:</span>
                          <p className="font-semibold">€{loan.monthly_payment}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Meses restantes:</span>
                          <p className="font-semibold">{loan.remaining?.remainingMonths || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Falta por pagar:</span>
                          <p className="font-semibold text-red-600">€{loan.remaining?.remainingAmount?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Fecha fin:</span>
                          <p className="font-semibold">{new Date(loan.end_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => startEdit(loan)}
                        className="btn-secondary text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(loan.id)}
                        className="btn-danger text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulario modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingLoan ? 'Editar Préstamo' : 'Nuevo Préstamo'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingLoan(null);
                    setFormData({
                      name: '',
                      total_amount: '',
                      monthly_payment: '',
                      interest_rate: '',
                      start_date: '',
                      end_date: ''
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nombre del préstamo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Monto total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Pago mensual</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthly_payment}
                    onChange={(e) => setFormData({...formData, monthly_payment: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Tasa de interés (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({...formData, interest_rate: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Fecha de inicio</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Fecha de fin</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {editingLoan ? 'Actualizar' : 'Crear'} Préstamo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingLoan(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
