/*
  # Site Settings Table for Footer Configuration
  
  1. New Table
    - `site_settings`
      - Stores key-value pairs for site configuration
      - Supports different data types via JSONB
      - Includes metadata for admin UI
      
  2. Security
    - Enable RLS
    - Admin-only access for management
    - Public read access for frontend
*/

-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  label text NOT NULL,
  description text,
  type text NOT NULL,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage site settings"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  ));

CREATE POLICY "Anyone can read public site settings"
  ON public.site_settings
  FOR SELECT
  TO public
  USING (is_public = true);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_site_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_site_settings_timestamp
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_timestamp();

-- Insert default footer settings
INSERT INTO public.site_settings (key, label, description, type, value, is_public)
VALUES 
  ('company_description', 'Description de l''entreprise', 'Texte affiché dans le footer décrivant l''entreprise', 'textarea', 
   '"Votre destination pour des accessoires de mode élégants et raffinés."'::jsonb, true),
  
  ('about_links', 'Liens "À propos"', 'Liste des liens dans la section À propos', 'links', 
   '[{"name": "Robes", "url": "/vetements/robes"}, {"name": "Sacs", "url": "/sacs"}, {"name": "Accessoires", "url": "/accessoires"}, {"name": "Nouveautés", "url": "/nouveautes"}]'::jsonb, true),
  
  ('help_links', 'Liens "Service Client"', 'Liste des liens dans la section Service Client', 'links', 
   '[{"name": "Livraison", "url": "/livraison"}, {"name": "Retours & Échanges", "url": "/retours"}, {"name": "FAQ", "url": "/faq"}, {"name": "Contact", "url": "/contact"}, {"name": "Chèque Cadeau", "url": "/cheque-cadeau"}]'::jsonb, true),
  
  ('legal_links', 'Liens "Légal"', 'Liste des liens dans la section légale', 'links', 
   '[{"name": "Mentions légales", "url": "/mentions-legales"}, {"name": "Politique de confidentialité", "url": "/confidentialite"}, {"name": "CGV", "url": "/cgv"}]'::jsonb, true),
  
  ('social_links', 'Réseaux sociaux', 'Liste des liens vers les réseaux sociaux', 'social_links', 
   '[{"type": "facebook", "url": "https://facebook.com"}, {"type": "instagram", "url": "https://instagram.com"}, {"type": "twitter", "url": "https://twitter.com"}]'::jsonb, true),
  
  ('newsletter_enabled', 'Activer la newsletter', 'Afficher le formulaire d''inscription à la newsletter', 'boolean', 
   'true'::jsonb, true),
  
  ('newsletter_text', 'Texte de la newsletter', 'Texte affiché au-dessus du formulaire d''inscription', 'text', 
   '"Inscrivez-vous à notre newsletter pour recevoir nos dernières nouveautés et offres exclusives"'::jsonb, true),
  
  ('accepted_payments', 'Moyens de paiement acceptés', 'Liste des moyens de paiement affichés dans le footer', 'payment_methods', 
   '["visa", "mastercard", "paypal", "applepay"]'::jsonb, true),
  
  ('show_language_selector', 'Afficher le sélecteur de langue', 'Afficher ou masquer le sélecteur de langue dans le footer', 'boolean', 
   'true'::jsonb, true),
  
  ('show_country_selector', 'Afficher le sélecteur de pays', 'Afficher ou masquer le sélecteur de pays dans le footer', 'boolean', 
   'true'::jsonb, true),
   
  ('footer_copyright', 'Texte de copyright', 'Texte de copyright affiché dans le footer', 'text', 
   '"© 2024 Aquatiss Chérie. Tous droits réservés."'::jsonb, true)
ON CONFLICT (key) DO UPDATE
SET 
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  is_public = EXCLUDED.is_public;

-- Grant necessary permissions
GRANT ALL ON public.site_settings TO authenticated;
GRANT SELECT ON public.site_settings TO anon;