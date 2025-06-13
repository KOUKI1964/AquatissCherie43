import React, { useState, useEffect } from 'react';
import { Plus, Minus, RefreshCw, AlertCircle } from 'lucide-react';
import { ProductFormData, ProductVariant, ProductAttribute } from '../../types/product';
import { v4 as uuidv4 } from 'uuid';

interface VariantGeneratorProps {
  formData: ProductFormData;
  onChange: (updatedFormData: ProductFormData) => void;
}

export function VariantGenerator({ formData, onChange }: VariantGeneratorProps) {
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all attributes from all groups
  const allAttributes = formData.attributeGroups.flatMap(group => group.attributes);
  
  // Filter attributes that can be used for variants (multiselect, select, color)
  const variantableAttributes = allAttributes.filter(attr => 
    ['multiselect', 'select', 'color'].includes(attr.type)
  );

  const handleAttributeToggle = (attributeName: string) => {
    setSelectedAttributes(prev => {
      if (prev.includes(attributeName)) {
        return prev.filter(name => name !== attributeName);
      } else {
        return [...prev, attributeName];
      }
    });
  };

  const generateVariants = () => {
    if (selectedAttributes.length === 0) {
      setError('Veuillez sélectionner au moins un attribut pour générer des variantes');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Get the selected attributes with their values
      const attributesForVariants = selectedAttributes.map(name => {
        const attribute = allAttributes.find(attr => attr.name === name);
        if (!attribute) throw new Error(`Attribut ${name} non trouvé`);
        return attribute;
      });
      
      // Generate all possible combinations
      const variants = generateCombinations(attributesForVariants);
      
      // Create variant objects
      const newVariants: ProductVariant[] = variants.map((combination, index) => {
        // Generate a unique SKU for each variant
        const variantSku = `${formData.sku}-${index + 1}`;
        
        // Create attributes object
        const attributes: Record<string, any> = {};
        combination.forEach(({ name, value }) => {
          attributes[name] = value;
        });
        
        return {
          id: uuidv4(),
          sku: variantSku,
          price: formData.price,
          sale_price: formData.sale_price,
          stock_quantity: formData.stock_quantity,
          attributes
        };
      });
      
      // Update form data with new variants
      onChange({
        ...formData,
        variants: newVariants
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération des variantes');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to generate all possible combinations of attribute values
  const generateCombinations = (attributes: ProductAttribute[]) => {
    // Start with an empty combination
    let combinations: Array<Array<{name: string, value: any}>> = [[]];
    
    // For each attribute
    attributes.forEach(attribute => {
      const { name, value, type } = attribute;
      
      // Get all possible values for this attribute
      let values: any[] = [];
      
      if (type === 'multiselect' || type === 'color') {
        // For multiselect, use the selected values
        values = value as string[];
      } else if (type === 'select') {
        // For select, use the single selected value
        values = [value];
      }
      
      if (values.length === 0) {
        throw new Error(`Aucune valeur sélectionnée pour l'attribut ${name}`);
      }
      
      // Create new combinations by adding each value to existing combinations
      const newCombinations: Array<Array<{name: string, value: any}>> = [];
      
      combinations.forEach(combo => {
        values.forEach(val => {
          newCombinations.push([...combo, { name, value: val }]);
        });
      });
      
      combinations = newCombinations;
    });
    
    return combinations;
  };

  const handleRemoveVariant = (variantId: string) => {
    onChange({
      ...formData,
      variants: formData.variants.filter(v => v.id !== variantId)
    });
  };

  const handleUpdateVariant = (updatedVariant: ProductVariant) => {
    onChange({
      ...formData,
      variants: formData.variants.map(v => 
        v.id === updatedVariant.id ? updatedVariant : v
      )
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Générer des variantes</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
        
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Sélectionnez les attributs à utiliser pour générer des variantes de produit.
            Chaque combinaison possible créera une variante distincte.
          </p>
          
          <div className="space-y-2">
            {variantableAttributes.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucun attribut disponible pour générer des variantes. 
                Ajoutez des attributs de type sélection ou multi-sélection.
              </p>
            ) : (
              variantableAttributes.map(attribute => (
                <div key={attribute.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`variant-${attribute.id}`}
                    checked={selectedAttributes.includes(attribute.name)}
                    onChange={() => handleAttributeToggle(attribute.name)}
                    className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                  />
                  <label htmlFor={`variant-${attribute.id}`} className="ml-2 block text-sm text-gray-900">
                    {attribute.name}
                    {attribute.type === 'multiselect' || attribute.type === 'color' ? (
                      <span className="text-xs text-gray-500 ml-1">
                        ({(attribute.value as string[])?.length || 0} valeurs sélectionnées)
                      </span>
                    ) : null}
                  </label>
                </div>
              ))
            )}
          </div>
          
          <button
            type="button"
            onClick={generateVariants}
            disabled={isGenerating || selectedAttributes.length === 0}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Générer les variantes
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Variants List */}
      {formData.variants.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Variantes ({formData.variants.length})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attributs
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.variants.map((variant) => (
                  <tr key={variant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {variant.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Object.entries(variant.attributes).map(([key, value]) => (
                        <span key={key} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                          {key}: {Array.isArray(value) ? value.join(', ') : value}
                        </span>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) => handleUpdateVariant({
                          ...variant,
                          price: parseFloat(e.target.value)
                        })}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <input
                        type="number"
                        min="0"
                        value={variant.stock_quantity}
                        onChange={(e) => handleUpdateVariant({
                          ...variant,
                          stock_quantity: parseInt(e.target.value)
                        })}
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(variant.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}