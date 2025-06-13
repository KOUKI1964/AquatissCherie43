/*
  # Mise à jour des politiques de sécurité pour les produits

  1. Modifications
    - Suppression des politiques existantes si elles existent
    - Recréation des politiques avec vérification préalable
    - Maintien de la sécurité RLS
*/

-- Supprimer les politiques existantes en toute sécurité
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage product categories" ON public.product_categories;
    DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
    DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
    DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
    DROP POLICY IF EXISTS "Admins can manage promotions" ON public.product_promotions;
    DROP POLICY IF EXISTS "Admins can view audit log" ON public.product_audit_log;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Créer les nouvelles politiques
DO $$ 
BEGIN
    -- Vérifier et créer la politique pour les catégories
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'product_categories' 
        AND policyname = 'Admins can manage product categories'
    ) THEN
        CREATE POLICY "Admins can manage product categories"
        ON public.product_categories
        FOR ALL
        TO authenticated
        USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));
    END IF;

    -- Vérifier et créer la politique pour les produits
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'products' 
        AND policyname = 'Admins can manage products'
    ) THEN
        CREATE POLICY "Admins can manage products"
        ON public.products
        FOR ALL
        TO authenticated
        USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));
    END IF;

    -- Vérifier et créer la politique pour les images
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'product_images' 
        AND policyname = 'Admins can manage product images'
    ) THEN
        CREATE POLICY "Admins can manage product images"
        ON public.product_images
        FOR ALL
        TO authenticated
        USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));
    END IF;

    -- Vérifier et créer la politique pour les variantes
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'product_variants' 
        AND policyname = 'Admins can manage product variants'
    ) THEN
        CREATE POLICY "Admins can manage product variants"
        ON public.product_variants
        FOR ALL
        TO authenticated
        USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));
    END IF;

    -- Vérifier et créer la politique pour les promotions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'product_promotions' 
        AND policyname = 'Admins can manage promotions'
    ) THEN
        CREATE POLICY "Admins can manage promotions"
        ON public.product_promotions
        FOR ALL
        TO authenticated
        USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));
    END IF;

    -- Vérifier et créer la politique pour l'audit log
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'product_audit_log' 
        AND policyname = 'Admins can view audit log'
    ) THEN
        CREATE POLICY "Admins can view audit log"
        ON public.product_audit_log
        FOR ALL
        TO authenticated
        USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));
    END IF;
END $$;