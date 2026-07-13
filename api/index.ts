import express from 'express';
import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { 
  userSchema, 
  rawMaterialSchema, 
  purchaseSchema, 
  posSaleSchema, 
  vendorSchema, 
  storeSchema, 
  productSchema,
  permanentStaffSchema,
  tempWorkerSchema,
  attendanceSchema,
  salaryRecordSchema,
  workerLedgerSchema,
  otherExpenseSchema
} from './schemas.js';

const app = express();
const isDev = process.env.NODE_ENV !== 'production';
if (!isDev) {
  app.use(helmet());
}
app.use(compression());
app.use(express.json());

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Fallback client using anon key (for dev/demo mode when service role key is not set)
const supabaseAnon = (supabaseUrl && supabaseAnonKey && !supabaseAdmin)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Returns the best available Supabase client (admin > anon > null)
const db = supabaseAdmin || supabaseAnon;

// Middleware: Authenticate Supabase JWT (with mock/demo fallback)
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  // Check for mock/demo authentication token
  const mockProfileHeader = req.headers['x-mock-profile'];
  if (mockProfileHeader) {
    try {
      const mockProfile = JSON.parse(mockProfileHeader);
      if (mockProfile && mockProfile.id && mockProfile.role) {
        req.user = { id: mockProfile.id, email: mockProfile.email, profile: mockProfile };
        return next();
      }
    } catch (e) {
      // Invalid mock profile header, fall through to normal auth
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];

  // If token is 'undefined' or empty, reject
  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // If supabaseAdmin is not available, we can't verify JWT
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not initialized. Please set SUPABASE_SERVICE_ROLE_KEY.' });
  }
  
  try {
    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Fetch user profile for role/store info
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return res.status(403).json({ error: 'Forbidden: Profile not found' });
    }

    req.user = { ...user, profile };
    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Auth internal error' });
  }
};

// Middleware: Require specific roles
const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.profile.role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }
  next();
};

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Validation Middleware (Zod v4 compatible)
const validate = (schema: any) => (req: any, res: any, next: any) => {
  try {
    // Save parsed/transformed result back to req.body
    req.body = schema.parse(req.body);
    next();
  } catch (error: any) {
    // Zod v4 uses .issues, Zod v3 uses .errors
    const validationErrors = error.issues || error.errors || [{ message: 'Validation failed' }];
    res.status(400).json({ error: validationErrors });
  }
};

async function getSystemConfig(key: string, defaultValue: any) {
  if (!db) return defaultValue;
  try {
    const { data, error } = await db
      .from('system_configs')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    
    if (error || !data) return defaultValue;
    return data.value;
  } catch (e) {
    return defaultValue;
  }
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', supabase: !!db });
});

// --- Auth Routes (Public/Limited) ---

// Verify PIN
app.post('/api/auth/verify-pin', authLimiter, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { pin, storeId } = req.body;
  try {
    // Check main users table first
    const { data: user, error: userError } = await db
      .from('users')
      .select('*')
      .eq('pin', pin)
      .maybeSingle();

    if (user) {
      if (storeId && user.role === 'store_manager' && user.store_id !== storeId) {
        return res.status(403).json({ error: 'PIN not valid for this store' });
      }
      return res.json({ user });
    }

    // Check permanent_staff
    const { data: permStaff, error: permError } = await db
      .from('permanent_staff')
      .select('*, stores(name)')
      .eq('pin', pin)
      .eq('is_active', true)
      .maybeSingle();

    if (permStaff) {
      const permProfile = {
        id: permStaff.id,
        name: permStaff.name,
        role: 'permanent_staff',
        store_id: permStaff.store_id,
        store_name: permStaff.stores?.name
      };
      return res.json({ user: permProfile });
    }

    // If not found, check temp_workers
    const { data: tempWorker, error: tempError } = await db
      .from('temp_workers')
      .select('*, stores(name)')
      .eq('pin', pin)
      .eq('is_active', true)
      .maybeSingle();

    if (tempWorker) {
      // Create a mock profile for the temp worker
      const tempProfile = {
        id: tempWorker.id,
        name: tempWorker.name,
        role: 'temp_worker',
        store_id: tempWorker.store_id,
        store_name: tempWorker.stores?.name
      };
      return res.json({ user: tempProfile });
    }

    // If not found in temp_workers, check stores table for store PINs
    const { data: storeMatch, error: storeError } = await db
      .from('stores')
      .select('*')
      .eq('pin', pin)
      .maybeSingle();

    if (storeMatch) {
      const storeProfile = {
        id: `store_${storeMatch.id}`,
        name: `${storeMatch.name} Manager`,
        role: 'store_manager',
        store_id: storeMatch.id,
        store_name: storeMatch.name
      };
      return res.json({ user: storeProfile });
    }

    return res.status(401).json({ error: 'Invalid PIN' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Protected Routes ---
app.use('/api/', authenticate);
app.use('/api/', apiLimiter);

// Create/Register User (Owner only) — requires supabaseAdmin for auth.admin.createUser
app.post('/api/users', requireRole(['owner']), validate(userSchema), async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database not initialized. Service role key required for user management.' });
  const { email, password, name, role, store_id, pin } = req.body;
  try {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUser.user.id,
        email,
        name,
        role,
        store_id,
        pin
      })
      .select()
      .single();

    if (profileError) throw profileError;

    res.json({ user: profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Users & Workers with PINs (Owner only) - Unified PIN directory
app.get('/api/inventory/users', requireRole(['owner']), async (req: any, res: any) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const [usersResult, tempResult, permResult, storesResult] = await Promise.all([
      db.from('users').select('id, name, email, role, pin, store_id').order('name'),
      db.from('temp_workers').select('id, name, pin, store_id, skill').order('name'),
      db.from('permanent_staff').select('id, name, role, store_id').order('name'),
      db.from('stores').select('id, name')
    ]);

    const storeMap = new Map<string, string>((storesResult.data || []).map((s: any) => [s.id, s.name]));

    const systemUsers = (usersResult.data || []).map((u: any) => ({
      id: u.id, name: u.name, email: u.email || '', role: u.role || 'staff',
      pin: u.pin || '', store_id: u.store_id || null,
      store_name: u.store_id ? storeMap.get(u.store_id) || '' : '', source: 'system'
    }));

    const tempUsers = (tempResult.data || []).map((w: any) => ({
      id: w.id, name: w.name, email: '', role: 'temp_worker',
      pin: w.pin || '', store_id: w.store_id || null,
      store_name: w.store_id ? storeMap.get(w.store_id) || '' : '', source: 'temp_worker'
    }));

    const permUsers = (permResult.data || []).map((w: any) => ({
      id: w.id, name: w.name, email: '', role: 'permanent_staff',
      pin: '', store_id: w.store_id || null,
      store_name: w.store_id ? storeMap.get(w.store_id) || '' : '', source: 'permanent_staff'
    }));

    res.json([...systemUsers, ...tempUsers, ...permUsers]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Update User (Owner only)
app.put('/api/users/:id', requireRole(['owner']), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data, error } = await db.from('users').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete User (Owner only)
app.delete('/api/users/:id', requireRole(['owner']), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { error } = await db.from('users').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Reset User PIN (Owner only)
app.post('/api/auth/reset-pin', requireRole(['owner']), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { targetUserId, newPin } = req.body;
  try {
    const { error } = await db.from('users').update({ pin: newPin }).eq('id', targetUserId);
    if (error) throw error;

    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Raw Materials
app.get('/api/inventory/raw-materials', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    // Fetch materials and stock separately since we relaxed FK constraints
    const [materialsRes, centralStockRes, storeStockRes] = await Promise.all([
      db.from('raw_materials').select('*').order('name'),
      db.from('central_stock').select('*'),
      db.from('store_stock').select('*')
    ]);

    if (materialsRes.error) throw materialsRes.error;
    
    // Manually join the data
    const combinedData = (materialsRes.data || []).map(material => ({
      ...material,
      central_stock: (centralStockRes.data || [])
        .filter(s => String(s.raw_material_id) === String(material.id))
        .map(s => ({ quantity: Number(s.quantity) })),
      store_stock: (storeStockRes.data || [])
        .filter(s => String(s.raw_material_id) === String(material.id))
        .map(s => ({ store_id: s.store_id, quantity: Number(s.quantity) }))
    }));

    res.json(combinedData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Finished Products
app.get('/api/inventory/products', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data, error } = await db.from('finished_products').select('*').order('name');
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Vendors with balances
app.get('/api/inventory/vendors', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data: vendors, error } = await db.from('vendors').select('*').order('name');
    if (error) throw error;

    // Calculate balances directly from purchases and payments
    const [purchasesRes, paymentsRes] = await Promise.all([
      db.from('purchases').select('vendor_id, total_amount'),
      db.from('vendor_payments').select('vendor_id, amount')
    ]);

    if (purchasesRes.error) throw purchasesRes.error;
    if (paymentsRes.error) throw paymentsRes.error;

    const purchaseMap: Record<string, number> = {};
    (purchasesRes.data || []).forEach((p: any) => {
      purchaseMap[p.vendor_id] = (purchaseMap[p.vendor_id] || 0) + Number(p.total_amount || 0);
    });

    const paymentMap: Record<string, number> = {};
    (paymentsRes.data || []).forEach((p: any) => {
      paymentMap[p.vendor_id] = (paymentMap[p.vendor_id] || 0) + Number(p.amount || 0);
    });

    const enrichedVendors = (vendors || []).map((v: any) => ({
      ...v,
      current_balance: (purchaseMap[v.id] || 0) - (paymentMap[v.id] || 0)
    }));

    res.json(enrichedVendors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Vendor Transactions (Purchases & Payments)
app.get('/api/inventory/vendors/:id/transactions', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const vendorId = req.params.id;
  try {
    const [purchasesRes, paymentsRes, materialsRes] = await Promise.all([
      db.from('purchases').select('*').eq('vendor_id', vendorId).order('purchase_date', { ascending: false }),
      db.from('vendor_payments').select('*').eq('vendor_id', vendorId).order('payment_date', { ascending: false }),
      db.from('raw_materials').select('id, name, unit')
    ]);

    if (purchasesRes.error) throw purchasesRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (materialsRes.error) throw materialsRes.error;

    const materialMap = new Map((materialsRes.data || []).map(m => [m.id, m]));

    const transactions = [
      ...(purchasesRes.data || []).map((p: any) => {
        const material = materialMap.get(p.raw_material_id);
        return {
          id: p.id,
          date: p.purchase_date,
          type: 'purchase',
          description: material ? `${material.name} (${Number(p.quantity).toLocaleString()} ${material.unit})` : `Stock Purchase Record`,
          debit: Number(p.total_amount),
          credit: 0,
          notes: p.notes
        };
      }),
      ...(paymentsRes.data || []).map((p: any) => ({
        id: p.id,
        date: p.payment_date,
        type: 'payment',
        description: `Financial Disbursement - ${p.payment_method?.toUpperCase() || 'MANUAL'}`,
        debit: 0,
        credit: Number(p.amount),
        notes: p.notes
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Stores
app.get('/api/inventory/stores', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data, error } = await db.from('stores').select('*').order('name');
    if (error) {
      console.error('[STORES GET] Supabase error:', JSON.stringify(error));
      throw error;
    }
    res.json(data);
  } catch (error: any) {
    console.error('[STORES GET] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Unified PIN Directory Data: Aggregates Owners and Temp Workers
app.get('/api/inventory/users', requireRole(['owner']), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    // 1. Get Owners and Managers from users table
    const { data: users, error: uError } = await db.from('users').select('*');
    if (uError) throw uError;

    // 2. Get Temp Workers
    const { data: tempWorkers, error: tError } = await db.from('temp_workers').select('*, stores(name)');
    if (tError) throw tError;

    // Aggregate
    const allUsers = [
      ...users.map(u => ({ ...u, type: 'user' })),
      ...tempWorkers.map(w => ({ 
        id: w.id, 
        name: w.name, 
        role: 'temp_worker', 
        pin: w.pin, 
        store_id: w.store_id, 
        store_name: w.stores?.name,
        type: 'temp_worker' 
      }))
    ];

    res.json(allUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', requireRole(['owner']), async (req: any, res: any) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data, error } = await db.from('users').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Get All Batches
app.get('/api/inventory/batches', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data, error } = await db.from('material_batches').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Transactions (Sales & Purchases)
app.get('/api/transactions', authenticate, async (req: any, res: any) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { storeId: queryStoreId, startDate, endDate } = req.query;

  // Enforce store scoping for managers
  let storeId = queryStoreId;
  if (req.user?.profile?.role === 'store_manager') {
    storeId = req.user.profile.store_id;
  }

  try {
    // 1. Fetch Sales
    let salesQuery = db
      .from('sales')
      .select(`
        id, created_at, total_amount, customer_name, customer_phone, payment_method, store_id, created_by
      `)
      .order('created_at', { ascending: false });

    if (storeId && storeId !== 'all') {
      salesQuery = salesQuery.eq('store_id', storeId as string);
    }
    if (startDate) salesQuery = salesQuery.gte('created_at', startDate as string);
    if (endDate) {
      // Append time to end date to include the entire day
      const endDateTime = (endDate as string).includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
      salesQuery = salesQuery.lte('created_at', endDateTime);
    }

    // 2. Fetch Purchases
    let purchasesQuery = db
      .from('purchases')
      .select(`
        id, purchase_date, total_amount, quantity, raw_material_id, notes, vendor_id
      `)
      .order('purchase_date', { ascending: false });

    if (startDate) purchasesQuery = purchasesQuery.gte('purchase_date', startDate as string);
    if (endDate) purchasesQuery = purchasesQuery.lte('purchase_date', endDate as string);

    // 3. Fetch Worker Payouts (Advances and Settlements)
    let payoutsQuery = db
      .from('worker_ledger')
      .select(`
        id,
        date,
        amount,
        transaction_type,
        worker_id,
        worker_type,
        description
      `)
      .in('transaction_type', ['payment_made', 'advance_given'])
      .order('date', { ascending: false });

    if (startDate) payoutsQuery = payoutsQuery.gte('date', startDate as string);
    if (endDate) payoutsQuery = payoutsQuery.lte('date', endDate as string);

    const [sales, purchases, payouts, vendorsList, storesList, permStaff, tempWorkers] = await Promise.all([
      salesQuery,
      purchasesQuery,
      payoutsQuery,
      db.from('vendors').select('id, name'),
      db.from('stores').select('id, name'),
      db.from('permanent_staff').select('id, name'),
      db.from('temp_workers').select('id, name')
    ]);

    if (sales.error) throw sales.error;
    if (purchases.error) throw purchases.error;
    if (payouts.error) throw payouts.error;

    // Build lookup maps
    const vendorMap = new Map<string, string>((vendorsList.data || []).map((v: any) => [v.id, v.name] as [string, string]));
    const storeMap = new Map<string, string>((storesList.data || []).map((s: any) => [s.id, s.name] as [string, string]));
    const workerMap = new Map<string, string>([
      ...(permStaff.data || []).map((w: any) => [w.id, w.name] as [string, string]),
      ...(tempWorkers.data || []).map((w: any) => [w.id, w.name] as [string, string])
    ]);

    const normalizedSales = (sales.data || []).map((s: any) => {
      const storeName = storeMap.get(s.store_id);
      const customerInfo = [s.customer_name, s.customer_phone].filter(Boolean).join(' | ');
      return {
        id: s.id,
        date: s.created_at,
        type: 'SALE',
        amount: Number(s.total_amount),
        entity: customerInfo || 'Walk-in Customer',
        store: storeName || (s.store_id ? 'Branch: ' + s.store_id.slice(0, 8).toUpperCase() : 'POS Terminal'),
        store_id: s.store_id,
        user: 'Staff',
        method: s.payment_method,
        ref: `INV-${s.id.slice(0, 8).toUpperCase()}`
      };
    });

    const normalizedPurchases = (purchases.data || []).map((p: any) => ({
      id: p.id,
      date: p.purchase_date,
      type: 'PURCHASE',
      amount: -Number(p.total_amount),
      entity: vendorMap.get(p.vendor_id) || 'Unknown Vendor',
      store: 'CENTRAL WAREHOUSE',
      store_id: 'central',
      user: 'System',
      method: 'Transfer/Credit',
      ref: p.notes || `PUR-${p.id.slice(0, 8).toUpperCase()}`
    }));

    const normalizedPayouts = (payouts.data || []).map((p: any) => ({
      id: p.id,
      date: p.date,
      type: 'PAYOUT',
      amount: -Number(p.amount),
      entity: workerMap.get(p.worker_id) || 'Unknown Worker',
      store: p.worker_type.toUpperCase() + ' STAFF',
      store_id: 'workforce',
      user: 'Admin',
      method: p.transaction_type === 'advance_given' ? 'Advance' : 'Settlement',
      ref: p.description || `PAY-${p.id.slice(0, 8).toUpperCase()}`
    }));

    // Combine and sort by date descending
    const allTransactions = [...normalizedSales, ...normalizedPurchases, ...normalizedPayouts].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json(allTransactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Sale Details (Items)
app.get('/api/transactions/sale-details/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data, error } = await db
      .from('sale_items')
      .select(`
        *,
        finished_products(name, unit)
      `)
      .eq('sale_id', req.params.id);
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
// Create Raw Material (Owner only)
app.post('/api/inventory/raw-materials', requireRole(['owner']), validate(rawMaterialSchema), async (req: any, res: any) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { id, name, unit, material_kind, roll_width_ft, default_roll_length_mt, default_pipe_length_ft, default_dala_length_ft, gsm, default_pages_per_box, thickness_mm, default_board_width_ft, default_board_height_ft, description } = req.body;
  try {
    const materialData = { 
      name, 
      unit: unit || 'SQFT', 
      material_kind: material_kind || 'flex',
      roll_width_ft: roll_width_ft ? Number(roll_width_ft) : null, 
      default_roll_length_mt: default_roll_length_mt ? Number(default_roll_length_mt) : null,
      default_pipe_length_ft: default_pipe_length_ft ? Number(default_pipe_length_ft) : null,
      default_dala_length_ft: default_dala_length_ft ? Number(default_dala_length_ft) : null,
      gsm: gsm ? Number(gsm) : null,
      default_pages_per_box: default_pages_per_box ? Number(default_pages_per_box) : null,
      thickness_mm: thickness_mm ? Number(thickness_mm) : null,
      default_board_width_ft: default_board_width_ft ? Number(default_board_width_ft) : null,
      default_board_height_ft: default_board_height_ft ? Number(default_board_height_ft) : null,
      description 
    };

    if (id) {
      // Update existing
      const { data, error } = await db.from('raw_materials').update(materialData).eq('id', id).select().single();
      if (error) throw error;
      res.json(data);
    } else {
      // Create new
      const { data, error } = await db.from('raw_materials').insert([materialData]).select().single();
      if (error) throw error;
      // Initialize stock for new material
      await db.from('central_stock').insert([{ raw_material_id: data.id, quantity: 0 }]);
      res.json(data);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record Purchase & Create Batches (Owner only)
app.post('/api/inventory/purchase', requireRole(['owner']), validate(purchaseSchema), async (req: any, res: any) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { vendorId, invoice, date, items, userId } = req.body;
  
  // Sanitize IDs if they are not valid UUIDs
  const isUuid = (id: string | undefined) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const safeUserId = isUuid(userId) ? userId : null;

  try {
    let totalAmount = 0;
    const batchRecords = [];
    const wastagePerRoll = await getSystemConfig('wastage_per_roll_ft', 0.5);

    let firstPurchaseId = null;

    for (const item of items) {
      const qty = Number(item.quantity);
      const rate = Number(item.rate);
      const subtotal = qty * rate;
      
      // If it's a correction/stock-out (negative qty), we skip batch creation and just deduct stock
      if (qty < 0) {
        const { data: currentStock } = await db.from('central_stock').select('quantity').eq('raw_material_id', item.materialId).maybeSingle();
        if (currentStock) {
          await db.from('central_stock').update({ 
            quantity: (currentStock.quantity || 0) + qty, // qty is negative, so this deducts
            last_updated: new Date().toISOString() 
          }).eq('raw_material_id', item.materialId);
        }
        continue;
      }

      const purchasePayload: any = {
        vendor_id: vendorId,
        raw_material_id: item.materialId,
        quantity: qty,
        unit_price: rate,
        purchase_date: date || new Date().toISOString().split('T')[0],
        notes: invoice || 'N/A'
      };

      // Only include created_by if we have a valid UUID to prevent DB errors
      if (safeUserId) {
        purchasePayload.created_by = safeUserId;
      }

      const { data: purchaseData, error: purchaseError } = await db
        .from('purchases').insert([purchasePayload]).select().single();

      if (purchaseError) {
        console.error('[PURCHASE POST] Insert error:', JSON.stringify(purchaseError));
        throw purchaseError;
      }
      if (!firstPurchaseId) firstPurchaseId = purchaseData.id;

      const { data: material } = await db.from('raw_materials').select('*').eq('id', item.materialId).single();

      const isPipe = material?.material_kind === 'pipe';
      const isDala = material?.material_kind === 'dala';
      const isPaper = ['paper', 'gumming_page'].includes(material?.material_kind || '');
      const isBoard = ['sun_board', 'tin'].includes(material?.material_kind || '');
      const isRoll = ['flex', 'vinyl'].includes(material?.material_kind || '');
      
      const rollWidth = isBoard ? (material?.default_board_width_ft || 8) : 
                        isRoll ? (Number(item.rollWidth) || material?.roll_width_ft || 4) :
                        (material?.roll_width_ft || Number(item.rollWidth) || ((isPipe || isDala || isPaper) ? 1 : 1));
      const rollLength = isPipe ? (Number(item.pipeLength) || material?.default_pipe_length_ft || 20) : 
                        isDala ? (Number(item.dalaLength) || material?.default_dala_length_ft || 20) :
                        isPaper ? (Number(item.paperPages) || material?.default_pages_per_box || 100) :
                        isBoard ? (material?.default_board_height_ft || 4) :
                        isRoll ? (Number(item.rollLength) || (material?.default_roll_length_mt || 50) * 3.28084) :
                        (Number(item.rollLength) || 100);
      const actualArea = rollWidth * rollLength;
      const usableArea = (isPipe || isDala || isPaper || isBoard || isRoll) ? actualArea : (Math.max(0, rollWidth - wastagePerRoll) * rollLength);
      
      const numItems = (isRoll || isPipe || isDala || isPaper || isBoard) ? Math.max(1, Math.round(qty / ((isBoard || isRoll) ? (rollWidth * rollLength) : rollLength))) : 1;
      const totalUsableArea = numItems * (isPipe ? rollLength : (usableArea || 1));
      const costPerSqFt = isPipe ? 0 : (subtotal / (totalUsableArea || 1));

      for (let i = 0; i < numItems; i++) {
        batchRecords.push({
          raw_material_id: item.materialId, purchase_id: purchaseData.id, vendor_id: vendorId,
          roll_width_ft: rollWidth, roll_length_ft: rollLength,
          actual_area_sqft: actualArea,
          usable_area_sqft: usableArea, remaining_usable_area_sqft: usableArea,
          cost_per_sqft: costPerSqFt, created_at: new Date().toISOString()
        });
      }
      totalAmount += subtotal;

      const { data: currentStock } = await db.from('central_stock').select('quantity').eq('raw_material_id', item.materialId).maybeSingle();
      
      // Calculate added stock based on unit
      const addedStock = (['MT', 'LTR', 'KG', 'PCS', 'BOX'].includes(material?.unit || '')) 
        ? qty // Use the total quantity directly for these units
        : totalUsableArea;

      if (currentStock) {
        await db.from('central_stock').update({ 
          quantity: (currentStock.quantity || 0) + addedStock, 
          last_updated: new Date().toISOString() 
        }).eq('raw_material_id', item.materialId);
      } else {
        await db.from('central_stock').insert({ 
          raw_material_id: item.materialId, 
          quantity: addedStock 
        });
      }
    }

    if (batchRecords.length > 0) await db.from('material_batches').insert(batchRecords);

    // Only update vendor ledger if it's not a correction and there's a total amount
    if (vendorId !== 'correction' && totalAmount !== 0) {
      // If vendorId is a UUID, update the ledger. If it's a mock ID, we skip ledger to avoid DB errors
      // unless we want to support a "Demo Vendor" ledger entry.
      if (isUuid(vendorId)) {
        try {
          const { data: bal } = await db.from('vendor_ledger')
            .select('balance')
            .eq('vendor_id', vendorId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          await db.from('vendor_ledger').insert({
            vendor_id: vendorId, 
            transaction_type: 'purchase', 
            amount: totalAmount, 
            balance: (bal?.balance || 0) + totalAmount,
            reference_id: firstPurchaseId, 
            notes: `Auto-generated Purchase Entry: ${invoice || 'N/A'}`
          });
          console.log(`[LEDGER SYNC] Added ₹${totalAmount} to Vendor ${vendorId}. New Balance: ${(bal?.balance || 0) + totalAmount}`);
        } catch (ledgerError) {
          console.warn('[LEDGER SYNC] Failed to update vendor ledger:', ledgerError);
          // Don't fail the whole purchase if ledger update fails
        }
      } else {
        console.log(`[LEDGER SYNC] Skipping ledger for non-UUID vendor: ${vendorId}`);
      }
    }

    res.json({ status: 'success' });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POS Sale (Atomic with Stock Deduction)
app.post('/api/pos/sale', authenticate, validate(posSaleSchema), async (req: any, res: any) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { storeId, userId, items, paymentMode, totalAmount, customerName, customerPhone } = req.body;

  // Sanitize IDs if they are not valid UUIDs (to prevent DB type errors)
  const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const isDemoId = (id: string) => id?.startsWith('00000000-0000-0000-0000-0000000000');

  const safeUserId = (isUuid(userId) && !isDemoId(userId)) ? userId : null;
  const safeStoreId = (isUuid(storeId) && !isDemoId(storeId)) ? storeId : null;

  // Security check: Manager can only sell from their own store
  if (req.user.profile.role === 'store_manager' && req.user.profile.store_id !== storeId) {
    return res.status(403).json({ error: 'Unauthorized: Cannot sell from another outlet' });
  }

  try {
    // 1. Calculate Estimated Cost and Profit
    let totalEstimatedCost = 0;
    for (const item of items) {
      // Find BOM or use fallback cost
      const { data: bomItems } = await db
        .from('product_bom')
        .select('raw_material_id, quantity_required')
        .eq('product_id', item.product_id);
      
      let itemCost = 0;
      if (bomItems && bomItems.length > 0) {
        for (const bom of bomItems) {
          const { data: material } = await db.from('raw_materials').select('unit_price, roll_width_ft').eq('id', bom.raw_material_id).maybeSingle();
          const matPrice = Number(material?.unit_price || 0);
          const totalSqFt = (item.width_ft || 0) * (item.height_ft || 0);
          itemCost += (bom.quantity_required * (totalSqFt || 1) * matPrice);
        }
      } else {
        // Fallback: 40% of selling price as cost if no BOM exists
        itemCost = (item.rate * 0.4) * item.quantity;
      }
      totalEstimatedCost += itemCost;
    }

    const grossProfit = totalAmount - totalEstimatedCost;

    // 2. Create Sale Record
    const { data: saleData, error: saleError } = await db.from('sales').insert({
      store_id: safeStoreId, 
      customer_name: customerName, 
      customer_phone: customerPhone,
      total_amount: totalAmount, 
      // total_cost and gross_profit removed as they may not exist in all database environments
      payment_method: paymentMode, 
      created_by: safeUserId
    }).select().single();

    if (saleError) throw saleError;

    // 3. Process Items
    for (const item of items) {
      const { error: itemError } = await db.from('sale_items').insert({
        sale_id: saleData.id, 
        finished_product_id: item.product_id, 
        quantity: item.quantity,
        unit_price: item.rate, 
        width_ft: item.width_ft, 
        height_ft: item.height_ft,
        charged_area_sqft: item.charged_area_sqft
      });

      if (itemError) throw itemError;

      // 4. Deduct Stock
      if (item.inventory_deductions && item.inventory_deductions.length > 0) {
        // Manual Deductions
        for (const deduction of item.inventory_deductions) {
          const { data: currentStock } = await db.from('central_stock')
            .select('quantity')
            .eq('raw_material_id', deduction.material_id)
            .maybeSingle();

          if (currentStock) {
            const currentQty = Number(currentStock.quantity) || 0;
            const deductionQty = Number(deduction.quantity) || 0;
            
            await db.from('central_stock').update({ 
              quantity: Math.max(0, currentQty - deductionQty),
              last_updated: new Date().toISOString()
            }).eq('raw_material_id', deduction.material_id);
            
            console.log(`[STOCK SYNC] Deducted ${deductionQty} from ${deduction.material_id}. New Qty: ${Math.max(0, currentQty - deductionQty)}`);
          }
        }
      } else {
        // Fallback to BOM if no manual deductions provided
        const { data: bomItems } = await db
          .from('product_bom')
          .select('raw_material_id, quantity_required')
          .eq('product_id', item.product_id);
        
        if (bomItems && bomItems.length > 0) {
          for (const bom of bomItems) {
            const { data: currentStock } = await db.from('central_stock')
              .select('quantity')
              .eq('raw_material_id', bom.raw_material_id)
              .maybeSingle();

            if (currentStock) {
              const { data: material } = await db.from('raw_materials').select('*').eq('id', bom.raw_material_id).single();
              const totalSqFt = (item.width_ft || 0) * (item.height_ft || 0);
              let deductionAmount = bom.quantity_required * (totalSqFt || 1) * item.quantity;
              
              if (material?.unit === 'MT') {
                const rollWidth = material.roll_width_ft || 1;
                const lengthFt = (item.charged_area_sqft || totalSqFt) / rollWidth;
                deductionAmount = (lengthFt / 3.28084) * item.quantity;
              }

              await db.from('central_stock').update({ 
                quantity: Math.max(0, (currentStock.quantity || 0) - deductionAmount),
                last_updated: new Date().toISOString()
              }).eq('raw_material_id', bom.raw_material_id);
            }
          }
        }
      }
    }

    res.json({ status: 'success', saleId: saleData.id, gross_profit: grossProfit });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Vendor/Store/Product (Owner only for core entities)
app.post('/api/inventory/vendors', requireRole(['owner']), validate(vendorSchema), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
      const { data, error } = await db.from('vendors').insert([req.body]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post('/api/inventory/vendor-payments', requireRole(['owner']), async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database not initialized' });
    const { vendor_id, amount, payment_date, notes, created_by } = req.body;
    
    // Sanitize ID to prevent foreign key violations in demo mode
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isDemoId = (id: string) => id?.startsWith('00000000-0000-0000-0000-0000000000');
    
    const userId = created_by || req.user.id;
    const safeUserId = (isUuid(userId) && !isDemoId(userId)) ? userId : null;

    try {
      const payload: any = {
        vendor_id,
        amount,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        notes,
        payment_method: req.body.payment_method || 'cash',
        reference_number: req.body.reference_number || null
      };

      if (safeUserId) {
        payload.created_by = safeUserId;
      }

      const { data, error } = await db.from('vendor_payments').insert([payload]).select().single();
      if (error) throw error;

      // Sync to Ledger
      try {
        const { data: bal } = await db.from('vendor_ledger')
          .select('balance')
          .eq('vendor_id', vendor_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        await db.from('vendor_ledger').insert({
          vendor_id, 
          transaction_type: 'payment', 
          amount: -Number(amount), 
          balance: (bal?.balance || 0) - Number(amount),
          reference_id: data.id, 
          notes: notes || 'Manual Payment Entry'
        });
      } catch (ledgerError) {
        console.warn('[LEDGER SYNC] Failed to update vendor ledger during payment:', ledgerError);
      }

      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/inventory/stores', requireRole(['owner']), validate(storeSchema), async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database not initialized' });
    try {
      const storeData = { ...req.body };
      // Auto-generate unique 6-digit PIN if not provided
      if (!storeData.pin) {
        let isUnique = false;
        let newPin = '';
        while (!isUnique) {
          newPin = Math.floor(100000 + Math.random() * 900000).toString();
          const { data: existing } = await db.from('stores').select('id').eq('pin', newPin).maybeSingle();
          const { data: existingUser } = await db.from('users').select('id').eq('pin', newPin).maybeSingle();
          const { data: existingTemp } = await db.from('temp_workers').select('id').eq('pin', newPin).maybeSingle();
          if (!existing && !existingUser && !existingTemp) isUnique = true;
        }
        storeData.pin = newPin;
      }
      const { data, error } = await db.from('stores').insert([storeData]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.put('/api/inventory/stores/:id', requireRole(['owner']), validate(storeSchema), async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database not initialized' });
    try {
      const { data, error } = await db.from('stores').update(req.body).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Update Store PIN only (Owner only)
  app.put('/api/inventory/stores/:id/pin', requireRole(['owner']), async (req: any, res: any) => {
    if (!db) return res.status(503).json({ error: 'Database not initialized' });
    try {
      const { pin } = req.body;
      if (!pin || pin.length !== 6) return res.status(400).json({ error: 'PIN must be 6 digits' });
      const { data, error } = await db.from('stores').update({ pin }).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.delete('/api/inventory/stores/:id', requireRole(['owner']), async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database not initialized' });
    try {
      const { error } = await db.from('stores').delete().eq('id', req.params.id);
      if (error) {
        if (error.code === '23503') {
          return res.status(400).json({ error: 'Cannot delete: This branch has active transactions or stock history. Decommission failed for data integrity.' });
        }
        throw error;
      }
      res.json({ message: 'Store deleted' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

app.post('/api/inventory/products', requireRole(['owner']), validate(productSchema), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data, error } = await db.from('finished_products').insert([req.body]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});



// --- Workforce Management Routes ---

// Permanent Staff
app.get('/api/workforce/permanent', async (req: any, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { storeId } = req.query;
  try {
    let query = db.from('permanent_staff').select('*, stores(name)').order('name');
    if (storeId && storeId !== 'all') query = query.eq('store_id', storeId);
    else if (req.user.profile.role === 'store_manager') query = query.eq('store_id', req.user.profile.store_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/workforce/permanent', requireRole(['owner']), validate(permanentStaffSchema), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  console.log('[WORKFORCE PERM POST] req.body:', JSON.stringify(req.body));
  try {
    const { data, error } = await db.from('permanent_staff').insert([req.body]).select().single();
    if (error) {
      console.error('[WORKFORCE PERM POST] Supabase error:', JSON.stringify(error));
      throw error;
    }
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/workforce/permanent/:id', requireRole(['owner']), validate(permanentStaffSchema), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
   try {
    const { data, error } = await db.from('permanent_staff').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/workforce/permanent/:id', requireRole(['owner']), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { error } = await db.from('permanent_staff').delete().eq('id', req.params.id);
    if (error) {
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Cannot delete: This staff member has salary or attendance records. Archive them instead if needed.' });
      }
      throw error;
    }
    res.json({ message: 'Staff member deleted' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Temp Workers
app.get('/api/workforce/temp', async (req: any, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { storeId } = req.query;
  try {
    let query = db.from('temp_workers').select('*, stores(name)').order('name');
    if (storeId && storeId !== 'all') query = query.eq('store_id', storeId);
    else if (req.user.profile.role === 'store_manager') query = query.eq('store_id', req.user.profile.store_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/workforce/temp/:id', requireRole(['owner']), async (req: any, res: any) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data, error } = await db.from('temp_workers').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/workforce/temp/:id', requireRole(['owner']), async (req: any, res: any) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { error } = await db.from('temp_workers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/workforce/temp', requireRole(['owner']), validate(tempWorkerSchema), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  console.log('[WORKFORCE TEMP POST] req.body:', JSON.stringify(req.body));
  try {
    const workerData = { ...req.body };
    
    // Generate unique 6-digit PIN if not provided
    if (!workerData.pin) {
      let isUnique = false;
      let newPin = '';
      while (!isUnique) {
        newPin = Math.floor(100000 + Math.random() * 900000).toString();
        const { data: existing } = await db.from('temp_workers').select('id').eq('pin', newPin).maybeSingle();
        if (!existing) isUnique = true;
      }
      workerData.pin = newPin;
    }

    const { data, error } = await db.from('temp_workers').insert([workerData]).select().single();
    if (error) {
      console.error('[WORKFORCE TEMP POST] Supabase error:', JSON.stringify(error));
      throw error;
    }
    res.json(data);
  } catch (error: any) { 
    console.error('[WORKFORCE TEMP POST] Error:', error.message);
    res.status(500).json({ error: error.message }); 
  }
});

app.put('/api/workforce/temp/:id', requireRole(['owner']), validate(tempWorkerSchema), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
   try {
    const { data, error } = await db.from('temp_workers').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/workforce/temp/:id', requireRole(['owner']), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { error } = await db.from('temp_workers').delete().eq('id', req.params.id);
    if (error) {
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Cannot delete: This worker has work history or ledger entries. Deleting will break historical reports.' });
      }
      throw error;
    }
    res.json({ message: 'Worker deleted' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Attendance
app.get('/api/workforce/attendance', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { date, startDate, endDate, workerId, workerType } = req.query;
  try {
    let query = db.from('attendance').select('*').order('date', { ascending: false });
    if (date) query = query.eq('date', date);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (workerId) query = query.eq('worker_id', workerId);
    if (workerType) query = query.eq('worker_type', workerType);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/workforce/attendance', validate(attendanceSchema), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data, error } = await db.from('attendance').upsert([req.body]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/workforce/attendance/bulk', requireRole(['owner', 'store_manager']), async (req: any, res) => {
  console.log('[ATTENDANCE BULK] Request received. User role:', req.user?.profile?.role, '| Records count:', Array.isArray(req.body) ? req.body.length : 'not array');
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const records = req.body;
  if (!Array.isArray(records)) return res.status(400).json({ error: 'Expected an array. Got: ' + typeof records });
  if (records.length === 0) return res.json({ success: true, saved: 0 });

  try {
    const date = records[0]?.date;
    const workerIds = records.map((r: any) => r.worker_id);
    const tempWorkerIds = records.filter((r: any) => r.worker_type === 'temporary').map((r: any) => r.worker_id);

    // ── STEP 1: Bulk prefetch all data in parallel (3 queries instead of N*5) ──
    const [existingAttRes, tempWorkersRes, existingLedgerRes] = await Promise.all([
      // All existing attendance records for this date
      db.from('attendance')
        .select('id, worker_id, status, overtime_hours')
        .eq('date', date)
        .in('worker_id', workerIds),

      // All temp worker daily rates (only for temp workers)
      tempWorkerIds.length > 0
        ? db.from('temp_workers').select('id, daily_rate').in('id', tempWorkerIds)
        : Promise.resolve({ data: [], error: null }),

      // All existing ledger entries for this date for temp workers
      tempWorkerIds.length > 0
        ? db.from('worker_ledger')
            .select('id, worker_id, amount, description, transaction_type, balance')
            .in('worker_id', tempWorkerIds)
            .eq('date', date)
            .eq('worker_type', 'temporary')
            .in('transaction_type', ['wage_earned'])
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (existingAttRes.error) throw existingAttRes.error;
    if (tempWorkersRes.error) throw tempWorkersRes.error;
    if (existingLedgerRes.error) throw existingLedgerRes.error;

    // Build lookup maps from prefetched data
    const existingAttMap = new Map<string, { id: string; status: string; overtime_hours: number }>(
      (existingAttRes.data || []).map((r: any) => [r.worker_id, r])
    );
    const tempRateMap = new Map<string, number>(
      (tempWorkersRes.data || []).map((w: any) => [w.id, Number(w.daily_rate) || 0])
    );
    const ledgerByWorker = new Map<string, any[]>();
    for (const entry of (existingLedgerRes.data || [])) {
      if (!ledgerByWorker.has(entry.worker_id)) ledgerByWorker.set(entry.worker_id, []);
      ledgerByWorker.get(entry.worker_id)!.push(entry);
    }

    // ── STEP 2: Process all records in parallel ──
    await Promise.all(records.map(async (record: any) => {
      const { worker_id, worker_type, date: recDate, status, overtime_hours } = record;

      // Guard: skip records that have no status — the DB requires a non-null status
      if (!status) {
        console.warn(`[ATTENDANCE BULK] Skipping worker ${worker_id}: no status provided`);
        return;
      }

      // --- 1. Upsert Attendance (single query per record, now parallel) ---
      const existingAtt = existingAttMap.get(worker_id);
      if (existingAtt) {
        const updateData: any = { overtime_hours: overtime_hours || 0, worker_type, status };
        const { error: updateErr } = await db.from('attendance').update(updateData).eq('id', existingAtt.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await db.from('attendance')
          .insert({ worker_id, worker_type, date: recDate, status, overtime_hours: overtime_hours || 0 });
        if (insertErr) throw insertErr;
      }

      // --- 2 & 3. Temp worker ledger (wage + night duty) ---
      if (worker_type === 'temporary') {
        const dailyRate = tempRateMap.get(worker_id) || 0;
        const workerLedgerEntries = ledgerByWorker.get(worker_id) || [];

        const existingWage = workerLedgerEntries.find((e: any) =>
          e.transaction_type === 'wage_earned' && e.description?.toLowerCase().startsWith('daily wage')
        );
        const existingNight = workerLedgerEntries.find((e: any) =>
          e.transaction_type === 'wage_earned' && e.description?.toLowerCase().startsWith('night duty')
        );

        const ledgerOps: PromiseLike<any>[] = [];

        // --- Wage entry ---
        if (status === 'present' || status === 'half_day') {
          const amount = status === 'half_day' ? dailyRate / 2 : dailyRate;
          const [yr, mn, dy] = recDate.split('-');
          const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const description = `Daily Wage - ${dy} ${monthsShort[parseInt(mn, 10) - 1]} ${yr}`;

          if (existingWage) {
            if (Number(existingWage.amount) !== amount) {
              ledgerOps.push(
                db.from('worker_ledger').update({ amount, description }).eq('id', existingWage.id)
                  .then(({ error }) => { if (error) throw error; })
              );
            }
          } else {
            // For new inserts we need the current balance — fetch it (only when needed)
            ledgerOps.push(
              db.from('worker_ledger').select('balance').eq('worker_id', worker_id)
                .order('created_at', { ascending: false }).limit(1).maybeSingle()
                .then(({ data: lastEntry }) => {
                  const newBalance = Number(lastEntry?.balance || 0) + amount;
                  return db.from('worker_ledger').insert({
                    worker_id, worker_type: 'temporary', transaction_type: 'wage_earned',
                    amount, balance: newBalance, date: recDate, description, created_by: null
                  }).then(({ error }) => { if (error) throw error; });
                })
            );
          }
        } else {
          // Absent/Leave — delete wage entry if exists
          if (existingWage) {
            ledgerOps.push(
              db.from('worker_ledger').delete().eq('id', existingWage.id)
                .then(({ error }) => { if (error) throw error; })
            );
          }
        }

        // --- Night duty entry ---
        const nightHours = Number(overtime_hours || 0);
        if (nightHours > 0) {
          const nightAmount = (dailyRate / 8) * nightHours;
          const nightDescription = `Night Duty Allowance - ${nightHours} hrs (${recDate})`;

          if (existingNight) {
            if (Number(existingNight.amount) !== nightAmount) {
              ledgerOps.push(
                db.from('worker_ledger').update({ amount: nightAmount, description: nightDescription }).eq('id', existingNight.id)
                  .then(({ error }) => { if (error) throw error; })
              );
            }
          } else {
            ledgerOps.push(
              db.from('worker_ledger').select('balance').eq('worker_id', worker_id)
                .order('created_at', { ascending: false }).limit(1).maybeSingle()
                .then(({ data: lastEntry }) => {
                  const newBalance = Number(lastEntry?.balance || 0) + nightAmount;
                  return db.from('worker_ledger').insert({
                    worker_id, worker_type: 'temporary', transaction_type: 'wage_earned',
                    amount: nightAmount, balance: newBalance, date: recDate,
                    description: nightDescription, created_by: null
                  }).then(({ error }) => { if (error) throw error; });
                })
            );
          }
        } else {
          // No night duty — delete if exists
          if (existingNight) {
            ledgerOps.push(
              db.from('worker_ledger').delete().eq('id', existingNight.id)
                .then(({ error }) => { if (error) throw error; })
            );
          }
        }

        // Run all ledger operations for this worker in parallel
        if (ledgerOps.length > 0) await Promise.all(ledgerOps);
      }
    }));

    res.json({ success: true, saved: records.length });
  } catch (error: any) {
    console.error('Bulk attendance error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Salary Records
app.get('/api/workforce/salary', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { staffId, month, year } = req.query;
  try {
    let query = db.from('salary_records').select('*, permanent_staff(name)').order('year', { ascending: false }).order('month', { ascending: false });
    if (staffId) query = query.eq('staff_id', staffId);
    if (month) query = query.eq('month', month);
    if (year) query = query.eq('year', year);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/workforce/salary', requireRole(['owner']), validate(salaryRecordSchema), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { data, error } = await db.from('salary_records').upsert([req.body]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Worker Ledger
app.get('/api/workforce/ledger', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { workerId, workerType } = req.query;
  try {
    let query = db.from('worker_ledger').select('*, users(name)').order('date', { ascending: false });
    if (workerId) query = query.eq('worker_id', workerId);
    if (workerType) query = query.eq('worker_type', workerType);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/workforce/ledger', validate(workerLedgerSchema), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { worker_id, worker_type, transaction_type, amount, date, description, created_by } = req.body;
    
    // Get last balance
    const { data: lastEntry } = await db
      .from('worker_ledger')
      .select('balance')
      .eq('worker_id', worker_id)
      .eq('worker_type', worker_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let newBalance = lastEntry?.balance || 0;
    if (transaction_type === 'advance_given' || transaction_type === 'payment_made') {
      newBalance -= amount;
    } else {
      newBalance += amount;
    }

    // Validate created_by exists in users table to avoid foreign key violation
    let validCreatedBy = created_by;
    if (created_by) {
      const { data: userExists } = await db
        .from('users')
        .select('id')
        .eq('id', created_by)
        .maybeSingle();
      
      if (!userExists) {
        validCreatedBy = null;
      }
    }

    const { data, error } = await db
      .from('worker_ledger')
      .insert([{ 
        worker_id, 
        worker_type, 
        transaction_type, 
        amount, 
        date, 
        description, 
        created_by: validCreatedBy,
        balance: newBalance 
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Void/Delete a ledger entry (advance_given only — mistaken entries only, owner only)
app.delete('/api/workforce/ledger/:id', requireRole(['owner']), async (req: any, res: any) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { id } = req.params;
  try {
    // Fetch the entry first to make sure it exists and is an advance_given
    const { data: entry, error: findErr } = await db
      .from('worker_ledger')
      .select('id, transaction_type')
      .eq('id', id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!entry) return res.status(404).json({ error: 'Ledger entry not found' });
    if (entry.transaction_type !== 'advance_given') {
      return res.status(403).json({ error: 'Only advance entries can be voided this way' });
    }

    const { error: delErr } = await db.from('worker_ledger').delete().eq('id', id);
    if (delErr) throw delErr;

    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- General Expense Routes (Mapped to worker_ledger as fallback) ---
const BUSINESS_EXPENSE_ID = '00000000-0000-0000-0000-000000000000';

app.get('/api/expenses', authenticate, async (req: any, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    let query = db
      .from('worker_ledger')
      .select('*')
      .eq('worker_id', BUSINESS_EXPENSE_ID);
    
    // Scoping for managers
    if (req.user?.profile?.role === 'store_manager') {
      // For now we filter by looking for store name/ID in description or we assume all expenses 
      // in worker_ledger for BUSINESS_EXPENSE_ID that were created_by this manager belong to this store.
      // A better way is to filter by created_by
      query = query.eq('created_by', req.user.profile.id);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    
    // Transform back to expense format
    const transformed = data.map((item: any) => {
      let description = item.description || '';
      let category = 'General';
      let payment_method = 'cash';
      
      if (description.startsWith('[')) {
        const match = description.match(/^\[(.*?)\]\s*\[(.*?)\]\s*(.*)$/);
        if (match) {
          category = match[1];
          payment_method = match[2];
          description = match[3];
        }
      }
      
      return {
        id: item.id,
        description,
        amount: item.amount,
        date: item.date,
        category,
        payment_method,
        notes: ''
      };
    });

    res.json(transformed);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/expenses', authenticate, requireRole(['owner', 'store_manager']), validate(otherExpenseSchema), async (req: any, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  const { description, amount, date, category, payment_method, notes } = req.body;
  
  try {
    // We use payment_made as transaction type for expenses
    const enrichedDescription = `[${category}] [${payment_method}] ${description}`;
    
    // Validate created_by exists in users table to avoid foreign key violation
    let validCreatedBy = req.user?.profile?.id;
    if (validCreatedBy) {
      const { data: userExists } = await db
        .from('users')
        .select('id')
        .eq('id', validCreatedBy)
        .maybeSingle();
      
      if (!userExists) {
        validCreatedBy = null;
      }
    }

    const { data, error } = await db
      .from('worker_ledger')
      .insert([{
        worker_id: BUSINESS_EXPENSE_ID,
        worker_type: 'temporary',
        transaction_type: 'payment_made',
        amount,
        date,
        description: enrichedDescription,
        created_by: validCreatedBy,
        balance: 0 // Default balance for individual business expense entries
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) { 
    console.error('[EXPENSE POST ERROR]', error);
    res.status(500).json({ error: error.message }); 
  }
});

app.delete('/api/expenses/:id', authenticate, requireRole(['owner', 'store_manager']), async (req: any, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  try {
    const { error } = await db.from('worker_ledger').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- System Management Routes ---

// Reset Database: Clear only transaction/historical data (Owner only)
app.post('/api/system/clear-transactions', requireRole(['owner']), async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not initialized' });
  
  try {
    console.log('[SYSTEM RESET] Clearing transaction data...');

    // Delete in sequence to handle potential FK constraints
    const tablesToClear = [
      'vendor_payments',
      'sale_items',
      'sales',
      'purchases',
      'material_batches',
      'worker_ledger',
      'attendance',
      'salary_records'
    ];

    for (const table of tablesToClear) {
      // Use a filter that is likely to match all UUIDs or IDs
      const { error } = await db.from(table).delete().neq('created_at', '1970-01-01');
      if (error) {
        console.error(`[SYSTEM RESET] Error clearing ${table}:`, error);
        // Continue to next table even if one fails
      }
    }

    // Reset inventory levels to zero
    await db.from('central_stock').update({ quantity: 0 }).neq('raw_material_id', '00000000-0000-0000-0000-000000000000');
    await db.from('store_stock').update({ quantity: 0 }).neq('raw_material_id', '00000000-0000-0000-0000-000000000000');

    res.json({ status: 'success', message: 'Transaction history cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;

