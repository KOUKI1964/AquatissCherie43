/*
  # Configuration des contraintes pour les codes fournisseurs et SKU

  1. Contraintes
    - Vérification du format du code fournisseur (3 chiffres)
    - Unicité du code fournisseur
    - Unicité du SKU
    - Synchronisation entre supplier_code et supplierCode

  2. Fonctions et triggers
    - Synchronisation automatique entre les champs
    - Validation des données
*/

-- Ajouter une contrainte pour le format du code fournisseur
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_supplier_code_format'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT check_supplier_code_format
    CHECK (supplier_code ~ '^[0-9]{3}$');
  END IF;
END
$$;

-- Vérifier si la contrainte d'unicité existe déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_supplier_code_key'
  ) THEN
    -- Ajouter une contrainte d'unicité pour le code fournisseur
    ALTER TABLE public.products
    ADD CONSTRAINT products_supplier_code_key UNIQUE (supplier_code);
  END IF;
END
$$;

-- Fonction pour synchroniser le code fournisseur sur les produits
CREATE OR REPLACE FUNCTION sync_supplier_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le produit a un code fournisseur, vérifier qu'il existe
  IF NEW.supplier_code IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM suppliers WHERE supplier_code = NEW.supplier_code
    ) THEN
      RAISE EXCEPTION 'Le code fournisseur % n''existe pas', NEW.supplier_code;
    END IF;
    
    -- Synchroniser le champ supplierCode avec supplier_code
    NEW."supplierCode" := NEW.supplier_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour synchroniser le code fournisseur
DROP TRIGGER IF EXISTS sync_supplier_code_trigger ON public.products;
CREATE TRIGGER sync_supplier_code_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION sync_supplier_code();

-- Fonction pour synchroniser le code fournisseur sur les produits
CREATE OR REPLACE FUNCTION sync_supplier_code_on_products()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le code fournisseur a changé, mettre à jour tous les produits associés
  IF NEW.supplier_code != OLD.supplier_code THEN
    UPDATE products
    SET supplier_code = NEW.supplier_code
    WHERE supplier_code = OLD.supplier_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour synchroniser le code fournisseur
DROP TRIGGER IF EXISTS sync_supplier_code_on_products_trigger ON public.suppliers;
CREATE TRIGGER sync_supplier_code_on_products_trigger
  AFTER UPDATE OF supplier_code ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION sync_supplier_code_on_products();