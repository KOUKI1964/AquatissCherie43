/*
  # Création de la table des clés de réduction

  1. Nouvelle Table
    - `discount_keys`
      - `code` (text, primary key)
      - `type` (text) : 'silver', 'bronze', 'gold'
      - `percentage` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `used_at` (timestamptz)

  2. Sécurité
    - Enable RLS
    - Politiques pour les administrateurs
*/

-- Création de la table des clés de réduction
CREATE TABLE IF NOT EXISTS public.discount_keys (
  code text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('silver', 'bronze', 'gold')),
  percentage integer NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.discount_keys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage discount keys"
  ON public.discount_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_discount_keys_type ON public.discount_keys(type);
CREATE INDEX IF NOT EXISTS idx_discount_keys_is_active ON public.discount_keys(is_active);

-- Fonction pour vérifier si une clé est valide
CREATE OR REPLACE FUNCTION check_discount_key(key_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'valid', true,
    'type', type,
    'percentage', percentage
  )
  INTO key_data
  FROM public.discount_keys
  WHERE code = key_code
  AND is_active = true
  AND used_at IS NULL;

  IF key_data IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN key_data;
END;
$$;