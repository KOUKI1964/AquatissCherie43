import { AttributeDefinition, CategoryAttributes } from '../types/product';
import { v4 as uuidv4 } from 'uuid';

// Common attributes that apply to all products
const commonAttributes: AttributeDefinition[] = [
  {
    id: uuidv4(),
    name: 'Marque',
    type: 'text',
    required: true,
    description: 'Marque du produit',
    defaultValue: 'Aquatiss',
    categories: ['all']
  },
  {
    id: uuidv4(),
    name: 'Poids',
    type: 'number',
    required: false,
    description: 'Poids du produit en grammes',
    defaultValue: 0,
    categories: ['all']
  },
  {
    id: uuidv4(),
    name: 'Genre',
    type: 'multiselect',
    options: ['Homme', 'Femme', 'Mixte'],
    required: true,
    description: 'Genre pour lequel le produit est destiné',
    defaultValue: ['Femme'],
    categories: ['all']
  }
];

// Category-specific attributes
const categoryAttributes: CategoryAttributes = {
  // Vêtements (robes, tops, pantalons, etc.)
  'robes': [
    {
      id: uuidv4(),
      name: 'Taille',
      type: 'multiselect',
      options: ['XS', 'S', 'M', 'L', 'XL'],
      required: true,
      description: 'Tailles disponibles pour ce vêtement',
      defaultValue: ['M'],
      categories: ['robes', 'tops-tee-shirts', 'chemises', 'pantalons', 'pulls-gilets-sweatshirts', 'jeans']
    },
    {
      id: uuidv4(),
      name: 'Couleur',
      type: 'color',
      options: ['Noir', 'Blanc', 'Rouge', 'Bleu', 'Vert', 'Jaune', 'Rose', 'Violet', 'Gris', 'Beige'],
      required: true,
      description: 'Couleurs disponibles pour ce vêtement',
      defaultValue: ['Noir'],
      categories: ['robes', 'tops-tee-shirts', 'chemises', 'pantalons', 'pulls-gilets-sweatshirts', 'jeans']
    },
    {
      id: uuidv4(),
      name: 'Saison',
      type: 'multiselect',
      options: ['Printemps', 'Été', 'Automne', 'Hiver'],
      required: true,
      description: 'Saisons pour lesquelles ce vêtement est adapté',
      defaultValue: ['Printemps', 'Été'],
      categories: ['robes', 'tops-tee-shirts', 'chemises', 'pantalons', 'pulls-gilets-sweatshirts', 'jeans']
    },
    {
      id: uuidv4(),
      name: 'Matière',
      type: 'multiselect',
      options: ['Coton', 'Lin', 'Soie', 'Polyester', 'Laine', 'Viscose', 'Élasthanne', 'Cuir', 'Denim'],
      required: false,
      description: 'Matière principale du vêtement',
      defaultValue: ['Coton'],
      categories: ['robes', 'tops-tee-shirts', 'chemises', 'pantalons', 'pulls-gilets-sweatshirts', 'jeans']
    }
  ],
  
  // Sacs (sacs à main, sacs à bandoulière)
  'sacs-a-main': [
    {
      id: uuidv4(),
      name: 'Type de fermeture',
      type: 'select',
      options: ['Zippée', 'Bouton pression', 'Cordon', 'Aimant', 'Rabat'],
      required: true,
      description: 'Type de fermeture du sac',
      defaultValue: 'Zippée',
      categories: ['sacs-a-main', 'sacs-bandouliere', 'sacs-cabas', 'sacs-a-dos']
    },
    {
      id: uuidv4(),
      name: 'Dimensions',
      type: 'text',
      required: true,
      description: 'Dimensions du sac (L x H x P en cm)',
      defaultValue: '30 x 25 x 10 cm',
      categories: ['sacs-a-main', 'sacs-bandouliere', 'sacs-cabas', 'sacs-a-dos']
    },
    {
      id: uuidv4(),
      name: 'Bandoulière amovible',
      type: 'boolean',
      required: false,
      description: 'Le sac dispose-t-il d\'une bandoulière amovible ?',
      defaultValue: false,
      categories: ['sacs-a-main', 'sacs-bandouliere', 'sacs-cabas']
    },
    {
      id: uuidv4(),
      name: 'Matière',
      type: 'select',
      options: ['Cuir', 'Cuir synthétique', 'Toile', 'Nylon', 'Coton', 'Paille'],
      required: true,
      description: 'Matière principale du sac',
      defaultValue: 'Cuir',
      categories: ['sacs-a-main', 'sacs-bandouliere', 'sacs-cabas', 'sacs-a-dos']
    },
    {
      id: uuidv4(),
      name: 'Nombre de poches',
      type: 'number',
      required: false,
      description: 'Nombre de poches intérieures et extérieures',
      defaultValue: 2,
      categories: ['sacs-a-main', 'sacs-bandouliere', 'sacs-cabas', 'sacs-a-dos']
    }
  ],
  
  // Bijoux (boucles d'oreilles, bracelets, bagues, colliers)
  'boucles-oreilles': [
    {
      id: uuidv4(),
      name: 'Matière',
      type: 'select',
      options: ['Argent', 'Or', 'Acier inoxydable', 'Plaqué or', 'Laiton', 'Alliage'],
      required: true,
      description: 'Matière principale du bijou',
      defaultValue: 'Argent',
      categories: ['boucles-oreilles', 'bracelets', 'bagues', 'colliers', 'pendentifs']
    },
    {
      id: uuidv4(),
      name: 'Type de pierre',
      type: 'text',
      required: false,
      description: 'Type de pierre utilisée dans le bijou',
      defaultValue: '',
      categories: ['boucles-oreilles', 'bracelets', 'bagues', 'colliers', 'pendentifs']
    },
    {
      id: uuidv4(),
      name: 'Couleur',
      type: 'color',
      options: ['Or', 'Argent', 'Rose', 'Noir', 'Blanc', 'Multicolore'],
      required: true,
      description: 'Couleur principale du bijou',
      defaultValue: ['Argent'],
      categories: ['boucles-oreilles', 'bracelets', 'bagues', 'colliers', 'pendentifs']
    },
    {
      id: uuidv4(),
      name: 'Hypoallergénique',
      type: 'boolean',
      required: false,
      description: 'Le bijou est-il hypoallergénique ?',
      defaultValue: false,
      categories: ['boucles-oreilles', 'bracelets', 'bagues', 'colliers', 'pendentifs']
    }
  ]
};

// Function to get attributes for a specific category
export const getAttributesForCategory = (categorySlug: string): AttributeDefinition[] => {
  // Start with common attributes
  let attributes = [...commonAttributes];
  
  // Add category-specific attributes
  for (const [key, value] of Object.entries(categoryAttributes)) {
    if (key === categorySlug || value.some(attr => attr.categories.includes(categorySlug))) {
      // Add attributes that match this category
      const matchingAttributes = value.filter(attr => 
        attr.categories.includes(categorySlug) || attr.categories.includes('all')
      );
      attributes = [...attributes, ...matchingAttributes];
    }
  }
  
  // Remove duplicates based on attribute name
  const uniqueAttributes = attributes.filter((attr, index, self) => 
    index === self.findIndex(a => a.name === attr.name)
  );
  
  return uniqueAttributes;
};