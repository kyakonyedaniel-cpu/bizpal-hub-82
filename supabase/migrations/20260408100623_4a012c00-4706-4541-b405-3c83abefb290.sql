
-- Function to enforce branch limit for free plan
CREATE OR REPLACE FUNCTION public.enforce_branch_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_plan text;
  branch_count integer;
BEGIN
  SELECT plan INTO user_plan FROM public.profiles WHERE user_id = NEW.user_id;
  
  IF user_plan IS NULL OR user_plan = 'free' THEN
    SELECT count(*) INTO branch_count FROM public.branches WHERE user_id = NEW.user_id;
    IF branch_count >= 1 THEN
      RAISE EXCEPTION 'Free plan allows only 1 branch. Please upgrade to Premium.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to enforce sales limit for free plan
CREATE OR REPLACE FUNCTION public.enforce_sales_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_plan text;
  sales_count integer;
BEGIN
  SELECT plan INTO user_plan FROM public.profiles WHERE user_id = NEW.user_id;
  
  IF user_plan IS NULL OR user_plan = 'free' THEN
    SELECT count(*) INTO sales_count FROM public.sales WHERE user_id = NEW.user_id;
    IF sales_count >= 50 THEN
      RAISE EXCEPTION 'Free plan allows only 50 sales records. Please upgrade to Premium.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to enforce product limit for free plan
CREATE OR REPLACE FUNCTION public.enforce_product_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_plan text;
  product_count integer;
BEGIN
  SELECT plan INTO user_plan FROM public.profiles WHERE user_id = NEW.user_id;
  
  IF user_plan IS NULL OR user_plan = 'free' THEN
    SELECT count(*) INTO product_count FROM public.products WHERE user_id = NEW.user_id;
    IF product_count >= 20 THEN
      RAISE EXCEPTION 'Free plan allows only 20 products. Please upgrade to Premium.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER enforce_branch_limit_trigger
  BEFORE INSERT ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_branch_limit();

CREATE TRIGGER enforce_sales_limit_trigger
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_sales_limit();

CREATE TRIGGER enforce_product_limit_trigger
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_limit();
