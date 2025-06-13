/*
  # Ajout des champs téléphone et adresse

  1. Modifications
    - Ajout de la colonne `phone` (text, nullable)
    - Ajout de la colonne `address` (text, nullable)
    à la table `profiles`

  2. Notes
    - Les deux champs sont optionnels
*/

DO $$ 
BEGIN
  -- Ajout de la colonne phone si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN phone text;
  END IF;

  -- Ajout de la colonne address si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'address'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN address text;
  END IF;
END $$;