-- Script SQL para crear la tabla de aportaciones de préstamos
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_type VARCHAR(10) NOT NULL CHECK (payment_type IN ('regular', 'extra')),
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_user_id ON loan_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON loan_payments(payment_date);

-- Habilitar RLS (Row Level Security)
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
CREATE POLICY "Users can view their own loan payments" ON loan_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loan payments" ON loan_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loan payments" ON loan_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loan payments" ON loan_payments
  FOR DELETE USING (auth.uid() = user_id);

-- Comentarios para documentación
COMMENT ON TABLE loan_payments IS 'Tabla para registrar aportaciones regulares y extra a préstamos';
COMMENT ON COLUMN loan_payments.payment_type IS 'Tipo de pago: regular (cuotas normales) o extra (aportaciones adicionales)';
COMMENT ON COLUMN loan_payments.amount IS 'Monto del pago en euros';
COMMENT ON COLUMN loan_payments.description IS 'Descripción opcional del pago';
