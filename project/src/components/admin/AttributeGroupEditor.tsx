import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X, Hand as DragHandle, ChevronDown, ChevronUp } from 'lucide-react';
import { AttributeGroup, ProductAttribute, AttributeDefinition } from '../../types/product';
import { AttributeEditor } from './AttributeEditor';
import { v4 as uuidv4 } from 'uuid';

interface AttributeGroupEditorProps {
  group: AttributeGroup;
  onUpdate: (updatedGroup: AttributeGroup) => void;
  onDelete: (groupId: string) => void;
  availableAttributes: AttributeDefinition[];
}

export function AttributeGroupEditor({
  group,
  onUpdate,
  onDelete,
  availableAttributes
}: AttributeGroupEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAttributeSelector, setShowAttributeSelector] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    id: group.id,
    data: {
      type: 'group',
      group
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const handleUpdateAttribute = (updatedAttribute: ProductAttribute) => {
    const updatedAttributes = group.attributes.map(attr => 
      attr.id === updatedAttribute.id ? updatedAttribute : attr
    );
    
    onUpdate({
      ...group,
      attributes: updatedAttributes
    });
  };

  const handleDeleteAttribute = (attributeId: string) => {
    const updatedAttributes = group.attributes.filter(attr => attr.id !== attributeId);
    
    onUpdate({
      ...group,
      attributes: updatedAttributes
    });
  };

  const handleAddAttribute = (attributeDef: AttributeDefinition) => {
    // Create a new attribute based on the definition
    const newAttribute: ProductAttribute = {
      id: uuidv4(),
      name: attributeDef.name,
      type: attributeDef.type,
      options: attributeDef.options,
      value: attributeDef.defaultValue || (attributeDef.type === 'multiselect' ? [] : ''),
      required: attributeDef.required,
      description: attributeDef.description,
      sortOrder: group.attributes.length
    };
    
    onUpdate({
      ...group,
      attributes: [...group.attributes, newAttribute]
    });
    
    setShowAttributeSelector(false);
  };

  // Filter out attributes that are already in the group
  const availableAttributesToAdd = availableAttributes.filter(
    attr => !group.attributes.some(groupAttr => groupAttr.name === attr.name)
  );

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50"
      {...attributes}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="cursor-move mr-2 text-gray-400 hover:text-gray-600" {...listeners}>
            <DragHandle className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-lg font-medium text-gray-900"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 mr-1" />
            ) : (
              <ChevronDown className="h-5 w-5 mr-1" />
            )}
            {group.name}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onDelete(group.id)}
          className="text-gray-400 hover:text-red-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {isExpanded && (
        <>
          {/* Attributes */}
          <div className="space-y-3">
            {group.attributes.map((attribute) => (
              <AttributeEditor
                key={attribute.id}
                attribute={attribute}
                onUpdate={handleUpdateAttribute}
                onDelete={handleDeleteAttribute}
                availableAttributes={availableAttributes}
                showDragHandle={true}
              />
            ))}
          </div>
          
          {/* Add Attribute Button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAttributeSelector(!showAttributeSelector)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un attribut
            </button>
            
            {/* Attribute Selector */}
            {showAttributeSelector && (
              <div className="mt-2 p-3 border border-gray-200 rounded-md bg-white">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Sélectionner un attribut</h4>
                {availableAttributesToAdd.length === 0 ? (
                  <p className="text-sm text-gray-500">Tous les attributs disponibles ont déjà été ajoutés.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto">
                    {availableAttributesToAdd.map((attr) => (
                      <button
                        key={attr.id}
                        type="button"
                        onClick={() => handleAddAttribute(attr)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center justify-between"
                      >
                        <span>{attr.name}</span>
                        <Plus className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}