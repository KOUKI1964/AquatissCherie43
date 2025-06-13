/*
  # Add API key column to suppliers table

  1. Changes
    - Add `api_key` column to `suppliers` table to store API authentication credentials
    - Column is nullable since not all suppliers will have API integration
    - Add comment to document the column's purpose

  2. Security
    - No changes to RLS policies needed
    - Existing admin-only access control remains in place
*/

ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS api_key TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mode TEXT CHECK (mode IN ('test', 'production')) DEFAULT NULL;

COMMENT ON COLUMN suppliers.api_key IS 'API authentication key for supplier integration';
COMMENT ON COLUMN suppliers.sync_enabled IS 'Whether automatic synchronization is enabled for this supplier';
COMMENT ON COLUMN suppliers.mode IS 'API integration mode (test or production)';