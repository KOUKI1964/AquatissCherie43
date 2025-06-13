/*
  # Create Import Logs Table for Product Synchronization
  
  1. New Table
    - `import_logs`
      - Tracks product import operations
      - Records success/failure status
      - Stores detailed statistics and error messages
      
  2. Security
    - Enable RLS
    - Admin-only access for management
*/

-- Create import_logs table
CREATE TABLE IF NOT EXISTS public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'error', 'partial')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  products_total integer DEFAULT 0,
  products_created integer DEFAULT 0,
  products_updated integer DEFAULT 0,
  products_failed integer DEFAULT 0,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage import logs"
  ON public.import_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_import_logs_supplier_id ON public.import_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON public.import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_started_at ON public.import_logs(started_at);

-- Grant necessary permissions
GRANT ALL ON public.import_logs TO authenticated;