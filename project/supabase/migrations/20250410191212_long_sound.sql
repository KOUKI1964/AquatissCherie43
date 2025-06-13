/*
  # Suppression du système de génération aléatoire des clés de réduction
  
  1. Changements
    - Suppression des fonctions et triggers de génération de code
    - Conservation uniquement du système basé sur les identifiants utilisateur
    - Mise à jour des tables et relations
    
  2. Sécurité
    - Maintien des politiques RLS
    - Préservation des relations entre tables
*/

-- Supprimer le trigger de génération de code s'il existe
DROP TRIGGER IF EXISTS generate_discount_key_code ON public.discount_keys;

-- Supprimer les fonctions de génération de code
DROP FUNCTION IF EXISTS handle_new_discount_key();
DROP FUNCTION IF EXISTS generate_discount_key_code();

-- Vérifier si la colonne code existe et la supprimer
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discount_keys'
    AND column_name = 'code'
  ) THEN
    -- Supprimer les contraintes liées au code
    ALTER TABLE public.discount_keys
    DROP CONSTRAINT IF EXISTS discount_keys_code_unique;
    
    -- Supprimer la colonne code
    ALTER TABLE public.discount_keys
    DROP COLUMN code;
  END IF;
END $$;

-- Supprimer les index liés au code s'ils existent
DROP INDEX IF EXISTS idx_discount_keys_code;

-- S'assurer que la table discount_keys_usage a une référence à discount_keys
ALTER TABLE public.discount_keys_usage
ADD COLUMN IF NOT EXISTS discount_key_id uuid REFERENCES public.discount_keys(id);

-- Mettre à jour les politiques RLS pour s'assurer qu'elles fonctionnent toujours
DO $$ 
BEGIN
  -- Politiques pour discount_keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'discount_keys' 
    AND policyname = 'Admins can manage discount keys'
  ) THEN
    CREATE POLICY "Admins can manage discount keys"
      ON public.discount_keys
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.id = auth.uid()
      ));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'discount_keys' 
    AND policyname = 'Anyone can view active discount keys'
  ) THEN
    CREATE POLICY "Anyone can view active discount keys"
      ON public.discount_keys
      FOR SELECT
      TO public
      USING (is_active = true);
  END IF;
  
  -- Politiques pour discount_keys_usage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'discount_keys_usage' 
    AND policyname = 'Users can view own discount key usage'
  ) THEN
    CREATE POLICY "Users can view own discount key usage"
      ON public.discount_keys_usage
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id OR 
        auth.uid() = partner_id
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'discount_keys_usage' 
    AND policyname = 'Users can create discount key usage'
  ) THEN
    CREATE POLICY "Users can create discount key usage"
      ON public.discount_keys_usage
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Accorder les permissions nécessaires
GRANT ALL ON public.discount_keys TO authenticated;
GRANT ALL ON public.discount_keys_usage TO authenticated;