/*
  # Configuration sécurisée des commandes

  1. Nouvelles Tables
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `total_amount` (numeric)
      - `status` (text)
      - `shipping_address` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `product_name` (text)
      - `quantity` (integer)
      - `unit_price` (numeric)
      - `size` (text)
      - `color` (text)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour la lecture et création des commandes
    - Aucune information de paiement n'est stockée
    - Validation des données avec des contraintes
*/

-- Table des commandes
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'shipped', 'cancelled')),
  shipping_address jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des articles de commande
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  size text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
    DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
    DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
    DROP POLICY IF EXISTS "Users can delete own orders" ON public.orders;
    DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
    DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Créer les nouvelles politiques
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

CREATE POLICY "Users can update own orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can create order items"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

-- Fonction pour mettre à jour le timestamp de mise à jour
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

-- Créer le trigger pour mettre à jour le timestamp
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour créer une commande complète
CREATE OR REPLACE FUNCTION create_order(
  p_user_id uuid,
  p_total_amount numeric,
  p_shipping_address jsonb,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
BEGIN
  -- Insérer la commande
  INSERT INTO public.orders (
    user_id,
    total_amount,
    shipping_address,
    status
  ) VALUES (
    p_user_id,
    p_total_amount,
    p_shipping_address,
    'pending'
  ) RETURNING id INTO v_order_id;

  -- Insérer les articles
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_name,
      quantity,
      unit_price,
      size,
      color
    ) VALUES (
      v_order_id,
      v_item->>'name',
      (v_item->>'quantity')::integer,
      (v_item->>'price')::numeric,
      v_item->>'size',
      v_item->>'color'
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;