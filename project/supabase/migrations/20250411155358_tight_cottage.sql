/*
  # Update Discount Key System
  
  1. Changes
    - Ensure discount_keys table has proper structure
    - Update discount_keys_usage table to store discount_key_id
    - Add proper indexes for performance
    - Update RLS policies
*/

-- Ensure discount_keys table has proper structure
DO $$ 
BEGIN
  -- Make sure id column exists and is primary key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discount_keys'
    AND column_name = 'id'
  ) THEN
    ALTER TABLE public.discount_keys
    ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;
  END IF;
  
  -- Make sure type column exists and has proper check constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discount_keys'
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.discount_keys
    ADD COLUMN type text NOT NULL CHECK (type IN ('silver', 'bronze', 'gold'));
  END IF;
  
  -- Make sure percentage column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discount_keys'
    AND column_name = 'percentage'
  ) THEN
    ALTER TABLE public.discount_keys
    ADD COLUMN percentage integer NOT NULL CHECK (percentage > 0 AND percentage <= 100);
  END IF;
  
  -- Make sure is_active column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discount_keys'
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.discount_keys
    ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
  
  -- Make sure created_at column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discount_keys'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.discount_keys
    ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  
  -- Make sure used_at column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discount_keys'
    AND column_name = 'used_at'
  ) THEN
    ALTER TABLE public.discount_keys
    ADD COLUMN used_at timestamptz;
  END IF;
  
  -- Make sure created_by column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discount_keys'
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.discount_keys
    ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Ensure discount_keys_usage table has proper structure
DO $$ 
BEGIN
  -- Make sure discount_key_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discount_keys_usage'
    AND column_name = 'discount_key_id'
  ) THEN
    ALTER TABLE public.discount_keys_usage
    ADD COLUMN discount_key_id uuid REFERENCES public.discount_keys(id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discount_keys_type ON public.discount_keys(type);
CREATE INDEX IF NOT EXISTS idx_discount_keys_is_active ON public.discount_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_keys_usage_code ON public.discount_keys_usage(code);
CREATE INDEX IF NOT EXISTS idx_discount_keys_usage_user ON public.discount_keys_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_keys_usage_partner ON public.discount_keys_usage(partner_id);
CREATE INDEX IF NOT EXISTS idx_discount_keys_usage_discount_key ON public.discount_keys_usage(discount_key_id);

-- Update RLS policies
DO $$ 
BEGIN
  -- Policies for discount_keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'discount_keys' 
    AND policyname = 'Admins can manage discount keys'
  ) THEN
    CREATE POLICY "Admins can manage discount keys"
      ON public.discount_keys
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.id = auth.uid()
      ));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'discount_keys' 
    AND policyname = 'Anyone can view active discount keys'
  ) THEN
    CREATE POLICY "Anyone can view active discount keys"
      ON public.discount_keys
      FOR SELECT
      TO public
      USING (is_active = true);
  END IF;
  
  -- Policies for discount_keys_usage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'discount_keys_usage' 
    AND policyname = 'Users can view own discount key usage'
  ) THEN
    CREATE POLICY "Users can view own discount key usage"
      ON public.discount_keys_usage
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id OR 
        auth.uid() = partner_id
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'discount_keys_usage' 
    AND policyname = 'Users can create discount key usage'
  ) THEN
    CREATE POLICY "Users can create discount key usage"
      ON public.discount_keys_usage
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON public.discount_keys TO authenticated;
GRANT ALL ON public.discount_keys_usage TO authenticated;