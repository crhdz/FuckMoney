import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatEuro, formatEuroNoDecimals } from '../lib/formatters';

export default function RecentExpenses({ user }: { user: any }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchExpenses = async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (!error && data) setExpenses(data);
      setLoading(false);
    };
    fetchExpenses();
  }, [user]);

  if (loading) return <div className="bg-white rounded-lg shadow p-6">Cargando gastos...</div>;
  if (!expenses.length) return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Gastos Recientes</h3>
      <div className="text-center py-8 text-gray-500">
        <p>No hay gastos registrados aún.</p>
        <p className="text-sm mt-2">Comienza añadiendo tu primer gasto recurrente.</p>
      </div>
    </div>
  );
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Gastos Recientes</h3>
      <ul className="divide-y divide-gray-200">
        {expenses.map(exp => (
          <li key={exp.id} className="py-4 flex justify-between items-center">
            <div>
              <span className="font-medium text-gray-900">{exp.name}</span>
              <span className="ml-2 text-gray-500">({exp.frequency})</span>
            </div>
            <span className="font-bold text-blue-600">{formatEuro(exp.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
