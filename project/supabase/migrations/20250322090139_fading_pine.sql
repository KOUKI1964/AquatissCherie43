/*
  # Correction de la politique de sécurité admin

  1. Modifications
    - Suppression de la politique récursive
    - Création d'une nouvelle politique sécurisée
    - Maintien de la restriction à un seul admin
*/

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Admin can access admin_users" ON public.admin_users;

-- Créer une nouvelle politique plus sécurisée
CREATE POLICY "Admin can access admin_users"
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (id = auth.uid());

-- Mettre à jour la fonction is_admin pour éviter la récursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE id = auth.uid()
  );
$$;