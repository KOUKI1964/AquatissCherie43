/*
  # Suppression du code aléatoire des clés de réduction
  
  1. Modifications
    - Suppression de la colonne 'code' de la table discount_keys
    - Suppression des fonctions et triggers de génération de code
    - Mise à jour des contraintes et index
    
  2. Sécurité
    - Maintien des politiques RLS
*/

-- Supprimer le trigger de génération de code
DROP TRIGGER IF EXISTS generate_discount_key_code ON public.discount_keys;

-- Supprimer les fonctions de génération de code
DROP FUNCTION IF EXISTS handle_new_discount_key();
DROP FUNCTION IF EXISTS generate_discount_key_code();

-- Supprimer la contrainte d'unicité sur le code
ALTER TABLE public.discount_keys
DROP CONSTRAINT IF EXISTS discount_keys_code_unique;

-- Supprimer les index liés au code
DROP INDEX IF EXISTS idx_discount_keys_code;

-- Supprimer la colonne code
ALTER TABLE public.discount_keys
DROP COLUMN IF EXISTS code;

-- Mettre à jour les politiques RLS pour s'assurer qu'elles fonctionnent toujours
DO $$ 
BEGIN
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
END $$;

-- Accorder les permissions nécessaires
GRANT ALL ON public.discount_keys TO authenticated;