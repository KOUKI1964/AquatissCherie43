/*
  # Configuration des tables pour la gestion des produits

  1. Nouvelles Tables
    - `products`
      - Informations de base des produits
      - Gestion des stocks et prix
      - Métadonnées SEO
    - `product_categories`
      - Hiérarchie des catégories
    - `product_images`
      - Images multiples par produit
    - `product_variants`
      - Variantes (taille, couleur)
    - `product_promotions`
      - Gestion des promotions
    - `product_audit_log`
      - Historique des modifications

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour les administrateurs
*/

-- Table des catégories de produits
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  parent_id uuid REFERENCES public.product_categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Table des produits
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  sku text UNIQUE NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  sale_price numeric CHECK (sale_price >= 0 AND sale_price <= price),
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  category_id uuid REFERENCES public.product_categories(id),
  seo_title text,
  seo_description text,
  seo_keywords text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Table des images de produits
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Table des variantes de produits
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  sale_price numeric CHECK (sale_price >= 0 AND sale_price <= price),
  stock_quantity integer NOT NULL DEFAULT 0,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Table des promotions
CREATE TABLE IF NOT EXISTS public.product_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  applies_to jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Table d'historique des modifications
CREATE TABLE IF NOT EXISTS public.product_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  changes jsonb NOT NULL,
  performed_at timestamptz DEFAULT now(),
  performed_by uuid REFERENCES auth.users(id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.product_audit_log(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies pour les administrateurs
CREATE POLICY "Admins can manage product categories"
  ON public.product_categories
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Admins can manage products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Admins can manage product images"
  ON public.product_images
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Admins can manage product variants"
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Admins can manage promotions"
  ON public.product_promotions
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Admins can view audit log"
  ON public.product_audit_log
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));

-- Fonction pour générer un slug unique
CREATE OR REPLACE FUNCTION generate_unique_slug(input_text text, table_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    base_slug text;
    new_slug text;
    counter integer := 1;
BEGIN
    -- Convertir en minuscules et remplacer les caractères spéciaux
    base_slug := lower(regexp_replace(input_text, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Supprimer les tirets au début et à la fin
    base_slug := trim(both '-' from base_slug);
    
    new_slug := base_slug;
    
    -- Vérifier si le slug existe déjà
    WHILE EXISTS (
        SELECT 1 
        FROM (
            SELECT slug FROM products WHERE slug = new_slug
            UNION
            SELECT slug FROM product_categories WHERE slug = new_slug
        ) existing_slugs
    ) LOOP
        counter := counter + 1;
        new_slug := base_slug || '-' || counter::text;
    END LOOP;
    
    RETURN new_slug;
END;
$$;

-- Fonction pour enregistrer les modifications
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    changes jsonb;
    entity_type text;
BEGIN
    entity_type := TG_TABLE_NAME;
    
    IF TG_OP = 'UPDATE' THEN
        changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW)
        );
    ELSIF TG_OP = 'INSERT' THEN
        changes := jsonb_build_object(
            'new', row_to_json(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        changes := jsonb_build_object(
            'old', row_to_json(OLD)
        );
    END IF;
    
    INSERT INTO product_audit_log (
        entity_type,
        entity_id,
        action,
        changes,
        performed_by
    ) VALUES (
        entity_type,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        TG_OP,
        changes,
        auth.uid()
    );
    
    RETURN NULL;
END;
$$;

-- Triggers pour l'historique des modifications
CREATE TRIGGER log_product_changes
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION log_product_changes();

CREATE TRIGGER log_category_changes
    AFTER INSERT OR UPDATE OR DELETE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION log_product_changes();

CREATE TRIGGER log_variant_changes
    AFTER INSERT OR UPDATE OR DELETE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION log_product_changes();

CREATE TRIGGER log_promotion_changes
    AFTER INSERT OR UPDATE OR DELETE ON product_promotions
    FOR EACH ROW
    EXECUTE FUNCTION log_product_changes();