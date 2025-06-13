/*
  # Add contact support column to suppliers table

  1. Changes
    - Add `contact_support` column to `suppliers` table
      - Type: TEXT
      - Nullable: true
      - Description: Contact support information for the supplier

  2. Notes
    - This column is used to store additional contact information for supplier support
    - The column is nullable since not all suppliers may have dedicated support contacts
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND column_name = 'contact_support'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN contact_support TEXT;
  END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN suppliers.contact_support IS 'Contact support information for the supplier';