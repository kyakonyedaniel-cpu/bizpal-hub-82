
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS network text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS approved_by text;
