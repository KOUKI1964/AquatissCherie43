/*
  # Add session support for anonymous carts

  1. Changes
    - Add session_id column to user_carts table
    - Add index for session_id
    - Update RLS policies to support anonymous access

  2. Security
    - Enable RLS
    - Add policies for both authenticated and anonymous users
    - Ensure proper access control
*/

-- Add session_id column
ALTER TABLE public.user_carts
ADD COLUMN IF NOT EXISTS session_id text;

-- Create index for session_id
CREATE INDEX IF NOT EXISTS idx_user_carts_session_id ON public.user_carts(session_id);

-- Update RLS policies
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own cart" ON public.user_carts;
    DROP POLICY IF EXISTS "Users can update own cart" ON public.user_carts;
    DROP POLICY IF EXISTS "Anonymous can access cart with session" ON public.user_carts;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create new policies
CREATE POLICY "Users can view own cart"
  ON public.user_carts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON public.user_carts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous can access cart with session"
  ON public.user_carts
  FOR ALL
  TO anon
  USING (session_id IS NOT NULL)
  WITH CHECK (session_id IS NOT NULL);