/*
  # Fix import_logs table schema

  1. Table Updates
    - Ensure `import_logs` table has all required columns
    - Add missing columns if they don't exist
    - Set appropriate defaults and constraints

  2. Columns
    - `id` (uuid, primary key)
    - `supplier_id` (uuid, foreign key to suppliers)
    - `status` (text, default 'pending')
    - `started_at` (timestamptz, default now())
    - `completed_at` (timestamptz, nullable)
    - `products_total` (integer, default 0)
    - `products_created` (integer, default 0)
    - `products_updated` (integer, default 0)
    - `products_failed` (integer, default 0)
    - `error_message` (text, nullable)
    - `details` (jsonb, nullable)
    - `created_by` (uuid, nullable)
    - `created_at` (timestamptz, default now())
    - `updated_at` (timestamptz, default now())

  3. Security
    - Enable RLS on `import_logs` table
    - Add policies for admin access
*/

-- Create import_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error', 'partial', 'cancelled')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  products_total integer DEFAULT 0,
  products_created integer DEFAULT 0,
  products_updated integer DEFAULT 0,
  products_failed integer DEFAULT 0,
  error_message text,
  details jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Check and add completed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_logs' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE import_logs ADD COLUMN completed_at timestamptz;
  END IF;

  -- Check and add products_total column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_logs' AND column_name = 'products_total'
  ) THEN
    ALTER TABLE import_logs ADD COLUMN products_total integer DEFAULT 0;
  END IF;

  -- Check and add products_created column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_logs' AND column_name = 'products_created'
  ) THEN
    ALTER TABLE import_logs ADD COLUMN products_created integer DEFAULT 0;
  END IF;

  -- Check and add products_updated column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_logs' AND column_name = 'products_updated'
  ) THEN
    ALTER TABLE import_logs ADD COLUMN products_updated integer DEFAULT 0;
  END IF;

  -- Check and add products_failed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_logs' AND column_name = 'products_failed'
  ) THEN
    ALTER TABLE import_logs ADD COLUMN products_failed integer DEFAULT 0;
  END IF;

  -- Check and add error_message column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_logs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE import_logs ADD COLUMN error_message text;
  END IF;

  -- Check and add details column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_logs' AND column_name = 'details'
  ) THEN
    ALTER TABLE import_logs ADD COLUMN details jsonb;
  END IF;

  -- Check and add created_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_logs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE import_logs ADD COLUMN created_by uuid;
  END IF;

  -- Check and add status column with constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_logs' AND column_name = 'status'
  ) THEN
    ALTER TABLE import_logs ADD COLUMN status text DEFAULT 'pending';
  END IF;

  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'import_logs_status_check'
  ) THEN
    ALTER TABLE import_logs DROP CONSTRAINT import_logs_status_check;
  END IF;

  -- Add updated status constraint with 'cancelled' included
  ALTER TABLE import_logs ADD CONSTRAINT import_logs_status_check 
  CHECK (status IN ('pending', 'success', 'error', 'partial', 'cancelled'));
END $$;

-- Enable RLS
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can manage import logs" ON import_logs;

-- Create policy for admin access
CREATE POLICY "Admin users can manage import logs"
  ON import_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_import_logs_supplier_id ON import_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_started_at ON import_logs(started_at);