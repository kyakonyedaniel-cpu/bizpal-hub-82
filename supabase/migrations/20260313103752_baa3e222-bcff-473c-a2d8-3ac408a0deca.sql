
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode text;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_reports_enabled boolean NOT NULL DEFAULT false;
