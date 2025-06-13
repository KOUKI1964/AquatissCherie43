/*
  # Add delivery_time column to suppliers table

  1. Changes
    - Add `delivery_time` column to `suppliers` table
      - Type: text
      - Nullable: true
      - Default: null
      - Description: Stores the delivery time information for suppliers

  2. Notes
    - The column is made nullable since existing suppliers won't have this information
    - No data migration is needed as this is a new column
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND column_name = 'delivery_time'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN delivery_time text;
  END IF;
END $$;