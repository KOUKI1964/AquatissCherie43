/*
  # Fix import_logs status constraint

  1. Updates
    - Drop existing status constraint if it exists
    - Add proper status constraint that includes 'cancelled'
    - Ensure the status column exists with proper default

  2. Security
    - Maintain existing RLS policies
*/

-- First, let's make sure the status column exists
DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_logs' AND column_name = 'status'
  ) THEN
    ALTER TABLE import_logs ADD COLUMN status text DEFAULT 'pending';
  END IF;
END $$;

-- Drop all existing check constraints on the status column
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'import_logs'::regclass 
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE import_logs DROP CONSTRAINT ' || quote_ident(constraint_name);
    END LOOP;
END $$;

-- Add the correct status constraint
ALTER TABLE import_logs ADD CONSTRAINT import_logs_status_check 
CHECK (status IN ('pending', 'success', 'error', 'partial', 'cancelled'));

-- Update any existing records that might have invalid status values
UPDATE import_logs 
SET status = 'pending' 
WHERE status IS NULL OR status NOT IN ('pending', 'success', 'error', 'partial', 'cancelled');