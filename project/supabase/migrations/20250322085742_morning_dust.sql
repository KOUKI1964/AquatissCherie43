/*
  # Mise à jour de l'administrateur

  1. Modifications
    - Suppression de l'ancien administrateur
    - Insertion du nouvel administrateur
*/

-- Supprimer l'ancien administrateur
DELETE FROM public.admin_users;

-- Insérer le nouvel administrateur
INSERT INTO public.admin_users (id, email)
VALUES ('04d1a13f-d4f1-4940-9bb7-58b2dfa6e18c', 'koukiz1964@gmail.com');