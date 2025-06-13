/*
  # Complete Supplier Schema
  
  1. Changes
    - Ensure all supplier fields exist across all categories:
      - General Information
      - Shipping/Delivery
      - Commercial Information
      - API Integration
    - Add missing columns with appropriate data types
    - Add comments for better documentation
    
  2. Structure
    - Uses DO block to safely check for column existence
    - Adds appropriate constraints and defaults
    - Maintains backward compatibility
*/

DO $$ 
BEGIN
  -- General Information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND column_name = 'terms_conditions'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN terms_conditions text;
  END IF;

  -- Shipping/Delivery Information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND column_name = 'delivery_time'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN delivery_time text;
  END IF;

  -- Commercial Information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND column_name = 'webhook_url'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN webhook_url text;
  END IF;

  -- API Integration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND column_name = 'api_key'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN api_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND column_name = 'sync_enabled'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN sync_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND column_name = 'mode'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN mode text CHECK (mode IN ('test', 'production'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND column_name = 'contact_support'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN contact_support text;
  END IF;
END $$;

-- Add comments to columns for better documentation
COMMENT ON COLUMN suppliers.api_key IS 'API authentication key for supplier integration';
COMMENT ON COLUMN suppliers.sync_enabled IS 'Whether automatic synchronization is enabled for this supplier';
COMMENT ON COLUMN suppliers.mode IS 'API integration mode (test or production)';
COMMENT ON COLUMN suppliers.contact_support IS 'Contact support information for the supplier';
COMMENT ON COLUMN suppliers.delivery_time IS 'Estimated delivery time from this supplier';
COMMENT ON COLUMN suppliers.webhook_url IS 'URL for receiving webhook notifications from the supplier';
COMMENT ON COLUMN suppliers.terms_conditions IS 'Terms and conditions for working with this supplier';

-- Create index for better performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_suppliers_sync_enabled ON suppliers(sync_enabled) WHERE sync_enabled = true;