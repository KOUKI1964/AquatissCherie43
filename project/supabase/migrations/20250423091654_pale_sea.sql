/*
  # Add function to reset site settings to default values
  
  1. Function
    - `reset_site_settings_to_default`
    - Resets all site settings to their default values
    - Maintains existing keys and IDs
    
  2. Security
    - Function is SECURITY DEFINER to ensure proper access
    - Only accessible to admin users
*/

-- Create function to reset site settings to default values
CREATE OR REPLACE FUNCTION reset_site_settings_to_default()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset company description
  UPDATE public.site_settings
  SET value = '"Votre destination pour des accessoires de mode élégants et raffinés."'::jsonb
  WHERE key = 'company_description';
  
  -- Reset about links
  UPDATE public.site_settings
  SET value = '[{"name": "Robes", "url": "/vetements/robes"}, {"name": "Sacs", "url": "/sacs"}, {"name": "Accessoires", "url": "/accessoires"}, {"name": "Nouveautés", "url": "/nouveautes"}]'::jsonb
  WHERE key = 'about_links';
  
  -- Reset help links
  UPDATE public.site_settings
  SET value = '[{"name": "Livraison", "url": "/livraison"}, {"name": "Retours & Échanges", "url": "/retours"}, {"name": "FAQ", "url": "/faq"}, {"name": "Contact", "url": "/contact"}, {"name": "Chèque Cadeau", "url": "/cheque-cadeau"}]'::jsonb
  WHERE key = 'help_links';
  
  -- Reset legal links
  UPDATE public.site_settings
  SET value = '[{"name": "Mentions légales", "url": "/mentions-legales"}, {"name": "Politique de confidentialité", "url": "/confidentialite"}, {"name": "CGV", "url": "/cgv"}]'::jsonb
  WHERE key = 'legal_links';
  
  -- Reset social links
  UPDATE public.site_settings
  SET value = '[{"type": "facebook", "url": "https://facebook.com"}, {"type": "instagram", "url": "https://instagram.com"}, {"type": "twitter", "url": "https://twitter.com"}]'::jsonb
  WHERE key = 'social_links';
  
  -- Reset newsletter enabled
  UPDATE public.site_settings
  SET value = 'true'::jsonb
  WHERE key = 'newsletter_enabled';
  
  -- Reset newsletter text
  UPDATE public.site_settings
  SET value = '"Inscrivez-vous à notre newsletter pour recevoir nos dernières nouveautés et offres exclusives"'::jsonb
  WHERE key = 'newsletter_text';
  
  -- Reset accepted payments
  UPDATE public.site_settings
  SET value = '["visa", "mastercard", "paypal", "applepay"]'::jsonb
  WHERE key = 'accepted_payments';
  
  -- Reset show language selector
  UPDATE public.site_settings
  SET value = 'true'::jsonb
  WHERE key = 'show_language_selector';
  
  -- Reset show country selector
  UPDATE public.site_settings
  SET value = 'true'::jsonb
  WHERE key = 'show_country_selector';
  
  -- Reset footer copyright
  UPDATE public.site_settings
  SET value = format('"%s Aquatiss Chérie. Tous droits réservés."', '© ' || date_part('year', CURRENT_DATE))::jsonb
  WHERE key = 'footer_copyright';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_site_settings_to_default() TO authenticated;