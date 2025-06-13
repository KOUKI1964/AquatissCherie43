/*
  # Ajout des tables et fonctions pour la gestion des commandes

  1. Nouvelles Tables
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `total_amount` (numeric)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Fonctions
    - `increment_user_purchases`: Incrémente le compteur d'achats du profil
    - `handle_new_order`: Met à jour le compteur lors d'une nouvelle commande

  3. Sécurité
    - Enable RLS sur la table orders
    - Politiques pour la lecture et création des commandes
*/

-- Création de la table orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour incrémenter le compteur d'achats
CREATE OR REPLACE FUNCTION increment_user_purchases()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET purchases_count = purchases_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour le compteur lors d'une nouvelle commande
CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_user_purchases();