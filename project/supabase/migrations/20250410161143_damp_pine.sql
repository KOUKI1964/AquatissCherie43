/*
  # Correction de la génération des clés de réduction
  
  1. Modifications
    - Ajout d'une fonction pour générer un code unique
    - Ajout d'un trigger pour générer automatiquement le code lors de l'insertion
    - Mise à jour de la structure de la table pour permettre l'insertion sans code
    
  2. Sécurité
    - Maintien des politiques RLS
    - Validation des données
*/

-- Modifier la contrainte de clé primaire pour permettre la génération automatique
ALTER TABLE public.discount_keys 
DROP CONSTRAINT IF EXISTS discount_keys_pkey;

-- Ajouter une colonne id si elle n'existe pas déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discount_keys'
    AND column_name = 'id'
  ) THEN
    ALTER TABLE public.discount_keys
    ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;
  END IF;
END $$;

-- Fonction pour générer un code de réduction unique
CREATE OR REPLACE FUNCTION generate_discount_key_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
  attempts integer := 0;
  max_attempts integer := 100;
BEGIN
  LOOP
    -- Générer un code aléatoire à 6 caractères alphanumériques
    new_code := '';
    FOR i IN 1..6 LOOP
      -- Utiliser des caractères alphanumériques (0-9, A-Z)
      new_code := new_code || substring('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', floor(random() * 36 + 1)::integer, 1);
    END LOOP;
    
    -- Vérifier si le code existe déjà
    SELECT EXISTS (
      SELECT 1 FROM discount_keys WHERE code = new_code
    ) INTO code_exists;
    
    -- Sortir si le code est unique ou après trop de tentatives
    EXIT WHEN NOT code_exists OR attempts >= max_attempts;
    attempts := attempts + 1;
  END LOOP;
  
  IF attempts >= max_attempts THEN
    RAISE EXCEPTION 'Impossible de générer un code unique après % tentatives', max_attempts;
  END IF;
  
  RETURN new_code;
END;
$$;

-- Trigger pour générer automatiquement le code
CREATE OR REPLACE FUNCTION handle_new_discount_key()
RETURNS TRIGGER AS $$
BEGIN
  -- Générer un code unique si aucun n'est fourni
  IF NEW.code IS NULL THEN
    NEW.code := generate_discount_key_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS generate_discount_key_code ON public.discount_keys;

-- Créer le trigger
CREATE TRIGGER generate_discount_key_code
  BEFORE INSERT ON public.discount_keys
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_discount_key();

-- Ajouter une contrainte d'unicité sur le code
ALTER TABLE public.discount_keys
ADD CONSTRAINT discount_keys_code_unique UNIQUE (code);

-- Mettre à jour les politiques RLS
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