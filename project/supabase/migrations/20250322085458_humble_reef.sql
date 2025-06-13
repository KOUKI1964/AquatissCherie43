/*
  # Ajout de l'administrateur initial

  1. Modifications
    - Insertion de l'administrateur initial
    - Vérification préalable de l'existence
*/

-- Fonction pour insérer l'administrateur initial en toute sécurité
CREATE OR REPLACE FUNCTION insert_initial_admin()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier si un administrateur existe déjà
  IF NOT EXISTS (SELECT 1 FROM public.admin_users) THEN
    -- Insérer l'administrateur initial
    INSERT INTO public.admin_users (id, email)
    VALUES ('d6b0cb8b-7b2a-4c1d-a7b3-f138ea1c2cf4', 'mkoukiz@gmail.com')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Exécuter la fonction
SELECT insert_initial_admin();

-- Supprimer la fonction temporaire
DROP FUNCTION insert_initial_admin();