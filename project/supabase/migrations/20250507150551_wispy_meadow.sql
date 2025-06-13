/*
  # Add Banners Management System
  
  1. New Table
    - `site_banners`
      - Stores banner information for different pages
      - Supports multiple banner types and locations
      - Includes scheduling functionality
      
  2. Security
    - Enable RLS
    - Admin-only access for management
    - Public read access for active banners
*/

-- Create site_banners table
CREATE TABLE IF NOT EXISTS public.site_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  image_url text,
  link_url text,
  location text NOT NULL,
  type text NOT NULL,
  is_active boolean DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage banners"
  ON public.site_banners
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  ));

CREATE POLICY "Anyone can view active banners"
  ON public.site_banners
  FOR SELECT
  TO public
  USING (
    is_active = true AND
    (start_date IS NULL OR start_date <= now()) AND
    (end_date IS NULL OR end_date >= now())
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_site_banners_location ON public.site_banners(location);
CREATE INDEX IF NOT EXISTS idx_site_banners_is_active ON public.site_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_site_banners_dates ON public.site_banners(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_site_banners_priority ON public.site_banners(priority);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_site_banners_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_site_banners_timestamp
  BEFORE UPDATE ON public.site_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_site_banners_timestamp();

-- Insert sample banners
INSERT INTO public.site_banners (
  title, 
  content, 
  image_url, 
  link_url, 
  location, 
  type, 
  is_active, 
  start_date, 
  end_date, 
  priority
)
VALUES 
  (
    'Collection Printemps 2025', 
    'Découvrez notre nouvelle collection d''accessoires élégants pour sublimer votre style', 
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80', 
    '/nouveautes', 
    'home_hero', 
    'full_width', 
    true, 
    '2025-03-01', 
    '2025-06-30', 
    10
  ),
  (
    'Soldes d''été', 
    'Jusqu''à 50% de réduction sur une sélection d''articles', 
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80', 
    '/soldes', 
    'home_secondary', 
    'card', 
    true, 
    '2025-06-01', 
    '2025-07-31', 
    5
  ),
  (
    'Livraison gratuite', 
    'Pour toute commande supérieure à 50€', 
    'https://images.unsplash.com/photo-1586769852836-bc069f19e1be?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80', 
    '/livraison', 
    'cart_page', 
    'notification', 
    true, 
    NULL, 
    NULL, 
    1
  )
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON public.site_banners TO authenticated;
GRANT SELECT ON public.site_banners TO anon;