import React, { useState, useEffect } from 'react';
import { X, Plus, Info, Hand as DragHandle, Trash, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { ProductAttribute, AttributeDefinition } from '../../types/product';
import { v4 as uuidv4 } from 'uuid';

interface AttributeEditorProps {
  attribute: ProductAttribute;
  onUpdate: (updatedAttribute: ProductAttribute) => void;
  onDelete: (attributeId: string) => void;
  availableAttributes: AttributeDefinition[];
  showDragHandle?: boolean;
}

export function AttributeEditor({
  attribute,
  onUpdate,
  onDelete,
  availableAttributes,
  showDragHandle = false
}: AttributeEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [attributeDefinition, setAttributeDefinition] = useState<AttributeDefinition | null>(null);

  useEffect(() => {
    // Find the attribute definition that matches this attribute
    const definition = availableAttributes.find(attr => attr.name === attribute.name);
    if (definition) {
      setAttributeDefinition(definition);
    }
  }, [attribute, availableAttributes]);

  const handleValueChange = (value: string | string[] | number | boolean) => {
    onUpdate({
      ...attribute,
      value
    });
  };

  const renderAttributeInput = () => {
    switch (attribute.type) {
      case 'text':
        return (
          <input
            type="text"
            value={attribute.value as string}
            onChange={(e) => handleValueChange(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={attribute.value as number}
            onChange={(e) => handleValueChange(parseFloat(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
          />
        );
      case 'boolean':
        return (
          <div className="mt-1 flex items-center">
            <input
              type="checkbox"
              checked={attribute.value as boolean}
              onChange={(e) => handleValueChange(e.target.checked)}
              className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              {attribute.value ? 'Oui' : 'Non'}
            </label>
          </div>
        );
      case 'select':
        return (
          <select
            value={attribute.value as string}
            onChange={(e) => handleValueChange(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
          >
            <option value="">Sélectionner une option</option>
            {attribute.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case 'multiselect':
        return (
          <div className="mt-1 space-y-2">
            {attribute.options?.map((option) => (
              <div key={option} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${attribute.id}-${option}`}
                  checked={(attribute.value as string[])?.includes(option)}
                  onChange={(e) => {
                    const currentValues = attribute.value as string[] || [];
                    if (e.target.checked) {
                      handleValueChange([...currentValues, option]);
                    } else {
                      handleValueChange(currentValues.filter(v => v !== option));
                    }
                  }}
                  className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                />
                <label htmlFor={`${attribute.id}-${option}`} className="ml-2 block text-sm text-gray-900">
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      case 'color':
        return (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              {attribute.options?.map((color) => (
                <div 
                  key={color}
                  onClick={() => {
                    const currentValues = attribute.value as string[] || [];
                    if (currentValues.includes(color)) {
                      handleValueChange(currentValues.filter(v => v !== color));
                    } else {
                      handleValueChange([...currentValues, color]);
                    }
                  }}
                  className={`
                    w-8 h-8 rounded-full cursor-pointer flex items-center justify-center
                    ${(attribute.value as string[])?.includes(color) 
                      ? 'ring-2 ring-offset-2 ring-[#8B1F38]' 
                      : 'ring-1 ring-gray-300'
                    }
                  `}
                  style={{ 
                    backgroundColor: getColorHex(color),
                    color: getContrastColor(color)
                  }}
                  title={color}
                >
                  {(attribute.value as string[])?.includes(color) && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return <p className="text-sm text-red-500">Type d'attribut non pris en charge</p>;
    }
  };

  // Helper function to get hex color from color name
  const getColorHex = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      'Noir': '#000000',
      'Blanc': '#FFFFFF',
      'Rouge': '#FF0000',
      'Bleu': '#0000FF',
      'Vert': '#008000',
      'Jaune': '#FFFF00',
      'Rose': '#FFC0CB',
      'Violet': '#800080',
      'Gris': '#808080',
      'Beige': '#F5F5DC',
      'Or': '#FFD700',
      'Argent': '#C0C0C0',
      'Multicolore': 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)'
    };
    
    return colorMap[colorName] || '#CCCCCC';
  };

  // Helper function to determine text color based on background
  const getContrastColor = (colorName: string): string => {
    const darkColors = ['Noir', 'Bleu', 'Vert', 'Violet', 'Rouge'];
    return darkColors.includes(colorName) ? '#FFFFFF' : '#000000';
  };

  return (
    <div className="border border-gray-200 rounded-md p-4 mb-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {showDragHandle && (
            <div className="cursor-move mr-2 text-gray-400 hover:text-gray-600">
              <DragHandle className="h-5 w-5" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-gray-900 font-medium"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            {attribute.name}
            {attribute.required && <span className="text-red-500 ml-1">*</span>}
          </button>
          {attribute.description && (
            <div className="relative ml-2">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Info className="h-4 w-4" />
              </button>
              {showTooltip && (
                <div className="absolute z-10 w-64 p-2 mt-1 text-sm text-gray-500 bg-white border border-gray-200 rounded-md shadow-lg">
                  {attribute.description}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(attribute.id)}
          className="text-gray-400 hover:text-red-500"
        >
          <Trash className="h-4 w-4" />
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-2">
          {renderAttributeInput()}
        </div>
      )}
    </div>
  );
}