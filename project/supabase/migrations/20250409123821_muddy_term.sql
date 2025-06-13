/*
  # Update Beauty Category Structure

  1. Changes
    - Delete existing "Beauté" category and its subcategories
    - Create new "Beauté" menu structure with proper hierarchy
    - Add all subcategories according to the specified structure

  2. Structure
    - Menu principal: Beauté
      - 8 main categories (Parfums, Bougies et parfums d'intérieur, etc.)
      - Multiple subcategories for each main category
*/

-- Function to create or update a category
CREATE OR REPLACE FUNCTION upsert_category(
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id uuid;
BEGIN
  -- Check if category exists
  SELECT id INTO v_category_id
  FROM product_categories
  WHERE slug = p_slug;
  
  IF v_category_id IS NULL THEN
    -- Insert new category
    INSERT INTO product_categories (
      name,
      slug,
      description,
      parent_id,
      is_active
    ) VALUES (
      p_name,
      p_slug,
      p_description,
      p_parent_id,
      true
    )
    RETURNING id INTO v_category_id;
  ELSE
    -- Update existing category
    UPDATE product_categories
    SET
      name = p_name,
      description = COALESCE(p_description, description),
      parent_id = p_parent_id,
      is_active = true,
      updated_at = now()
    WHERE id = v_category_id;
  END IF;
  
  RETURN v_category_id;
END;
$$;

-- Step 1: Delete existing Beauté category and its subcategories
DO $$
DECLARE
  beaute_id uuid;
  subcategory_ids uuid[];
  sub_subcategory_ids uuid[];
BEGIN
  -- Find the Beauté category
  SELECT id INTO beaute_id FROM product_categories WHERE slug = 'beaute';
  
  IF beaute_id IS NOT NULL THEN
    -- Find all subcategories
    SELECT array_agg(id) INTO subcategory_ids 
    FROM product_categories 
    WHERE parent_id = beaute_id;
    
    IF subcategory_ids IS NOT NULL THEN
      -- Find all sub-subcategories
      SELECT array_agg(id) INTO sub_subcategory_ids 
      FROM product_categories 
      WHERE parent_id = ANY(subcategory_ids);
      
      -- Delete sub-subcategories first
      IF sub_subcategory_ids IS NOT NULL THEN
        DELETE FROM product_categories WHERE id = ANY(sub_subcategory_ids);
      END IF;
      
      -- Delete subcategories
      DELETE FROM product_categories WHERE id = ANY(subcategory_ids);
    END IF;
    
    -- Delete main category
    DELETE FROM product_categories WHERE id = beaute_id;
  END IF;
END;
$$;

-- Step 2: Create new Beauté category structure
DO $$
DECLARE
  beaute_id uuid;
  parfums_id uuid;
  bougies_parfums_id uuid;
  maquillage_id uuid;
  soins_visage_id uuid;
  corps_bain_id uuid;
  soins_solaires_id uuid;
  cheveux_id uuid;
  accessoires_cheveux_id uuid;
BEGIN
  -- Create main Beauté category
  beaute_id := upsert_category(
    'Beauté',
    'beaute',
    'Produits de beauté, parfums et soins'
  );
  
  -- Create level 1 categories
  parfums_id := upsert_category(
    'Parfums',
    'parfums',
    'Parfums et eaux de toilette',
    beaute_id
  );
  
  bougies_parfums_id := upsert_category(
    'Bougies et parfums d''intérieur',
    'bougies-parfums-interieur',
    'Bougies parfumées et parfums d''intérieur',
    beaute_id
  );
  
  maquillage_id := upsert_category(
    'Maquillage',
    'maquillage',
    'Produits de maquillage',
    beaute_id
  );
  
  soins_visage_id := upsert_category(
    'Soins visage',
    'soins-visage',
    'Soins pour le visage',
    beaute_id
  );
  
  corps_bain_id := upsert_category(
    'Corps et bain',
    'corps-bain',
    'Soins pour le corps et produits de bain',
    beaute_id
  );
  
  soins_solaires_id := upsert_category(
    'Soins solaires',
    'soins-solaires',
    'Protection et soins solaires',
    beaute_id
  );
  
  cheveux_id := upsert_category(
    'Cheveux',
    'cheveux',
    'Soins et produits pour les cheveux',
    beaute_id
  );
  
  accessoires_cheveux_id := upsert_category(
    'Accessoires cheveux',
    'accessoires-cheveux',
    'Accessoires pour les cheveux',
    beaute_id
  );
  
  -- Create level 2 categories for Parfums
  PERFORM upsert_category('Parfums d''exception', 'parfums-exception', 'Parfums d''exception et de luxe', parfums_id);
  PERFORM upsert_category('Parfums femme', 'parfums-femme', 'Parfums pour femme', parfums_id);
  PERFORM upsert_category('Coffrets parfum femme', 'coffrets-parfum-femme', 'Coffrets de parfums pour femme', parfums_id);
  PERFORM upsert_category('Eaux de parfum', 'eaux-de-parfum', 'Eaux de parfum', parfums_id);
  PERFORM upsert_category('Eaux de toilette', 'eaux-de-toilette', 'Eaux de toilette', parfums_id);
  PERFORM upsert_category('Eaux de Cologne', 'eaux-de-cologne', 'Eaux de Cologne', parfums_id);
  
  -- Create level 2 categories for Bougies et parfums d'intérieur
  PERFORM upsert_category('Parfums d''intérieur', 'parfums-interieur', 'Parfums pour la maison', bougies_parfums_id);
  PERFORM upsert_category('Bougies parfumées', 'bougies-parfumees', 'Bougies parfumées', bougies_parfums_id);
  
  -- Create level 2 categories for Maquillage
  PERFORM upsert_category('Teint', 'teint', 'Produits pour le teint', maquillage_id);
  PERFORM upsert_category('Yeux', 'yeux', 'Maquillage pour les yeux', maquillage_id);
  PERFORM upsert_category('Sourcils', 'sourcils', 'Produits pour les sourcils', maquillage_id);
  PERFORM upsert_category('Lèvres', 'levres', 'Rouge à lèvres et gloss', maquillage_id);
  PERFORM upsert_category('Manucure et ongles', 'manucure-ongles', 'Produits pour les ongles', maquillage_id);
  
  -- Create level 2 categories for Soins visage
  PERFORM upsert_category('Crèmes et soins d''exception', 'cremes-soins-exception', 'Soins visage haut de gamme', soins_visage_id);
  PERFORM upsert_category('Crèmes', 'cremes', 'Crèmes pour le visage', soins_visage_id);
  PERFORM upsert_category('Soins ciblés', 'soins-cibles', 'Soins ciblés pour le visage', soins_visage_id);
  PERFORM upsert_category('Démaquillants', 'demaquillants', 'Produits démaquillants', soins_visage_id);
  PERFORM upsert_category('Nettoyants', 'nettoyants', 'Nettoyants pour le visage', soins_visage_id);
  PERFORM upsert_category('Compléments alimentaires pour le visage', 'complements-visage', 'Compléments pour la peau', soins_visage_id);
  
  -- Create level 2 categories for Corps et bain
  PERFORM upsert_category('Crèmes et laits corps', 'cremes-laits-corps', 'Crèmes et laits pour le corps', corps_bain_id);
  PERFORM upsert_category('Soins ciblés corps', 'soins-cibles-corps', 'Soins ciblés pour le corps', corps_bain_id);
  PERFORM upsert_category('Gommages et exfoliants', 'gommages-exfoliants', 'Gommages et exfoliants pour le corps', corps_bain_id);
  PERFORM upsert_category('Coffrets corps', 'coffrets-corps', 'Coffrets de soins pour le corps', corps_bain_id);
  PERFORM upsert_category('Déodorants', 'deodorants', 'Déodorants et anti-transpirants', corps_bain_id);
  PERFORM upsert_category('Bain et douche', 'bain-douche', 'Produits pour le bain et la douche', corps_bain_id);
  PERFORM upsert_category('Épilation et rasage', 'epilation-rasage', 'Produits d''épilation et de rasage', corps_bain_id);
  PERFORM upsert_category('Compléments alimentaires corps', 'complements-corps', 'Compléments pour le corps', corps_bain_id);
  
  -- Create level 2 categories for Soins solaires
  PERFORM upsert_category('Crèmes solaires', 'cremes-solaires', 'Crèmes de protection solaire', soins_solaires_id);
  PERFORM upsert_category('Après soleil', 'apres-soleil', 'Soins après-soleil', soins_solaires_id);
  PERFORM upsert_category('Auto-bronzants', 'auto-bronzants', 'Produits auto-bronzants', soins_solaires_id);
  PERFORM upsert_category('Coffrets solaires', 'coffrets-solaires', 'Coffrets de soins solaires', soins_solaires_id);
  
  -- Create level 2 categories for Cheveux
  PERFORM upsert_category('Shampoings', 'shampoings', 'Shampoings pour tous types de cheveux', cheveux_id);
  PERFORM upsert_category('Après-shampoings', 'apres-shampoings', 'Après-shampoings et démêlants', cheveux_id);
  PERFORM upsert_category('Soins sans rinçage', 'soins-sans-rincage', 'Soins sans rinçage pour les cheveux', cheveux_id);
  PERFORM upsert_category('Masques cheveux', 'masques-cheveux', 'Masques nourrissants pour cheveux', cheveux_id);
  PERFORM upsert_category('Produits coiffants', 'produits-coiffants', 'Produits de coiffage', cheveux_id);
  PERFORM upsert_category('Colorations', 'colorations', 'Produits de coloration', cheveux_id);
  
  -- Create level 2 categories for Accessoires cheveux
  PERFORM upsert_category('Lisseurs', 'lisseurs', 'Lisseurs pour cheveux', accessoires_cheveux_id);
  PERFORM upsert_category('Brosses et peignes', 'brosses-peignes', 'Brosses et peignes pour cheveux', accessoires_cheveux_id);
  PERFORM upsert_category('Sèche-cheveux', 'seche-cheveux', 'Sèche-cheveux professionnels', accessoires_cheveux_id);
  PERFORM upsert_category('Boucler', 'boucler', 'Appareils pour boucler les cheveux', accessoires_cheveux_id);
  PERFORM upsert_category('Accessoires coiffure', 'accessoires-coiffure', 'Accessoires de coiffure', accessoires_cheveux_id);
END;
$$;

-- Update sort_order for all categories
DO $$
DECLARE
  category_record RECORD;
  counter INTEGER;
BEGIN
  -- Update sort_order for main categories
  counter := 0;
  FOR category_record IN 
    SELECT id FROM product_categories 
    WHERE parent_id IS NULL
    ORDER BY name
  LOOP
    counter := counter + 1;
    UPDATE product_categories 
    SET sort_order = counter
    WHERE id = category_record.id;
  END LOOP;
  
  -- Update sort_order for subcategories
  FOR category_record IN 
    SELECT id FROM product_categories 
    WHERE parent_id IS NOT NULL
  LOOP
    counter := 0;
    FOR category_record IN 
      SELECT id FROM product_categories 
      WHERE parent_id = category_record.id
      ORDER BY name
    LOOP
      counter := counter + 1;
      UPDATE product_categories 
      SET sort_order = counter
      WHERE id = category_record.id;
    END LOOP;
  END LOOP;
END;
$$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS upsert_category(text, text, text, uuid);