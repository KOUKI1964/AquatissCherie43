/*
  # Suppliers Management System

  1. New Table
    - `suppliers`
      - Core supplier information
      - Shipping and logistics details
      - Commercial relationship data
      - Automatic code generation

  2. Product Integration
    - Add supplier_code to products
    - Synchronization between suppliers and products
    - Validation and constraints
*/

-- Création de la table des fournisseurs
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('local', 'dropshipping', 'mixte')),
  is_active boolean NOT NULL DEFAULT true,
  country text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  contact_name text NOT NULL,
  
  -- Informations de livraison
  shipping_method text,
  processing_time integer,
  shipping_zones text[],
  shipping_fee_type text CHECK (shipping_fee_type IN ('fixed', 'variable')),
  shipping_fee numeric,
  return_policy text,
  
  -- Informations commerciales
  has_connected_catalog boolean DEFAULT false,
  import_method text,
  api_url text,
  pricing_method text CHECK (pricing_method IN ('fixed', 'percentage', 'special')),
  includes_vat boolean DEFAULT true,
  recommended_margin numeric,
  has_supplier_discount boolean DEFAULT false,
  discount_percentage numeric,
  has_contract boolean DEFAULT false,
  has_local_stock boolean DEFAULT false,
  minimum_order numeric DEFAULT 0,
  payment_methods text[],
  
  -- Métadonnées
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  supplier_code text
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON public.suppliers(type);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_country ON public.suppliers(country);

-- Vérifier si la politique existe déjà avant de la créer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'suppliers' 
    AND policyname = 'Admins can manage suppliers'
  ) THEN
    CREATE POLICY "Admins can manage suppliers"
      ON public.suppliers
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.id = auth.uid()
      ));
  END IF;
END
$$;

-- Fonction pour générer un code fournisseur unique à 3 chiffres
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code text;
  code_exists boolean;
  attempts integer := 0;
  max_attempts integer := 100;
BEGIN
  LOOP
    -- Générer un code à 3 chiffres
    new_code := lpad(floor(random() * 900 + 100)::text, 3, '0');
    
    -- Vérifier si le code existe déjà
    SELECT EXISTS (
      SELECT 1 FROM suppliers WHERE supplier_code = new_code
    ) INTO code_exists;
    
    -- Sortir si le code est unique ou après trop de tentatives
    EXIT WHEN NOT code_exists OR attempts >= max_attempts;
    attempts := attempts + 1;
  END LOOP;
  
  IF attempts >= max_attempts THEN
    RAISE EXCEPTION 'Impossible de générer un code fournisseur unique après % tentatives', max_attempts;
  END IF;
  
  NEW.supplier_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour générer automatiquement le code fournisseur
DROP TRIGGER IF EXISTS generate_supplier_code_trigger ON public.suppliers;
CREATE TRIGGER generate_supplier_code_trigger
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW
  WHEN (NEW.supplier_code IS NULL)
  EXECUTE FUNCTION generate_supplier_code();

-- Ajouter une colonne supplier_code aux produits s'ils n'en ont pas déjà une
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS supplier_code text;

-- Créer un index pour la recherche par code fournisseur
CREATE INDEX IF NOT EXISTS idx_products_supplier_code ON public.products(supplier_code);

-- Fonction pour synchroniser le code fournisseur sur les produits
CREATE OR REPLACE FUNCTION sync_supplier_code_on_products()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le code fournisseur a changé, mettre à jour tous les produits associés
  IF NEW.supplier_code != OLD.supplier_code THEN
    UPDATE products
    SET supplier_code = NEW.supplier_code
    WHERE supplier_code = OLD.supplier_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour synchroniser le code fournisseur
DROP TRIGGER IF EXISTS sync_supplier_code_on_products_trigger ON public.suppliers;
CREATE TRIGGER sync_supplier_code_on_products_trigger
  AFTER UPDATE OF supplier_code ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION sync_supplier_code_on_products();

-- Fonction pour synchroniser le code fournisseur sur les produits
CREATE OR REPLACE FUNCTION sync_supplier_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le produit a un code fournisseur, vérifier qu'il existe
  IF NEW.supplier_code IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM suppliers WHERE supplier_code = NEW.supplier_code
    ) THEN
      RAISE EXCEPTION 'Le code fournisseur % n''existe pas', NEW.supplier_code;
    END IF;
    
    -- Synchroniser le champ supplierCode avec supplier_code
    NEW."supplierCode" := NEW.supplier_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour synchroniser le code fournisseur
DROP TRIGGER IF EXISTS sync_supplier_code_trigger ON public.products;
CREATE TRIGGER sync_supplier_code_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION sync_supplier_code();

-- Ajouter une contrainte pour le format du code fournisseur
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_supplier_code_format'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT check_supplier_code_format
    CHECK (supplier_code ~ '^[0-9]{3}$');
  END IF;
END
$$;

-- Vérifier si la contrainte d'unicité existe déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_supplier_code_key'
  ) THEN
    -- Ajouter une contrainte d'unicité pour le code fournisseur
    ALTER TABLE public.products
    ADD CONSTRAINT products_supplier_code_key UNIQUE (supplier_code);
  END IF;
END
$$;

-- Ajouter une colonne supplierCode pour compatibilité avec certains systèmes
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS "supplierCode" varchar(3);

-- Ajouter un commentaire à la colonne séparément
COMMENT ON COLUMN public.products."supplierCode" IS 'Code fournisseur du produit (3 chiffres)';

-- Créer un index pour la recherche par supplierCode
CREATE UNIQUE INDEX IF NOT EXISTS suppliercode_unique ON public.products("supplierCode");