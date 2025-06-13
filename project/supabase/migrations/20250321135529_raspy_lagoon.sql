/*
  # Ajout de la table pour les paniers utilisateurs

  1. Nouvelle Table
    - `user_carts`
      - `user_id` (uuid, primary key, references profiles)
      - `cart_data` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS
    - Politiques pour la lecture et mise à jour des paniers
*/

-- Création de la table user_carts
CREATE TABLE IF NOT EXISTS public.user_carts (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cart_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own cart" ON public.user_carts;
    DROP POLICY IF EXISTS "Users can update own cart" ON public.user_carts;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Créer les politiques
CREATE POLICY "Users can view own cart"
  ON public.user_carts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON public.user_carts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour mettre à jour le timestamp
CREATE OR REPLACE FUNCTION update_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour la mise à jour du timestamp
CREATE TRIGGER update_cart_timestamp
  BEFORE UPDATE ON public.user_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_updated_at();