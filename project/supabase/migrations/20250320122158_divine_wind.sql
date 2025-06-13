/*
  # Fonction de vérification complète de la structure de la base de données
  
  Cette fonction vérifie :
  1. L'existence des tables nécessaires
  2. La présence des colonnes requises
  3. La configuration RLS
  4. Les politiques de sécurité
  5. Les triggers
  6. Les contraintes
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
  triggers jsonb;
  constraints jsonb;
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
    'roles', pol.roles,
    'qual', pol.qual,
    'with_check', pol.with_check
  ))
  FROM pg_policies pol
  WHERE pol.tablename = 'profiles'
  AND pol.schemaname = 'public'
  INTO policies;

  -- Récupérer les triggers
  SELECT jsonb_agg(jsonb_build_object(
    'trigger_name', trigger_name,
    'event_manipulation', event_manipulation,
    'event_object_table', event_object_table,
    'action_statement', action_statement
  ))
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
  AND event_object_table = 'profiles'
  INTO triggers;

  -- Récupérer les contraintes
  SELECT jsonb_agg(jsonb_build_object(
    'constraint_name', tc.constraint_name,
    'constraint_type', tc.constraint_type,
    'column_name', kcu.column_name
  ))
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'public'
  AND tc.table_name = 'profiles'
  INTO constraints;

  -- Construire le résultat complet
  result := jsonb_build_object(
    'table_exists', table_exists,
    'rls_enabled', rls_enabled,
    'policies', policies,
    'triggers', triggers,
    'constraints', constraints,
    'columns', (
      SELECT jsonb_agg(jsonb_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable,
        'column_default', column_default,
        'character_maximum_length', character_maximum_length
      ))
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profiles'
    )
  );

  RETURN result;
END;
$$;