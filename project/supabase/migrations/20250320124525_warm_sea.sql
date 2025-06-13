/*
  # Ajout des champs nom et prénom

  1. Modifications
    - Ajout de la colonne `first_name` (text, nullable: false)
    - Ajout de la colonne `last_name` (text, nullable: true)
    à la table `profiles`

  2. Notes
    - Le prénom est obligatoire
    - Le nom est facultatif
*/

DO $$ 
BEGIN
  -- Ajout de la colonne first_name si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN first_name text NOT NULL DEFAULT '';
  END IF;

  -- Ajout de la colonne last_name si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN last_name text;
  END IF;
END $$;