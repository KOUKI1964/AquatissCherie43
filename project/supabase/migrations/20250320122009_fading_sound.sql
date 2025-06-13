/*
  # Fonction de vérification de la structure de la base de données
  
  Cette fonction vérifie :
  1. L'existence des tables nécessaires
  2. La présence des colonnes requises
  3. La configuration RLS
  4. Les politiques de sécurité
*/

CREATE OR REPLACE FUNCTION test_table_structure()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  table_exists boolean;
  rls_enabled boolean;
  policies jsonb;
BEGIN
  -- Vérifier l'existence de la table profiles
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO table_exists;

  -- Vérifier si RLS est activé
  SELECT obj.reloptions::jsonb ? 'row_level_security=on' 
  FROM pg_class obj 
  WHERE obj.relname = 'profiles' 
  INTO rls_enabled;

  -- Récupérer les politiques
  SELECT jsonb_agg(jsonb_build_object(
    'policyname', pol.policyname,
    'cmd', pol.cmd,
    'roles', pol.roles
  ))
  FROM pg_policies pol
  WHERE pol.tablename = 'profiles'
  AND pol.schemaname = 'public'
  INTO policies;

  -- Construire le résultat
  result := jsonb_build_object(
    'table_exists', table_exists,
    'rls_enabled', rls_enabled,
    'policies', policies,
    'columns', (
      SELECT jsonb_agg(jsonb_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable
      ))
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profiles'
    )
  );

  RETURN result;
END;
$$;