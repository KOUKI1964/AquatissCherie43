/*
  # Align Product Categories with Frontend Navigation Menu Structure

  1. Changes
    - Create or update main menu categories
    - Create or update subcategories
    - Ensure proper parent-child relationships
    - Set slugs for clean URLs

  2. Structure
    - Level 1: Menu principal (ex: "Vêtement")
    - Level 2: Catégories (ex: "Prêt à porter")
    - Level 3: Sous-catégories (ex: "Robes")
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

-- Create main categories (Level 1)
DO $$
DECLARE
  vetement_id uuid;
  sacs_bagages_id uuid;
  bijoux_montres_id uuid;
  chaussures_id uuid;
  accessoires_id uuid;
  beaute_id uuid;
  
  -- Level 2 categories
  pret_a_porter_id uuid;
  inspirations_id uuid;
  maroquinerie_id uuid;
  petite_maroquinerie_id uuid;
  bijoux_id uuid;
  montres_id uuid;
  chaussures_femme_id uuid;
  baskets_id uuid;
  accessoires_luxe_id uuid;
  parfums_id uuid;
  bougies_parfums_id uuid;
  maquillage_id uuid;
  soins_visage_id uuid;
  corps_bain_id uuid;
  soins_solaires_id uuid;
  cheveux_id uuid;
  accessoires_cheveux_id uuid;
BEGIN
  -- Create Level 1 categories
  vetement_id := upsert_category(
    'Vêtement',
    'vetements',
    'Collection complète de vêtements élégants et raffinés'
  );
  
  sacs_bagages_id := upsert_category(
    'Sacs & bagages',
    'sacs-bagages',
    'Sacs, bagages et accessoires de maroquinerie'
  );
  
  bijoux_montres_id := upsert_category(
    'Bijoux et Montres',
    'bijoux-montres',
    'Bijoux et montres pour tous les styles'
  );
  
  chaussures_id := upsert_category(
    'Chaussures',
    'chaussures',
    'Chaussures élégantes et confortables'
  );
  
  accessoires_id := upsert_category(
    'Accessoires',
    'accessoires',
    'Accessoires de mode et de luxe'
  );
  
  beaute_id := upsert_category(
    'Beauté',
    'beaute',
    'Produits de beauté, parfums et soins'
  );
  
  -- Create Level 2 categories for Vêtement
  pret_a_porter_id := upsert_category(
    'Prêt à porter',
    'pret-a-porter',
    'Collection de vêtements prêt-à-porter',
    vetement_id
  );
  
  inspirations_id := upsert_category(
    'Inspirations',
    'inspirations',
    'Inspirations et collections spéciales',
    vetement_id
  );
  
  -- Create Level 2 categories for Sacs & bagages
  maroquinerie_id := upsert_category(
    'Maroquinerie',
    'maroquinerie',
    'Sacs et articles de maroquinerie',
    sacs_bagages_id
  );
  
  petite_maroquinerie_id := upsert_category(
    'Petite Maroquinerie',
    'petite-maroquinerie',
    'Portefeuilles et petits accessoires de maroquinerie',
    sacs_bagages_id
  );
  
  -- Create Level 2 categories for Bijoux et Montres
  bijoux_id := upsert_category(
    'Bijoux',
    'bijoux',
    'Bijoux et accessoires précieux',
    bijoux_montres_id
  );
  
  montres_id := upsert_category(
    'Montres',
    'montres',
    'Montres et accessoires horlogers',
    bijoux_montres_id
  );
  
  -- Create Level 2 categories for Chaussures
  chaussures_femme_id := upsert_category(
    'Chaussures femme',
    'chaussures-femme',
    'Chaussures pour femme',
    chaussures_id
  );
  
  baskets_id := upsert_category(
    'Baskets',
    'baskets',
    'Baskets et sneakers',
    chaussures_id
  );
  
  -- Create Level 2 categories for Accessoires
  accessoires_luxe_id := upsert_category(
    'Accessoires de luxe',
    'accessoires-luxe',
    'Accessoires de mode haut de gamme',
    accessoires_id
  );
  
  -- Create Level 2 categories for Beauté
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
  
  -- Create Level 3 categories for Prêt à porter
  PERFORM upsert_category('Robes', 'robes', 'Robes élégantes pour toutes les occasions', pret_a_porter_id);
  PERFORM upsert_category('Tops et tee-shirts', 'tops-tee-shirts', 'Tops et t-shirts tendance', pret_a_porter_id);
  PERFORM upsert_category('Chemises', 'chemises', 'Chemises élégantes', pret_a_porter_id);
  PERFORM upsert_category('Pantalons', 'pantalons', 'Pantalons élégants et confortables', pret_a_porter_id);
  PERFORM upsert_category('Pulls, gilets et sweatshirts', 'pulls-gilets-sweatshirts', 'Pulls, gilets et sweatshirts confortables', pret_a_porter_id);
  PERFORM upsert_category('Jeans', 'jeans', 'Jeans de qualité et tendance', pret_a_porter_id);
  
  -- Create Level 3 categories for Inspirations
  PERFORM upsert_category('Nouvelles collections', 'nouvelles-collections', 'Découvrez nos nouvelles collections', inspirations_id);
  PERFORM upsert_category('Les tendances femme', 'tendances-femme', 'Les dernières tendances pour femme', inspirations_id);
  PERFORM upsert_category('La marque Aquatiss chérie', 'marque-aquatiss-cherie', 'Tout sur notre marque', inspirations_id);
  PERFORM upsert_category('Bons plans', 'bons-plans', 'Nos meilleures offres', inspirations_id);
  PERFORM upsert_category('La galerie des cadeaux', 'galerie-cadeaux', 'Idées cadeaux', inspirations_id);
  PERFORM upsert_category('Carte cadeau', 'carte-cadeau', 'Offrez une carte cadeau', inspirations_id);
  
  -- Create Level 3 categories for Maroquinerie
  PERFORM upsert_category('Sacs à main', 'sacs-a-main', 'Sacs à main élégants', maroquinerie_id);
  PERFORM upsert_category('Sacs à bandoulière', 'sacs-bandouliere', 'Sacs à bandoulière pratiques', maroquinerie_id);
  PERFORM upsert_category('Sacs cabas', 'sacs-cabas', 'Sacs cabas spacieux', maroquinerie_id);
  PERFORM upsert_category('Sacs à dos', 'sacs-a-dos', 'Sacs à dos tendance', maroquinerie_id);
  PERFORM upsert_category('Sacs seau', 'sacs-seau', 'Sacs seau élégants', maroquinerie_id);
  PERFORM upsert_category('Sacs banane', 'sacs-banane', 'Sacs banane pratiques', maroquinerie_id);
  PERFORM upsert_category('Mini sacs', 'mini-sacs', 'Mini sacs tendance', maroquinerie_id);
  PERFORM upsert_category('Tote bags', 'tote-bags', 'Tote bags pratiques', maroquinerie_id);
  PERFORM upsert_category('Sacs de plage', 'sacs-de-plage', 'Sacs de plage estivaux', maroquinerie_id);
  PERFORM upsert_category('Sacs d''ordinateur', 'sacs-ordinateur', 'Sacs pour ordinateur portable', maroquinerie_id);
  
  -- Create Level 3 categories for Petite Maroquinerie
  PERFORM upsert_category('Portefeuilles', 'portefeuilles', 'Portefeuilles élégants', petite_maroquinerie_id);
  PERFORM upsert_category('Porte-monnaie', 'porte-monnaie', 'Porte-monnaie pratiques', petite_maroquinerie_id);
  PERFORM upsert_category('Porte-cartes', 'porte-cartes', 'Porte-cartes minimalistes', petite_maroquinerie_id);
  PERFORM upsert_category('Pochettes et trousses', 'pochettes-trousses', 'Pochettes et trousses pratiques', petite_maroquinerie_id);
  PERFORM upsert_category('Bandoulières', 'bandoulieres', 'Bandoulières interchangeables', petite_maroquinerie_id);
  PERFORM upsert_category('Porte-clés et charmes', 'porte-cles-charmes', 'Porte-clés et accessoires décoratifs', petite_maroquinerie_id);
  
  -- Create Level 3 categories for Bijoux
  PERFORM upsert_category('Bracelets', 'bracelets', 'Bracelets élégants', bijoux_id);
  PERFORM upsert_category('Boucles d''oreilles', 'boucles-oreilles', 'Boucles d''oreilles tendance', bijoux_id);
  PERFORM upsert_category('Colliers', 'colliers', 'Colliers raffinés', bijoux_id);
  PERFORM upsert_category('Bagues', 'bagues', 'Bagues élégantes', bijoux_id);
  PERFORM upsert_category('Pendentifs', 'pendentifs', 'Pendentifs originaux', bijoux_id);
  PERFORM upsert_category('Broches', 'broches', 'Broches décoratives', bijoux_id);
  
  -- Create Level 3 categories for Montres
  PERFORM upsert_category('Montres bracelet acier', 'montres-bracelet-acier', 'Montres avec bracelet en acier', montres_id);
  PERFORM upsert_category('Montres connectées', 'montres-connectees', 'Montres connectées et intelligentes', montres_id);
  PERFORM upsert_category('Montres bracelet silicone', 'montres-bracelet-silicone', 'Montres avec bracelet en silicone', montres_id);
  PERFORM upsert_category('Montres bracelet cuir', 'montres-bracelet-cuir', 'Montres avec bracelet en cuir', montres_id);
  PERFORM upsert_category('Montres bracelet tissu', 'montres-bracelet-tissu', 'Montres avec bracelet en tissu', montres_id);
  
  -- Create Level 3 categories for Chaussures femme
  PERFORM upsert_category('Sandales à talons', 'sandales-talons', 'Sandales à talons élégantes', chaussures_femme_id);
  PERFORM upsert_category('Sandales plates', 'sandales-plates', 'Sandales plates confortables', chaussures_femme_id);
  PERFORM upsert_category('Mules et sabots', 'mules-sabots', 'Mules et sabots tendance', chaussures_femme_id);
  PERFORM upsert_category('Escarpins', 'escarpins', 'Escarpins élégants', chaussures_femme_id);
  PERFORM upsert_category('Ballerines et babies', 'ballerines-babies', 'Ballerines et babies confortables', chaussures_femme_id);
  PERFORM upsert_category('Mocassins', 'mocassins', 'Mocassins élégants', chaussures_femme_id);
  PERFORM upsert_category('Chaussures d''été', 'chaussures-ete', 'Chaussures légères pour l''été', chaussures_femme_id);
  PERFORM upsert_category('Chaussures de ville', 'chaussures-ville', 'Chaussures élégantes pour la ville', chaussures_femme_id);
  PERFORM upsert_category('Accessoires pour chaussures', 'accessoires-chaussures', 'Accessoires pour chaussures', chaussures_femme_id);
  
  -- Create Level 3 categories for Baskets
  PERFORM upsert_category('Sneakers', 'sneakers', 'Sneakers tendance', baskets_id);
  PERFORM upsert_category('Baskets montantes', 'baskets-montantes', 'Baskets montantes stylées', baskets_id);
  PERFORM upsert_category('Baskets basses', 'baskets-basses', 'Baskets basses confortables', baskets_id);
  PERFORM upsert_category('Baskets à scratch', 'baskets-scratch', 'Baskets à scratch pratiques', baskets_id);
  PERFORM upsert_category('Chaussures de sport', 'chaussures-sport', 'Chaussures pour le sport', baskets_id);
  
  -- Create Level 3 categories for Accessoires de luxe
  PERFORM upsert_category('Lunettes de soleil', 'lunettes-soleil', 'Lunettes de soleil tendance', accessoires_luxe_id);
  PERFORM upsert_category('Foulards et écharpes', 'foulards-echarpes', 'Foulards et écharpes élégants', accessoires_luxe_id);
  PERFORM upsert_category('Casquettes', 'casquettes', 'Casquettes tendance', accessoires_luxe_id);
  PERFORM upsert_category('Ceintures', 'ceintures', 'Ceintures élégantes', accessoires_luxe_id);
  PERFORM upsert_category('Accessoires pour cheveux', 'accessoires-cheveux', 'Accessoires élégants pour cheveux', accessoires_luxe_id);
  PERFORM upsert_category('Accessoires de téléphone', 'accessoires-telephone', 'Accessoires pour téléphone', accessoires_luxe_id);
  
  -- Create Level 3 categories for Parfums
  PERFORM upsert_category('Parfums d''exception', 'parfums-exception', 'Parfums d''exception et de luxe', parfums_id);
  PERFORM upsert_category('Parfums femme', 'parfums-femme', 'Parfums pour femme', parfums_id);
  PERFORM upsert_category('Coffrets parfum femme', 'coffrets-parfum-femme', 'Coffrets de parfums pour femme', parfums_id);
  PERFORM upsert_category('Eaux de parfum', 'eaux-de-parfum', 'Eaux de parfum', parfums_id);
  PERFORM upsert_category('Eaux de toilette', 'eaux-de-toilette', 'Eaux de toilette', parfums_id);
  PERFORM upsert_category('Eaux de Cologne', 'eaux-de-cologne', 'Eaux de Cologne', parfums_id);
  
  -- Create Level 3 categories for Bougies et parfums d'intérieur
  PERFORM upsert_category('Parfums d''intérieur', 'parfums-interieur', 'Parfums pour la maison', bougies_parfums_id);
  PERFORM upsert_category('Bougies parfumées', 'bougies-parfumees', 'Bougies parfumées', bougies_parfums_id);
  
  -- Create Level 3 categories for Maquillage
  PERFORM upsert_category('Teint', 'teint', 'Produits pour le teint', maquillage_id);
  PERFORM upsert_category('Yeux', 'yeux', 'Maquillage pour les yeux', maquillage_id);
  PERFORM upsert_category('Sourcils', 'sourcils', 'Produits pour les sourcils', maquillage_id);
  PERFORM upsert_category('Lèvres', 'levres', 'Rouge à lèvres et gloss', maquillage_id);
  PERFORM upsert_category('Manucure et ongles', 'manucure-ongles', 'Produits pour les ongles', maquillage_id);
  
  -- Create Level 3 categories for Soins visage
  PERFORM upsert_category('Crèmes et soins d''exception', 'cremes-soins-exception', 'Soins visage haut de gamme', soins_visage_id);
  PERFORM upsert_category('Crèmes', 'cremes', 'Crèmes pour le visage', soins_visage_id);
  PERFORM upsert_category('Soins ciblés', 'soins-cibles', 'Soins ciblés pour le visage', soins_visage_id);
  PERFORM upsert_category('Démaquillants', 'demaquillants', 'Produits démaquillants', soins_visage_id);
  PERFORM upsert_category('Nettoyants', 'nettoyants', 'Nettoyants pour le visage', soins_visage_id);
  PERFORM upsert_category('Compléments alimentaires pour le visage', 'complements-visage', 'Compléments pour la peau', soins_visage_id);
  
  -- Create Level 3 categories for Corps et bain
  PERFORM upsert_category('Crèmes et laits corps', 'cremes-laits-corps', 'Crèmes et laits pour le corps', corps_bain_id);
  PERFORM upsert_category('Soins ciblés corps', 'soins-cibles-corps', 'Soins ciblés pour le corps', corps_bain_id);
  PERFORM upsert_category('Gommages et exfoliants', 'gommages-exfoliants', 'Gommages et exfoliants pour le corps', corps_bain_id);
  PERFORM upsert_category('Coffrets corps', 'coffrets-corps', 'Coffrets de soins pour le corps', corps_bain_id);
  PERFORM upsert_category('Déodorants', 'deodorants', 'Déodorants et anti-transpirants', corps_bain_id);
  PERFORM upsert_category('Bain et douche', 'bain-douche', 'Produits pour le bain et la douche', corps_bain_id);
  PERFORM upsert_category('Épilation et rasage', 'epilation-rasage', 'Produits d''épilation et de rasage', corps_bain_id);
  PERFORM upsert_category('Compléments alimentaires corps', 'complements-corps', 'Compléments pour le corps', corps_bain_id);
  
  -- Create Level 3 categories for Soins solaires
  PERFORM upsert_category('Crèmes solaires', 'cremes-solaires', 'Crèmes de protection solaire', soins_solaires_id);
  PERFORM upsert_category('Après soleil', 'apres-soleil', 'Soins après-soleil', soins_solaires_id);
  PERFORM upsert_category('Auto-bronzants', 'auto-bronzants', 'Produits auto-bronzants', soins_solaires_id);
  PERFORM upsert_category('Coffrets solaires', 'coffrets-solaires', 'Coffrets de soins solaires', soins_solaires_id);
  
  -- Create Level 3 categories for Cheveux
  PERFORM upsert_category('Shampoings', 'shampoings', 'Shampoings pour tous types de cheveux', cheveux_id);
  PERFORM upsert_category('Après-shampoings', 'apres-shampoings', 'Après-shampoings et démêlants', cheveux_id);
  PERFORM upsert_category('Soins sans rinçage', 'soins-sans-rincage', 'Soins sans rinçage pour les cheveux', cheveux_id);
  PERFORM upsert_category('Masques cheveux', 'masques-cheveux', 'Masques nourrissants pour cheveux', cheveux_id);
  PERFORM upsert_category('Produits coiffants', 'produits-coiffants', 'Produits de coiffage', cheveux_id);
  PERFORM upsert_category('Colorations', 'colorations', 'Produits de coloration', cheveux_id);
  
  -- Create Level 3 categories for Accessoires cheveux
  PERFORM upsert_category('Lisseurs', 'lisseurs', 'Lisseurs pour cheveux', accessoires_cheveux_id);
  PERFORM upsert_category('Brosses et peignes', 'brosses-peignes', 'Brosses et peignes pour cheveux', accessoires_cheveux_id);
  PERFORM upsert_category('Sèche-cheveux', 'seche-cheveux', 'Sèche-cheveux professionnels', accessoires_cheveux_id);
  PERFORM upsert_category('Boucler', 'boucler', 'Appareils pour boucler les cheveux', accessoires_cheveux_id);
  PERFORM upsert_category('Accessoires coiffure', 'accessoires-coiffure', 'Accessoires de coiffure', accessoires_cheveux_id);
END;
$$;

-- Create function to update product categories based on subcategory
CREATE OR REPLACE FUNCTION update_product_category_hierarchy()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  product_record RECORD;
  subcategory_record RECORD;
  parent_category_id uuid;
  main_category_id uuid;
BEGIN
  -- Loop through all products with a category assigned
  FOR product_record IN 
    SELECT id, category_id 
    FROM products 
    WHERE category_id IS NOT NULL
  LOOP
    -- Get the current category (subcategory)
    SELECT id, parent_id INTO subcategory_record
    FROM product_categories
    WHERE id = product_record.category_id;
    
    -- If this is already a top-level category, skip
    IF subcategory_record.parent_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Get the parent category
    SELECT id, parent_id INTO parent_category_id
    FROM product_categories
    WHERE id = subcategory_record.parent_id;
    
    -- If the parent has a parent (main category), update metadata
    IF parent_category_id IS NOT NULL THEN
      SELECT parent_id INTO main_category_id
      FROM product_categories
      WHERE id = parent_category_id;
      
      IF main_category_id IS NOT NULL THEN
        -- Update product metadata with the full category hierarchy
        UPDATE products
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{category_hierarchy}',
          jsonb_build_object(
            'main_category_id', main_category_id,
            'parent_category_id', parent_category_id,
            'subcategory_id', product_record.category_id
          )
        )
        WHERE id = product_record.id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Execute the function to update product category hierarchies
SELECT update_product_category_hierarchy();

-- Create a view for category hierarchy
CREATE OR REPLACE VIEW category_hierarchy_view AS
WITH RECURSIVE category_tree AS (
  -- Base case: top-level categories
  SELECT 
    id,
    name,
    slug,
    parent_id,
    is_active,
    name AS path_name,
    slug AS path_slug,
    1 AS level
  FROM product_categories
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child categories
  SELECT
    c.id,
    c.name,
    c.slug,
    c.parent_id,
    c.is_active,
    ct.path_name || ' > ' || c.name AS path_name,
    ct.path_slug || '/' || c.slug AS path_slug,
    ct.level + 1 AS level
  FROM product_categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT 
  id,
  name,
  slug,
  parent_id,
  is_active,
  path_name,
  path_slug,
  level,
  CASE 
    WHEN level = 1 THEN 'Menu principal'
    WHEN level = 2 THEN 'Catégorie'
    WHEN level = 3 THEN 'Sous-catégorie'
    ELSE 'Autre'
  END AS level_name
FROM category_tree
ORDER BY path_name;

-- Grant access to the view
GRANT SELECT ON category_hierarchy_view TO authenticated;

-- Mark unused categories as inactive instead of deleting them
DO $$
DECLARE
  main_categories text[] := ARRAY['vetements', 'sacs-bagages', 'bijoux-montres', 'chaussures', 'accessoires', 'beaute'];
  category_record RECORD;
BEGIN
  -- Mark categories that don't match our structure as inactive
  UPDATE product_categories
  SET is_active = false
  WHERE 
    -- Not used by any products
    id NOT IN (SELECT DISTINCT category_id FROM products WHERE category_id IS NOT NULL)
    -- And not one of our main categories
    AND (parent_id IS NULL AND slug NOT IN (
      'vetements', 'sacs-bagages', 'bijoux-montres', 'chaussures', 'accessoires', 'beaute'
    ));
END;
$$;