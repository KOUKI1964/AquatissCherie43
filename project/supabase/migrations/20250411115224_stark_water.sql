/*
  # Add tracking number to orders table
  
  1. Changes
    - Add tracking_number column to orders table
    - Add shipping_address column to orders table (jsonb)
    - Add index for better performance
*/

-- Add tracking_number column if it doesn't exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_number text;

-- Add shipping_address column if it doesn't exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_address jsonb;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);

-- Update RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Users can view own orders'
  ) THEN
    CREATE POLICY "Users can view own orders"
      ON public.orders
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Users can create orders'
  ) THEN
    CREATE POLICY "Users can create orders"
      ON public.orders
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Users can update own orders'
  ) THEN
    CREATE POLICY "Users can update own orders"
      ON public.orders
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Users can delete own orders'
  ) THEN
    CREATE POLICY "Users can delete own orders"
      ON public.orders
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON public.orders TO authenticated;