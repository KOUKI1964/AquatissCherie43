/*
  # Mise à jour de la génération des identifiants utilisateurs

  1. Modifications
    - Nouvelle fonction de génération d'identifiants respectant les contraintes
    - Vérification des 4 premiers et 4 derniers chiffres
    - Garantie d'unicité
    - Performance optimisée

  2. Sécurité
    - Identifiants non prévisibles
    - Validation des contraintes
*/

-- Fonction pour vérifier si un identifiant respecte les contraintes
CREATE OR REPLACE FUNCTION check_identifier_constraints(
  new_id text,
  prev_id text,
  next_id text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si pas d'identifiants précédent/suivant, les contraintes sont respectées
  IF prev_id IS NULL AND next_id IS NULL THEN
    RETURN true;
  END IF;

  -- Vérifier les 4 premiers chiffres avec l'identifiant précédent
  IF prev_id IS NOT NULL AND 
     substring(new_id, 1, 4) = substring(prev_id, 1, 4) THEN
    RETURN false;
  END IF;

  -- Vérifier les 4 derniers chiffres avec l'identifiant suivant
  IF next_id IS NOT NULL AND 
     substring(new_id, 5, 4) = substring(next_id, 5, 4) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Fonction pour générer un identifiant unique respectant les contraintes
CREATE OR REPLACE FUNCTION generate_unique_user_identifier()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    new_id text;
    prev_id text;
    next_id text;
    attempts integer := 0;
    max_attempts integer := 100;
    found boolean := false;
BEGIN
    WHILE NOT found AND attempts < max_attempts LOOP
        -- Générer un nombre aléatoire à 8 chiffres
        new_id := lpad(floor(random() * 89999999 + 10000000)::text, 8, '0');
        
        -- Récupérer l'identifiant précédent et suivant
        SELECT user_identifier INTO prev_id
        FROM profiles
        WHERE user_identifier < new_id
        ORDER BY user_identifier DESC
        LIMIT 1;
        
        SELECT user_identifier INTO next_id
        FROM profiles
        WHERE user_identifier > new_id
        ORDER BY user_identifier ASC
        LIMIT 1;
        
        -- Vérifier si l'identifiant respecte toutes les contraintes
        IF NOT EXISTS (
            SELECT 1 FROM profiles WHERE user_identifier = new_id
        ) AND check_identifier_constraints(new_id, prev_id, next_id) THEN
            found := true;
        END IF;
        
        attempts := attempts + 1;
    END LOOP;
    
    IF NOT found THEN
        RAISE EXCEPTION 'Impossible de générer un identifiant unique après % tentatives', max_attempts;
    END IF;
    
    RETURN new_id;
END;
$$;

-- Mettre à jour la fonction de création de profil
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        user_identifier,
        first_name,
        last_name
    ) VALUES (
        NEW.id,
        NEW.email,
        generate_unique_user_identifier(),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        NEW.raw_user_meta_data->>'last_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();