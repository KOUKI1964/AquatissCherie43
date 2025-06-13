/*
  # Ajout du compteur d'achats

  1. Modifications
    - Ajout de la colonne `purchases_count` (integer) à la table profiles
    - Valeur par défaut à 0
    - Non nullable
*/

DO $$ 
BEGIN
  -- Ajout de la colonne purchases_count si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'purchases_count'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN purchases_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;