import { z } from 'zod'; // Updated categories 14:58

export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['owner', 'store_manager']),
  store_id: z.string().uuid().optional(),
  pin: z.string().length(6)
});

export const rawMaterialSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  unit: z.string().min(1),
  material_kind: z.enum([
    'flex', 'vinyl', 'sun_board', 'paper', 'gumming_page', 
    'tin', 'ink', 'cartridge', 'solvent', 'pipe', 
    'light', 'dala', 'general'
  ]).default('flex'),
  roll_width_ft: z.number().positive().optional(),
  default_roll_length_mt: z.number().positive().optional(),
  default_pipe_length_ft: z.number().positive().optional(),
  default_dala_length_ft: z.number().positive().optional(),
  gsm: z.number().positive().optional(),
  default_pages_per_box: z.number().positive().optional(),
  thickness_mm: z.number().positive().optional(),
  default_board_width_ft: z.number().positive().optional(),
  default_board_height_ft: z.number().positive().optional(),
  description: z.string().optional()
});

export const purchaseItemSchema = z.object({
  materialId: z.string(),
  quantity: z.number().refine(n => n !== 0, "Quantity cannot be zero"),
  rate: z.number().nonnegative(),
  rollWidth: z.number().positive().optional(),
  rollLength: z.number().positive().optional(),
  pipeLength: z.number().positive().optional()
});

export const purchaseSchema = z.object({
  vendorId: z.string(),
  invoice: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  items: z.array(purchaseItemSchema).min(1),
  userId: z.string().optional()
});

export const posSaleItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
  width_ft: z.number().positive().optional(),
  height_ft: z.number().positive().optional(),
  charged_area_sqft: z.number().nonnegative(),
  inventory_deductions: z.array(z.object({
    material_id: z.string().uuid(),
    quantity: z.number().positive()
  })).optional()
});

export const posSaleSchema = z.object({
  storeId: z.string(),
  userId: z.string().optional(),
  items: z.array(posSaleItemSchema).min(1),
  paymentMode: z.string(),
  totalAmount: z.number().nonnegative(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional()
});

export const vendorSchema = z.object({
  name: z.string().min(2),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional()
});

export const storeSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10).toUpperCase(),
  pin: z.string().length(6).optional()
});

export const productSchema = z.object({
  name: z.string().min(2),
  unit: z.string().default('Piece'),
  selling_price: z.number().nonnegative(),
  description: z.string().optional()
});

// Workforce Management Schemas
export const permanentStaffSchema = z.object({
  id: z.string().optional(),
  store_id: z.string().nullable().optional(),
  name: z.string().min(2),
  role: z.string().min(2),
  basic_salary: z.number().nonnegative(),
  joined_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_active: z.boolean().default(true),
  pin: z.string().length(6).optional()
});

export const tempWorkerSchema = z.object({
  id: z.string().optional(),
  store_id: z.string().nullable().optional(),
  name: z.string().min(2),
  skill: z.string().optional(),
  daily_rate: z.number().nonnegative(),
  joined_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_active: z.boolean().default(true),
  pin: z.string().length(6).optional()
});

export const attendanceSchema = z.object({
  worker_id: z.string(),
  worker_type: z.enum(['permanent', 'temporary']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['present', 'absent', 'half_day', 'leave']),
  overtime_hours: z.number().nonnegative().default(0),
  notes: z.string().optional()
});

export const salaryRecordSchema = z.object({
  staff_id: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().int(),
  basic: z.number().nonnegative(),
  overtime_amount: z.number().nonnegative().default(0),
  bonus: z.number().nonnegative().default(0),
  deductions: z.number().nonnegative().default(0),
  advance_deducted: z.number().nonnegative().default(0),
  net_payable: z.number().nonnegative(),
  status: z.enum(['pending', 'paid']).default('pending')
});

export const workerLedgerSchema = z.object({
  worker_id: z.string(),
  worker_type: z.enum(['permanent', 'temporary']),
  transaction_type: z.enum(['advance_given', 'wage_earned', 'payment_made', 'advance_recovered']),
  amount: z.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().optional(),
  created_by: z.string().optional()
});

export const otherExpenseSchema = z.object({
  description: z.string().min(2),
  amount: z.number().nonnegative(),
  category: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payment_method: z.string().default('cash'),
  notes: z.string().optional()
});

