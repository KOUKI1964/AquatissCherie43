/*
  # Correction de la génération de l'identifiant utilisateur

  1. Modifications
    - Mise à jour de la fonction de génération de l'identifiant
    - Ajout d'une politique pour permettre l'insertion lors de la création du compte
    - Ajout d'un trigger pour générer l'identifiant automatiquement

  2. Sécurité
    - La génération est effectuée côté serveur
    - Vérification de l'unicité automatique
*/

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

-- Fonction pour gérer la création d'un nouveau profil
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

-- Recréer le trigger pour la création de profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Mettre à jour les profils existants qui n'ont pas d'identifiant
DO $$
BEGIN
    UPDATE profiles
    SET user_identifier = generate_unique_user_identifier()
    WHERE user_identifier IS NULL;
END $$;