/*
  # Configuration de la table des administrateurs

  1. Nouvelle Table
    - `admin_users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `role` (text)
      - `created_at` (timestamptz)
      - `last_login` (timestamptz)

  2. Sécurité
    - Enable RLS
    - Policies pour l'accès administrateur
    - Fonction pour vérifier le statut admin
*/

-- Table des administrateurs
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can access admin_users"
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Fonction pour vérifier si un utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
  );
END;
$$;

-- Trigger pour empêcher plus d'un administrateur
CREATE OR REPLACE FUNCTION check_single_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.admin_users) > 0 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Un seul administrateur est autorisé';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_admin
  BEFORE INSERT ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION check_single_admin();