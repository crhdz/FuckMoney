-- Script completo para recrear el esquema de Supabase
-- Borrar todas las tablas existentes y recrearlas

-- Eliminar tablas existentes (en orden de dependencias)
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- Recrear tabla de categorías
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    icon TEXT NOT NULL DEFAULT '📁',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recrear tabla de préstamos
CREATE TABLE public.loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    remaining_amount DECIMAL(10,2) NOT NULL,
    monthly_payment DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recrear tabla de gastos
CREATE TABLE public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    category TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_recurring BOOLEAN DEFAULT true,
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_loans_user_id ON public.loans(user_id);
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_loan_id ON public.expenses(loan_id);
CREATE INDEX idx_expenses_created_at ON public.expenses(created_at);

-- Configurar Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para categories
CREATE POLICY "Users can view their own categories" ON public.categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON public.categories
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own categories" ON public.categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON public.categories
    FOR DELETE USING (auth.uid() = user_id);

-- Política adicional para permitir inserción con user_id automático
CREATE POLICY "Allow authenticated users to insert categories" ON public.categories
    FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas RLS para loans
CREATE POLICY "Users can view their own loans" ON public.loans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loans" ON public.loans
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own loans" ON public.loans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loans" ON public.loans
    FOR DELETE USING (auth.uid() = user_id);

-- Política adicional para permitir inserción con user_id automático
CREATE POLICY "Allow authenticated users to insert loans" ON public.loans
    FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas RLS para expenses
CREATE POLICY "Users can view their own expenses" ON public.expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses" ON public.expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own expenses" ON public.expenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON public.expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Política adicional para permitir inserción con user_id automático
CREATE POLICY "Allow authenticated users to insert expenses" ON public.expenses
    FOR INSERT TO authenticated WITH CHECK (true);

-- Crear triggers para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para asignar user_id automáticamente
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para user_id automático
CREATE TRIGGER set_categories_user_id BEFORE INSERT ON public.categories
    FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_loans_user_id BEFORE INSERT ON public.loans
    FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_expenses_user_id BEFORE INSERT ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- Insertar categorías por defecto (opcional)
-- Las categorías se crearán dinámicamente desde la aplicación

-- Comentarios para documentación
COMMENT ON TABLE public.categories IS 'Categorías de gastos definidas por el usuario';
COMMENT ON TABLE public.loans IS 'Préstamos del usuario con cálculos automáticos';
COMMENT ON TABLE public.expenses IS 'Gastos recurrentes y únicos del usuario';
COMMENT ON COLUMN public.expenses.loan_id IS 'Referencia opcional a un préstamo';
COMMENT ON COLUMN public.loans.remaining_amount IS 'Cantidad restante por pagar del préstamo';
