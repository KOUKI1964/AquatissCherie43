import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';
import { ProductFormData } from '../../types/product';

interface UniqueCodeGeneratorProps {
  formData: ProductFormData;
  onChange: (updatedFormData: ProductFormData) => void;
}

export function UniqueCodeGenerator({ formData, onChange }: UniqueCodeGeneratorProps) {
  const [uniqueCode, setUniqueCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Generate code when component mounts or when relevant attributes change
    generateUniqueCode();
  }, [formData.name, formData.category_id, formData.attributeGroups]);

  const generateUniqueCode = () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Extract key attributes for the code
      const productName = formData.name.trim();
      const categoryId = formData.category_id;
      
      if (!productName || !categoryId) {
        setError('Le nom du produit et la catégorie sont requis pour générer un code unique');
        setUniqueCode('');
        return;
      }
      
      // Get key attributes (like size, color) from attribute groups
      const allAttributes = formData.attributeGroups.flatMap(group => group.attributes);
      const keyAttributes = allAttributes.filter(attr => 
        ['Taille', 'Couleur', 'Matière'].includes(attr.name) && 
        (Array.isArray(attr.value) ? attr.value.length > 0 : attr.value)
      );
      
      // Create attribute part of the code
      let attributePart = '';
      if (keyAttributes.length > 0) {
        attributePart = keyAttributes.map(attr => {
          const value = Array.isArray(attr.value) 
            ? attr.value.join('-')
            : String(attr.value);
          return `${attr.name.substring(0, 3)}-${value}`;
        }).join('_');
      }
      
      // Create a base for the code
      const nameBase = productName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-zA-Z0-9]/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with a single one
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .substring(0, 10)
        .toUpperCase();
      
      // Generate random part (4 characters)
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      // Combine all parts
      const code = attributePart 
        ? `${nameBase}-${attributePart}-${randomPart}`
        : `${nameBase}-${randomPart}`;
      
      setUniqueCode(code);
      
      // Update form data with the generated code
      onChange({
        ...formData,
        metadata: {
          ...formData.metadata,
          uniqueCode: code
        }
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération du code unique');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(uniqueCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Code unique du produit</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={uniqueCode}
            readOnly
            className="block w-full pr-10 py-2 pl-3 border border-gray-300 rounded-md bg-gray-50 focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm font-mono"
            placeholder="Code unique"
          />
          {uniqueCode && (
            <button
              type="button"
              onClick={handleCopy}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Copy className="h-5 w-5 text-gray-400 hover:text-gray-500" />
              )}
            </button>
          )}
        </div>
        
        <button
          type="button"
          onClick={generateUniqueCode}
          disabled={isGenerating}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
          Régénérer
        </button>
      </div>
      
      <p className="mt-2 text-xs text-gray-500">
        Ce code unique est généré automatiquement en fonction des attributs du produit.
        Il sera utilisé pour identifier de manière unique cette combinaison d'attributs.
      </p>
    </div>
  );
}