-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('owner', 'store_manager');

-- Stores table
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'store_manager',
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    pin TEXT UNIQUE, -- 6-digit PIN for quick login
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Raw Materials table
CREATE TABLE raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL, -- e.g., 'kg', 'liters', 'pieces'
    material_kind TEXT DEFAULT 'general', -- 'flex_roll', 'pipe', 'ink', etc.
    roll_width_ft DECIMAL(10,2), -- fixed roll width for flex rolls
    low_stock_threshold DECIMAL(10,3) DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Finished Products table
CREATE TABLE finished_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store-specific product pricing overrides.
-- If no override exists for a store, finished_products.selling_price is used.
CREATE TABLE store_product_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    finished_product_id UUID REFERENCES finished_products(id) ON DELETE CASCADE,
    selling_price DECIMAL(10,2) NOT NULL,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, finished_product_id)
);

-- Bill of Materials table
CREATE TABLE product_bom (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES finished_products(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, raw_material_id)
);

-- Central Stock table
CREATE TABLE central_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    finished_product_id UUID REFERENCES finished_products(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_single_item_type CHECK (
        (raw_material_id IS NOT NULL AND finished_product_id IS NULL) OR
        (raw_material_id IS NULL AND finished_product_id IS NOT NULL)
    )
);

-- Store Stock table
CREATE TABLE store_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    finished_product_id UUID REFERENCES finished_products(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_single_item_type CHECK (
        (raw_material_id IS NOT NULL AND finished_product_id IS NULL) OR
        (raw_material_id IS NULL AND finished_product_id IS NOT NULL)
    ),
    UNIQUE(store_id, raw_material_id),
    UNIQUE(store_id, finished_product_id)
);

-- Stock Transfers table
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    to_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    finished_product_id UUID REFERENCES finished_products(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_single_item_type CHECK (
        (raw_material_id IS NOT NULL AND finished_product_id IS NULL) OR
        (raw_material_id IS NULL AND finished_product_id IS NOT NULL)
    ),
    CONSTRAINT check_transfer_direction CHECK (
        (from_store_id IS NOT NULL AND to_store_id IS NOT NULL) OR
        (from_store_id IS NULL AND to_store_id IS NOT NULL) -- Central to store
    )
);

-- Vendors table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases table
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    purchase_date DATE NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Payments table
CREATE TABLE vendor_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT, -- 'cash', 'bank_transfer', 'check', etc.
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_phone TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    gross_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT, -- 'cash', 'card', 'upi', etc.
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sale Items table
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    finished_product_id UUID REFERENCES finished_products(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    width_ft DECIMAL(10,2),
    height_ft DECIMAL(10,2),
    charged_area_sqft DECIMAL(10,2),
    wastage_sqft DECIMAL(10,2) DEFAULT 9,
    pipe_length_ft DECIMAL(10,2),
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- 'STOCK_ADJUST', 'SALE', 'PURCHASE', 'TRANSFER', 'PAYMENT', 'LOGIN'
    description TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    reference_id UUID, -- Reference to the affected record
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material Batches
CREATE TABLE material_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    roll_width_ft DECIMAL(10,2) NOT NULL,
    roll_length_ft DECIMAL(10,2) NOT NULL DEFAULT 100,
    actual_area_sqft DECIMAL(10,2) NOT NULL,
    usable_area_sqft DECIMAL(10,2) NOT NULL,
    remaining_usable_area_sqft DECIMAL(10,2) NOT NULL,
    cost_per_sqft DECIMAL(10,2) NOT NULL,
    is_depleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Ledger
CREATE TABLE vendor_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consumption Templates
CREATE TABLE consumption_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    flex_count INTEGER NOT NULL,
    flex_width_ft DECIMAL(10,2) NOT NULL,
    flex_height_ft DECIMAL(10,2) NOT NULL,
    total_area_sqft DECIMAL(10,2) NOT NULL,
    per_flex_consumption_sqft DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- System Configuration
CREATE TABLE system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sale Item Consumptions
CREATE TABLE sale_item_consumptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_item_id UUID REFERENCES sale_items(id) ON DELETE CASCADE,
    material_batch_id UUID REFERENCES material_batches(id) ON DELETE CASCADE,
    area_deducted_sqft DECIMAL(10,2) NOT NULL,
    wastage_generated_sqft DECIMAL(10,2) NOT NULL,
    wastage_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Owners can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Store managers can view users from their store" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'store_manager' AND store_id = users.store_id
        )
    );

-- Stores table policies
CREATE POLICY "Owners can view all stores" ON stores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Store managers can view their own store" ON stores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'store_manager' AND store_id = stores.id
        )
    );

-- Store stock policies
CREATE POLICY "Owners can view all store stock" ON store_stock
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Store managers can view their store stock" ON store_stock
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'store_manager' AND store_id = store_stock.store_id
        )
    );

-- Store product price policies
CREATE POLICY "Owners can manage all store prices" ON store_product_prices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Store managers can manage prices for their store" ON store_product_prices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'store_manager' AND store_id = store_product_prices.store_id
        )
    );

-- Sales policies
CREATE POLICY "Owners can view all sales" ON sales
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Store managers can view their store sales" ON sales
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'store_manager' AND store_id = sales.store_id
        )
    );

-- Similar policies for other tables (stock_transfers, purchases, etc.)
-- For brevity, I'm showing the pattern - you'd create similar policies for all tables

-- Functions to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_raw_materials_updated_at BEFORE UPDATE ON raw_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_finished_products_updated_at BEFORE UPDATE ON finished_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_product_prices_updated_at BEFORE UPDATE ON store_product_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON stock_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle user creation after auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'store_manager')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workforce Management Tables

-- Permanent Staff
CREATE TABLE public.permanent_staff (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  basic_salary numeric NOT NULL DEFAULT 0,
  joined_at date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT permanent_staff_pkey PRIMARY KEY (id)
);

-- Temporary Workers
CREATE TABLE public.temp_workers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  skill text,
  daily_rate numeric NOT NULL DEFAULT 0,
  joined_at date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT temp_workers_pkey PRIMARY KEY (id)
);

-- Attendance
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  worker_id uuid NOT NULL,
  worker_type text NOT NULL CHECK (worker_type IN ('permanent', 'temporary')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
  overtime_hours numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  UNIQUE(worker_id, worker_type, date)
);

-- Salary Records (Permanent Staff)
CREATE TABLE public.salary_records (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES public.permanent_staff(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  basic numeric NOT NULL,
  overtime_amount numeric DEFAULT 0,
  bonus numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  advance_deducted numeric DEFAULT 0,
  net_payable numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT salary_records_pkey PRIMARY KEY (id),
  UNIQUE(staff_id, month, year)
);

-- Worker Ledger
CREATE TABLE public.worker_ledger (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  worker_id uuid NOT NULL,
  worker_type text NOT NULL CHECK (worker_type IN ('permanent', 'temporary')),
  transaction_type text NOT NULL CHECK (transaction_type IN ('advance_given', 'wage_earned', 'payment_made', 'advance_recovered')),
  amount numeric NOT NULL,
  balance numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT worker_ledger_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.permanent_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Permanent Staff
CREATE POLICY "Owners can view all permanent staff" ON public.permanent_staff
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "Managers can view their store staff" ON public.permanent_staff
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'store_manager' AND store_id = permanent_staff.store_id));

-- Temp Workers
CREATE POLICY "Owners can view all temp workers" ON public.temp_workers
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "Managers can view their store temp workers" ON public.temp_workers
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'store_manager' AND store_id = temp_workers.store_id));

-- Attendance
CREATE POLICY "Owners can view all attendance" ON public.attendance
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "Managers can view attendance for their store workers" ON public.attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM permanent_staff ps JOIN users u ON u.store_id = ps.store_id 
            WHERE u.id = auth.uid() AND u.role = 'store_manager' AND ps.id = attendance.worker_id AND attendance.worker_type = 'permanent'
        ) OR EXISTS (
            SELECT 1 FROM temp_workers tw JOIN users u ON u.store_id = tw.store_id 
            WHERE u.id = auth.uid() AND u.role = 'store_manager' AND tw.id = attendance.worker_id AND attendance.worker_type = 'temporary'
        )
    );

-- Salary Records
CREATE POLICY "Owners can view all salary records" ON public.salary_records
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "Managers can view salary for their store staff" ON public.salary_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM permanent_staff ps JOIN users u ON u.store_id = ps.store_id 
            WHERE u.id = auth.uid() AND u.role = 'store_manager' AND ps.id = salary_records.staff_id
        )
    );

-- Worker Ledger
CREATE POLICY "Owners can view all ledger entries" ON public.worker_ledger
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "Managers can view ledger for their store workers" ON public.worker_ledger
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM permanent_staff ps JOIN users u ON u.store_id = ps.store_id 
            WHERE u.id = auth.uid() AND u.role = 'store_manager' AND ps.id = worker_ledger.worker_id AND worker_ledger.worker_type = 'permanent'
        ) OR EXISTS (
            SELECT 1 FROM temp_workers tw JOIN users u ON u.store_id = tw.store_id 
            WHERE u.id = auth.uid() AND u.role = 'store_manager' AND tw.id = worker_ledger.worker_id AND worker_ledger.worker_type = 'temporary'
        )
    );

-- Triggers for updated_at
CREATE TRIGGER update_permanent_staff_updated_at BEFORE UPDATE ON permanent_staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_temp_workers_updated_at BEFORE UPDATE ON temp_workers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salary_records_updated_at BEFORE UPDATE ON salary_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- WORKFORCE MANAGEMENT TABLES
-- ==========================================

-- Permanent Staff Table
CREATE TABLE permanent_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    basic_salary NUMERIC NOT NULL,
    joined_at DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Temporary Workers Table
CREATE TABLE temp_workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    skill TEXT,
    daily_rate NUMERIC NOT NULL,
    joined_at DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL,
    worker_type TEXT NOT NULL CHECK (worker_type IN ('permanent', 'temporary')),
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
    overtime_hours NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(worker_id, worker_type, date)
);

-- Salary Records Table
CREATE TABLE salary_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES permanent_staff(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    basic NUMERIC NOT NULL,
    overtime_amount NUMERIC DEFAULT 0,
    bonus NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    advance_deducted NUMERIC DEFAULT 0,
    net_payable NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, month, year)
);

-- Worker Ledger Table
CREATE TABLE worker_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL,
    worker_type TEXT NOT NULL CHECK (worker_type IN ('permanent', 'temporary')),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('advance_given', 'wage_earned', 'payment_made', 'advance_recovered')),
    amount NUMERIC NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
