-- Create product_media table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.product_media (
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  media_id uuid REFERENCES public.media_files(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (product_id, media_id)
);

-- Enable RLS
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_media_product ON public.product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_sort ON public.product_media(sort_order);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can manage product media" ON public.product_media;

-- Create policy
CREATE POLICY "Admins can manage product media"
  ON public.product_media
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id = auth.uid()
  ));

-- Function to handle primary media
CREATE OR REPLACE FUNCTION handle_primary_media()
RETURNS trigger AS $$
BEGIN
  -- If this media is being set as primary, unset primary for other media
  IF NEW.is_primary THEN
    UPDATE public.product_media
    SET is_primary = false
    WHERE product_id = NEW.product_id
    AND media_id != NEW.media_id;
  END IF;

  -- Ensure at least one primary image exists
  IF NOT EXISTS (
    SELECT 1 FROM public.product_media
    WHERE product_id = NEW.product_id
    AND is_primary = true
  ) THEN
    -- Make this media primary if it's the first one
    NEW.is_primary := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for primary media handling
DROP TRIGGER IF EXISTS handle_primary_media_trigger ON public.product_media;
CREATE TRIGGER handle_primary_media_trigger
  BEFORE INSERT OR UPDATE ON public.product_media
  FOR EACH ROW
  EXECUTE FUNCTION handle_primary_media();

-- Function to maintain sort order
CREATE OR REPLACE FUNCTION maintain_media_sort_order()
RETURNS trigger AS $$
BEGIN
  -- Update sort order for remaining media after deletion
  IF TG_OP = 'DELETE' THEN
    UPDATE public.product_media
    SET sort_order = subquery.new_order
    FROM (
      SELECT pm.media_id, ROW_NUMBER() OVER (
        PARTITION BY pm.product_id 
        ORDER BY pm.sort_order
      ) - 1 as new_order
      FROM public.product_media pm
      WHERE pm.product_id = OLD.product_id
    ) as subquery
    WHERE product_id = OLD.product_id
    AND media_id = subquery.media_id;
    
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for maintaining sort order
DROP TRIGGER IF EXISTS maintain_sort_order_trigger ON public.product_media;
CREATE TRIGGER maintain_sort_order_trigger
  AFTER DELETE ON public.product_media
  FOR EACH ROW
  EXECUTE FUNCTION maintain_media_sort_order();

-- Create views for easier querying
CREATE OR REPLACE VIEW public.product_media_view AS
SELECT 
  pm.product_id,
  pm.media_id,
  pm.sort_order,
  pm.is_primary,
  pm.created_at,
  mf.name as media_name,
  mf.url as media_url,
  mf.file_type,
  mf.mime_type
FROM public.product_media pm
JOIN public.media_files mf ON mf.id = pm.media_id;

-- Grant access to the view
GRANT SELECT ON public.product_media_view TO authenticated;