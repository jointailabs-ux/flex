-- Add PIN column to permanent_staff for profile access
ALTER TABLE public.permanent_staff ADD COLUMN IF NOT EXISTS pin TEXT UNIQUE;
