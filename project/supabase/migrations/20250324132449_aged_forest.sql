/*
  # Mise à jour des catégories de vêtements

  1. Modifications
    - Ajout de toutes les catégories de vêtements
    - Création de la hiérarchie des catégories
    - Utilisation d'une approche plus sûre pour les insertions
*/

-- Insérer la catégorie principale "Vêtements"
INSERT INTO public.product_categories (name, slug, description)
VALUES (
  'Vêtements',
  'vetements',
  'Collection complète de vêtements élégants et raffinés'
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description
RETURNING id;

-- Fonction pour insérer les sous-catégories
DO $$
DECLARE
  parent_id uuid;
BEGIN
  -- Récupérer l'ID de la catégorie principale
  SELECT id INTO parent_id FROM public.product_categories WHERE slug = 'vetements';

  -- Insérer les sous-catégories
  INSERT INTO public.product_categories (name, slug, description, parent_id)
  VALUES 
    ('Prêt à porter de luxe', 'pret-a-porter-de-luxe', 'Collection de vêtements haut de gamme', parent_id),
    ('Robes', 'robes', 'Robes élégantes pour toutes les occasions', parent_id),
    ('Pulls, gilets et sweatshirts', 'pulls-gilets-sweatshirts', 'Pulls, gilets et sweatshirts confortables', parent_id),
    ('Manteaux', 'manteaux', 'Manteaux élégants pour toutes les saisons', parent_id),
    ('Doudounes', 'doudounes', 'Doudounes chaudes et confortables', parent_id),
    ('Vestes', 'vestes', 'Vestes tendance et élégantes', parent_id),
    ('Chemises et blouses', 'chemises-blouses', 'Chemises et blouses raffinées', parent_id),
    ('Robes de soirée', 'robes-de-soiree', 'Robes élégantes pour vos soirées', parent_id),
    ('Tops et tee-shirts', 'tops-tee-shirts', 'Tops et t-shirts tendance', parent_id),
    ('Pantalons', 'pantalons', 'Pantalons élégants et confortables', parent_id),
    ('Combinaisons', 'combinaisons', 'Combinaisons modernes et élégantes', parent_id),
    ('Vêtements de sport', 'vetements-de-sport', 'Vêtements pour le sport et le bien-être', parent_id),
    ('Jupes', 'jupes', 'Jupes élégantes et tendance', parent_id),
    ('Jeans', 'jeans', 'Jeans de qualité et tendance', parent_id),
    ('Shorts et bermudas', 'shorts-bermudas', 'Shorts et bermudas pour l''été', parent_id)
  ON CONFLICT (slug) DO UPDATE
  SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id;
END;
$$;