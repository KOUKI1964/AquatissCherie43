/*
  # Add discount keys usage tracking

  1. New Table
    - `discount_keys_usage`
      - Tracks used discount key combinations
      - Records user and partner IDs
      - Ensures each combination is used only once

  2. Security
    - Enable RLS
    - Add policies for access control
*/

-- Create discount keys usage table
CREATE TABLE IF NOT EXISTS public.discount_keys_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(code)
);

-- Enable RLS
ALTER TABLE public.discount_keys_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own discount key usage"
  ON public.discount_keys_usage
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.uid() = partner_id
  );

CREATE POLICY "Users can create discount key usage"
  ON public.discount_keys_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_discount_keys_usage_code ON public.discount_keys_usage(code);
CREATE INDEX idx_discount_keys_usage_user ON public.discount_keys_usage(user_id);
CREATE INDEX idx_discount_keys_usage_partner ON public.discount_keys_usage(partner_id);