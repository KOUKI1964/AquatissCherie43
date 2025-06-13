/*
  # Mise à jour de la table discount_keys_usage
  
  1. Modifications
    - Mise à jour des références à la colonne code supprimée
    - Ajout d'une colonne pour stocker l'ID de la clé de réduction
    - Mise à jour des contraintes et index
    
  2. Sécurité
    - Maintien des politiques RLS
*/

-- Ajouter une colonne pour stocker l'ID de la clé de réduction
ALTER TABLE public.discount_keys_usage
ADD COLUMN IF NOT EXISTS discount_key_id uuid REFERENCES public.discount_keys(id);

-- Mettre à jour les politiques RLS
DO $$ 
BEGIN
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
GRANT ALL ON public.discount_keys_usage TO authenticated;