-- Corporate Clients Migration
-- Parent Clients (e.g. SBI Bank)
CREATE TABLE public.corporate_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Branches under Parent Clients
CREATE TABLE public.corporate_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.corporate_clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Corporate Orders (for tracking what was ordered)
CREATE TABLE public.corporate_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES public.corporate_branches(id) ON DELETE CASCADE,
    invoice_number TEXT,
    description TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    order_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Corporate Ledger (for tracking balance and payments)
CREATE TABLE public.corporate_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES public.corporate_branches(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('order', 'payment', 'advance')),
    amount NUMERIC NOT NULL,
    balance NUMERIC NOT NULL,
    reference_id UUID, -- could point to an order or be null
    invoice_number TEXT,
    notes TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for updated_at
CREATE TRIGGER update_corporate_clients_updated_at BEFORE UPDATE ON corporate_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_corporate_branches_updated_at BEFORE UPDATE ON corporate_branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_corporate_orders_updated_at BEFORE UPDATE ON corporate_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatically create a 'Main Branch' when a new corporate client group is created.
-- This ensures standalone brands with no sub-branches can immediately record transactions.
CREATE OR REPLACE FUNCTION public.handle_create_default_branch()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.corporate_branches (client_id, name)
    VALUES (NEW.id, 'Main Branch');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_branch
AFTER INSERT ON public.corporate_clients
FOR EACH ROW
EXECUTE FUNCTION public.handle_create_default_branch();

-- Disable RLS (Align with the rest of the application to support quick PIN-based logins)
ALTER TABLE public.corporate_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_ledger DISABLE ROW LEVEL SECURITY;

-- Owner Policies (Only owners should access this feature for now)
DROP POLICY IF EXISTS "Owners can view corporate clients" ON public.corporate_clients;
DROP POLICY IF EXISTS "Owners can view corporate branches" ON public.corporate_branches;
DROP POLICY IF EXISTS "Owners can view corporate orders" ON public.corporate_orders;
DROP POLICY IF EXISTS "Owners can view corporate ledger" ON public.corporate_ledger;

CREATE POLICY "Owners can manage corporate clients" ON public.corporate_clients
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "Owners can manage corporate branches" ON public.corporate_branches
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "Owners can manage corporate orders" ON public.corporate_orders
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "Owners can manage corporate ledger" ON public.corporate_ledger
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'));
