/*
  # Ajout de la fonction de génération de SKU unique

  1. Nouvelle fonction
    - `generate_unique_sku`: Génère un SKU unique basé sur le code fournisseur
    - Format: [code_fournisseur].[6_chiffres_aléatoires]
    - Vérifie l'unicité dans la base de données

  2. Sécurité
    - Fonction SECURITY DEFINER pour assurer l'accès aux tables
    - Gestion des erreurs et des cas limites
*/

-- Fonction pour générer un SKU unique
CREATE OR REPLACE FUNCTION generate_unique_sku(p_supplier_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_sku text;
  sku_exists boolean;
  attempts integer := 0;
  max_attempts integer := 100;
BEGIN
  -- Vérifier que le code fournisseur est valide
  IF p_supplier_code IS NULL OR p_supplier_code = '' OR p_supplier_code !~ '^[0-9]{3}$' THEN
    RAISE EXCEPTION 'Code fournisseur invalide: doit être un nombre à 3 chiffres';
  END IF;

  -- Générer un SKU unique
  LOOP
    -- Générer 6 chiffres aléatoires
    new_sku := p_supplier_code || '.' || lpad(floor(random() * 900000 + 100000)::text, 6, '0');
    
    -- Vérifier si le SKU existe déjà
    SELECT EXISTS (
      SELECT 1 FROM products WHERE sku = new_sku
    ) INTO sku_exists;
    
    -- Sortir si le SKU est unique ou après trop de tentatives
    EXIT WHEN NOT sku_exists OR attempts >= max_attempts;
    attempts := attempts + 1;
  END LOOP;
  
  IF attempts >= max_attempts THEN
    RAISE EXCEPTION 'Impossible de générer un SKU unique après % tentatives', max_attempts;
  END IF;
  
  RETURN new_sku;
END;
$$;

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION generate_unique_sku TO authenticated;