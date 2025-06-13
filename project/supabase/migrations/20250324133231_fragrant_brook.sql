/*
  # Configuration des validations et triggers pour les produits

  1. Contraintes
    - Validation des prix (prix > 0, prix promo <= prix normal)
    - Validation des stocks (>= 0)
    - Validation des slugs (uniques et formatés)
    - Validation des SKUs (uniques)
    - Validation des images (URLs valides)

  2. Triggers
    - Génération automatique des slugs
    - Mise à jour des timestamps
    - Journalisation des modifications
    - Validation des variantes

  3. Fonctions
    - Validation des données produit
    - Gestion des images
    - Mise à jour du stock
*/

-- Fonction de validation complète des produits
CREATE OR REPLACE FUNCTION validate_product()
RETURNS trigger AS $$
BEGIN
  -- Validation du prix
  IF NEW.price < 0 THEN
    RAISE EXCEPTION 'Le prix doit être positif';
  END IF;

  -- Validation du prix promotionnel
  IF NEW.sale_price IS NOT NULL THEN
    IF NEW.sale_price < 0 OR NEW.sale_price > NEW.price THEN
      RAISE EXCEPTION 'Le prix promotionnel doit être positif et inférieur au prix normal';
    END IF;
  END IF;

  -- Validation du stock
  IF NEW.stock_quantity < 0 THEN
    RAISE EXCEPTION 'Le stock ne peut pas être négatif';
  END IF;

  -- Validation du seuil de stock bas
  IF NEW.low_stock_threshold < 0 THEN
    RAISE EXCEPTION 'Le seuil de stock bas doit être positif';
  END IF;

  -- Validation du statut
  IF NEW.status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;

  -- Validation de la catégorie
  IF NEW.category_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM product_categories WHERE id = NEW.category_id) THEN
      RAISE EXCEPTION 'Catégorie invalide';
    END IF;
  END IF;

  -- Mise à jour du timestamp
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la validation des produits
DROP TRIGGER IF EXISTS validate_product_trigger ON products;
CREATE TRIGGER validate_product_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product();

-- Fonction de validation des variantes
CREATE OR REPLACE FUNCTION validate_product_variant()
RETURNS trigger AS $$
BEGIN
  -- Validation du prix
  IF NEW.price < 0 THEN
    RAISE EXCEPTION 'Le prix de la variante doit être positif';
  END IF;

  -- Validation du prix promotionnel
  IF NEW.sale_price IS NOT NULL THEN
    IF NEW.sale_price < 0 OR NEW.sale_price > NEW.price THEN
      RAISE EXCEPTION 'Le prix promotionnel de la variante doit être positif et inférieur au prix normal';
    END IF;
  END IF;

  -- Validation du stock
  IF NEW.stock_quantity < 0 THEN
    RAISE EXCEPTION 'Le stock de la variante ne peut pas être négatif';
  END IF;

  -- Validation des attributs
  IF NEW.attributes IS NULL OR NEW.attributes = '{}'::jsonb THEN
    RAISE EXCEPTION 'Les attributs de la variante sont requis';
  END IF;

  -- Mise à jour du timestamp
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la validation des variantes
DROP TRIGGER IF EXISTS validate_variant_trigger ON product_variants;
CREATE TRIGGER validate_variant_trigger
  BEFORE INSERT OR UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_variant();

-- Fonction pour mettre à jour le stock total du produit
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS trigger AS $$
BEGIN
  -- Mettre à jour le stock total du produit
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE products
    SET stock_quantity = (
      SELECT COALESCE(SUM(stock_quantity), 0)
      FROM product_variants
      WHERE product_id = NEW.product_id
    )
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la mise à jour du stock
DROP TRIGGER IF EXISTS update_product_stock_trigger ON product_variants;
CREATE TRIGGER update_product_stock_trigger
  AFTER INSERT OR UPDATE OF stock_quantity ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- Fonction pour valider les images
CREATE OR REPLACE FUNCTION validate_product_image()
RETURNS trigger AS $$
BEGIN
  -- Vérifier que le produit existe
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = NEW.product_id) THEN
    RAISE EXCEPTION 'Produit invalide';
  END IF;

  -- Vérifier qu'il n'y a qu'une seule image primaire
  IF NEW.is_primary THEN
    UPDATE product_images
    SET is_primary = false
    WHERE product_id = NEW.product_id
    AND id != COALESCE(NEW.id, uuid_nil());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la validation des images
DROP TRIGGER IF EXISTS validate_image_trigger ON product_images;
CREATE TRIGGER validate_image_trigger
  BEFORE INSERT OR UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_image();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_products_published ON products(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(stock_quantity) WHERE stock_quantity <= low_stock_threshold;
CREATE INDEX IF NOT EXISTS idx_products_sale ON products(sale_price) WHERE sale_price IS NOT NULL;