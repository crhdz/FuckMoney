import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase, getLoans, addLoan, updateLoan, deleteLoan, calculateLoanInfo, getLoanPayments, addLoanPayment, updateLoanPayment, deleteLoanPayment } from '../lib/supabase'
import { formatEuro, formatEuroNoDecimals } from '../lib/formatters'

export default function Loans() {
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLoan, setEditingLoan] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null)
  const [showPaymentsList, setShowPaymentsList] = useState<string | null>(null)
  const [loanPayments, setLoanPayments] = useState<any[]>([])
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDescription, setPaymentDescription] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    total_amount: '',
    monthly_payment: '',
    start_date: '',
    end_date: ''
  })

  // Función para calcular la fecha de fin automáticamente
  function calculateEndDate(totalAmount: string, monthlyPayment: string, startDate: string) {
    if (!totalAmount || !monthlyPayment || !startDate) return '';
    
    const total = parseFloat(totalAmount);
    const monthly = parseFloat(monthlyPayment);
    
    if (total <= 0 || monthly <= 0) return '';
    
    const months = Math.ceil(total / monthly);
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    
    return end.toISOString().split('T')[0];
  }

  // Actualizar fecha de fin automáticamente cuando cambien los valores
  function handleFormDataChange(field: string, value: string) {
    const newFormData = { ...formData, [field]: value };
    
    if (field === 'total_amount' || field === 'monthly_payment' || field === 'start_date') {
      const calculatedEndDate = calculateEndDate(
        newFormData.total_amount,
        newFormData.monthly_payment,
        newFormData.start_date
      );
      if (calculatedEndDate) {
        newFormData.end_date = calculatedEndDate;
      }
    }
    
    setFormData(newFormData);
  }

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
          const loanInfo = await calculateLoanInfo(loan.id);
          return { ...loan, loanInfo };
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
      monthly_payment: parseFloat(formData.monthly_payment),
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
    const newFormData = {
      name: loan.name,
      total_amount: loan.total_amount.toString(),
      monthly_payment: loan.monthly_payment.toString(),
      start_date: loan.start_date,
      end_date: loan.end_date
    };
    setFormData(newFormData);
    setShowForm(true);
  }

  async function handleExtraPayment(loanId: string) {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Por favor, ingresa un monto válido');
      return;
    }

    const paymentData = {
      loan_id: loanId,
      amount: parseFloat(paymentAmount),
      payment_date: new Date().toISOString().split('T')[0],
      payment_type: 'extra' as const,
      description: paymentDescription || 'Aportación extra',
      user_id: user?.id
    };

    let error;
    if (editingPayment) {
      // Actualizar aportación existente
      const updateData = {
        amount: parseFloat(paymentAmount),
        description: paymentDescription || 'Aportación extra'
      };
      ({ error } = await updateLoanPayment(editingPayment.id, updateData));
    } else {
      // Crear nueva aportación
      ({ error } = await addLoanPayment(paymentData));
    }

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }

    setPaymentAmount('');
    setPaymentDescription('');
    setEditingPayment(null);
    setShowPaymentForm(null);
    fetchLoans(); // Recargar para actualizar los cálculos
    if (showPaymentsList) {
      fetchLoanPayments(showPaymentsList); // Actualizar lista de aportaciones
    }
  }

  async function fetchLoanPayments(loanId: string) {
    const { data, error } = await getLoanPayments(loanId);
    if (error) {
      console.error('Error fetching payments:', error);
      return;
    }
    setLoanPayments(data || []);
  }

  async function handleDeletePayment(paymentId: string, loanId: string) {
    if (confirm('¿Estás seguro de que quieres eliminar esta aportación?')) {
      const { error } = await deleteLoanPayment(paymentId);
      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }
      fetchLoans(); // Recargar para actualizar los cálculos
      fetchLoanPayments(loanId); // Actualizar lista de aportaciones
    }
  }

  function startEditPayment(payment: any) {
    setEditingPayment(payment);
    setPaymentAmount(payment.amount.toString());
    setPaymentDescription(payment.description || '');
    setShowPaymentForm(payment.loan_id);
  }

  function togglePaymentsList(loanId: string) {
    if (showPaymentsList === loanId) {
      setShowPaymentsList(null);
      setLoanPayments([]);
    } else {
      setShowPaymentsList(loanId);
      fetchLoanPayments(loanId);
    }
  }

  function cancelPayment() {
    setPaymentAmount('');
    setPaymentDescription('');
    setEditingPayment(null);
    setShowPaymentForm(null);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Préstamos</h3>
            <p className="text-3xl font-bold text-blue-600">{loans.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pagos Mensuales</h3>
            <p className="text-3xl font-bold text-orange-600">
              {formatEuro(loans.reduce((sum, loan) => sum + loan.monthly_payment, 0))}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Por Pagar Total</h3>
            <p className="text-3xl font-bold text-red-600">
              {formatEuro(loans.reduce((sum, loan) => sum + (loan.loanInfo?.remainingAmount || 0), 0))}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Progreso Promedio</h3>
            {(() => {
              const totalProgress = loans.reduce((sum, loan) => {
                const totalMonths = loan.loanInfo?.totalMonths || 1;
                const elapsedMonths = loan.loanInfo?.elapsedMonths || 0;
                return sum + Math.min(100, Math.max(0, (elapsedMonths / totalMonths) * 100));
              }, 0);
              const averageProgress = loans.length > 0 ? totalProgress / loans.length : 0;
              
              return (
                <div>
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    {averageProgress.toFixed(1)}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${averageProgress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })()}
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
              {loans.map(loan => {
                // Calcular porcentaje completado basado en monto pagado vs monto total
                const totalAmount = loan.total_amount || 1;
                const totalPaid = loan.loanInfo?.totalPaid || 0;
                const completedPercentage = Math.min(100, Math.max(0, (totalPaid / totalAmount) * 100));
                
                return (
                <div key={loan.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">{loan.name}</h4>
                        <span className="text-sm font-medium text-gray-600">
                          {completedPercentage.toFixed(1)}% completado
                        </span>
                      </div>
                      
                      {/* Barra de progreso */}
                      <div className="mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${completedPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Pago mensual:</span>
                          <p className="font-semibold">{formatEuro(loan.monthly_payment)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Meses restantes:</span>
                          <p className="font-semibold">{loan.loanInfo?.remainingMonths || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Falta por pagar:</span>
                          <p className="font-semibold text-red-600">{formatEuro(loan.loanInfo?.remainingAmount || 0)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Aportaciones extra:</span>
                          <p className="font-semibold text-green-600">{formatEuro(loan.loanInfo?.totalExtraPayments || 0)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Fecha fin:</span>
                          <p className="font-semibold">{new Date(loan.end_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setShowPaymentForm(loan.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          {editingPayment && showPaymentForm === loan.id ? 'Editar' : 'Aportación'}
                        </button>
                        <button
                          onClick={() => togglePaymentsList(loan.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          {showPaymentsList === loan.id ? 'Ocultar' : 'Ver Aportaciones'}
                        </button>
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
                      
                      {/* Formulario de aportación */}
                      {showPaymentForm === loan.id && (
                        <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">
                            {editingPayment ? 'Editar Aportación' : 'Hacer Aportación Extra'}
                          </h5>
                          <div className="space-y-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Monto de la aportación"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <input
                              type="text"
                              placeholder="Descripción (opcional)"
                              value={paymentDescription}
                              onChange={(e) => setPaymentDescription(e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleExtraPayment(loan.id)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={cancelPayment}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Lista de aportaciones */}
                      {showPaymentsList === loan.id && (
                        <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Historial de Aportaciones</h5>
                          {loanPayments.length === 0 ? (
                            <p className="text-sm text-gray-500">No hay aportaciones registradas</p>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {loanPayments.map(payment => (
                                <div key={payment.id} className="flex justify-between items-center p-2 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="flex justify-between">
                                      <span className="text-sm font-medium">{formatEuro(payment.amount)}</span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(payment.payment_date).toLocaleDateString()}
                                      </span>
                                    </div>
                                    {payment.description && (
                                      <p className="text-xs text-gray-600 mt-1">{payment.description}</p>
                                    )}
                                  </div>
                                  <div className="flex space-x-1 ml-2">
                                    <button
                                      onClick={() => startEditPayment(payment)}
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeletePayment(payment.id, loan.id)}
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )
              })}
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
                    onChange={(e) => handleFormDataChange('name', e.target.value)}
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
                    onChange={(e) => handleFormDataChange('total_amount', e.target.value)}
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
                    onChange={(e) => handleFormDataChange('monthly_payment', e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Fecha de inicio</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleFormDataChange('start_date', e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Fecha de fin (calculada automáticamente)</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleFormDataChange('end_date', e.target.value)}
                    className="input w-full bg-gray-100"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se calcula automáticamente basándose en el monto total y pago mensual
                  </p>
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
