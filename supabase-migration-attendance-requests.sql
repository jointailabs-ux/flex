-- =====================================================================
-- Migration: Add Staff Self-Attendance & Night Duty Requests Table
-- To be executed in your Supabase SQL Editor
-- =====================================================================

-- 1. Create attendance_requests table
CREATE TABLE IF NOT EXISTS public.attendance_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL,
    worker_type text NOT NULL CHECK (worker_type = ANY (ARRAY['permanent'::text, 'temporary'::text])),
    date date NOT NULL DEFAULT CURRENT_DATE,
    duty_type text NOT NULL DEFAULT 'regular'::text CHECK (duty_type = ANY (ARRAY['regular'::text, 'night_duty'::text, 'morning_shift'::text, 'overtime'::text])),
    attendance_status text NOT NULL DEFAULT 'present'::text CHECK (attendance_status = ANY (ARRAY['present'::text, 'half_day'::text, 'absent'::text, 'leave'::text])),
    hours_worked numeric NOT NULL DEFAULT 8,
    overtime_hours numeric NOT NULL DEFAULT 0,
    notes text,
    status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
    rejection_reason text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT attendance_requests_pkey PRIMARY KEY (id)
);

-- Drop strict foreign key constraint on reviewed_by if it exists (allows PIN/demo admin without constraint failure)
ALTER TABLE public.attendance_requests DROP CONSTRAINT IF EXISTS attendance_requests_reviewed_by_fkey;

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_requests_worker_date ON public.attendance_requests (worker_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_status ON public.attendance_requests (status);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_created_at ON public.attendance_requests (created_at DESC);

-- 3. Ensure unique constraint on attendance table to avoid duplicate records per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_worker_date ON public.attendance (worker_id, worker_type, date);

-- 4. Disable RLS (matching existing tables in your project)
ALTER TABLE public.attendance_requests DISABLE ROW LEVEL SECURITY;

-- 5. Grant access permissions
GRANT ALL ON public.attendance_requests TO postgres, anon, authenticated, service_role;
