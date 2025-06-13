-- Ajout de la colonne user_identifier
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_identifier text UNIQUE;

-- Création d'un index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_profiles_user_identifier ON public.profiles(user_identifier);

-- Fonction pour générer un identifiant unique
CREATE OR REPLACE FUNCTION generate_unique_user_identifier()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    new_id text;
    done bool;
BEGIN
    done := false;
    WHILE NOT done LOOP
        -- Générer un nombre aléatoire à 8 chiffres
        new_id := lpad(floor(random() * 89999999 + 10000000)::text, 8, '0');
        
        -- Vérifier si l'identifiant existe déjà
        done := NOT EXISTS (
            SELECT 1
            FROM profiles
            WHERE user_identifier = new_id
        );
    END LOOP;
    
    RETURN new_id;
END;
$$;

-- Trigger pour générer automatiquement l'identifiant
CREATE OR REPLACE FUNCTION handle_new_user_identifier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_identifier IS NULL THEN
        NEW.user_identifier := generate_unique_user_identifier();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger s'il n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_user_identifier'
    ) THEN
        CREATE TRIGGER set_user_identifier
            BEFORE INSERT ON public.profiles
            FOR EACH ROW
            EXECUTE FUNCTION handle_new_user_identifier();
    END IF;
END
$$;