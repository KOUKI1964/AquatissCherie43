import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Search, Info, Filter, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AttributeGroup, ProductAttribute, AttributeDefinition, ProductFormData } from '../../types/product';
import { AttributeGroupEditor } from './AttributeGroupEditor';
import { getAttributesForCategory } from '../../data/attributeDefinitions';

interface DynamicAttributeFormProps {
  categoryId: string;
  categorySlug: string;
  formData: ProductFormData;
  onChange: (updatedFormData: ProductFormData) => void;
}

export function DynamicAttributeForm({
  categoryId,
  categorySlug,
  formData,
  onChange
}: DynamicAttributeFormProps) {
  const [availableAttributes, setAvailableAttributes] = useState<AttributeDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (categorySlug) {
      // Get attributes for this category
      const attributes = getAttributesForCategory(categorySlug);
      setAvailableAttributes(attributes);
      
      // If no attribute groups exist yet, create default ones
      if (formData.attributeGroups.length === 0) {
        const defaultGroups = createDefaultGroups(attributes);
        onChange({
          ...formData,
          attributeGroups: defaultGroups
        });
      }
    }
  }, [categorySlug]);

  const createDefaultGroups = (attributes: AttributeDefinition[]): AttributeGroup[] => {
    // Group common attributes
    const commonAttrs = attributes.filter(attr => attr.categories.includes('all'));
    const commonGroup: AttributeGroup = {
      id: uuidv4(),
      name: 'Attributs communs',
      attributes: commonAttrs.map((attr, index) => ({
        id: uuidv4(),
        name: attr.name,
        type: attr.type,
        options: attr.options,
        value: attr.defaultValue || (attr.type === 'multiselect' ? [] : ''),
        required: attr.required,
        description: attr.description,
        sortOrder: index
      })),
      sortOrder: 0
    };
    
    // Group category-specific attributes
    const specificAttrs = attributes.filter(attr => !attr.categories.includes('all'));
    const specificGroup: AttributeGroup = {
      id: uuidv4(),
      name: 'Attributs spécifiques',
      attributes: specificAttrs.map((attr, index) => ({
        id: uuidv4(),
        name: attr.name,
        type: attr.type,
        options: attr.options,
        value: attr.defaultValue || (attr.type === 'multiselect' ? [] : ''),
        required: attr.required,
        description: attr.description,
        sortOrder: index
      })),
      sortOrder: 1
    };
    
    return [commonGroup, specificGroup];
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = formData.attributeGroups.findIndex(group => group.id === active.id);
      const newIndex = formData.attributeGroups.findIndex(group => group.id === over.id);
      
      const updatedGroups = arrayMove(formData.attributeGroups, oldIndex, newIndex).map(
        (group, index) => ({ ...group, sortOrder: index })
      );
      
      onChange({
        ...formData,
        attributeGroups: updatedGroups
      });
    }
  };

  const handleUpdateGroup = (updatedGroup: AttributeGroup) => {
    const updatedGroups = formData.attributeGroups.map(group => 
      group.id === updatedGroup.id ? updatedGroup : group
    );
    
    onChange({
      ...formData,
      attributeGroups: updatedGroups
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    const updatedGroups = formData.attributeGroups
      .filter(group => group.id !== groupId)
      .map((group, index) => ({ ...group, sortOrder: index }));
    
    onChange({
      ...formData,
      attributeGroups: updatedGroups
    });
  };

  const handleAddGroup = () => {
    const newGroup: AttributeGroup = {
      id: uuidv4(),
      name: `Groupe ${formData.attributeGroups.length + 1}`,
      attributes: [],
      sortOrder: formData.attributeGroups.length
    };
    
    onChange({
      ...formData,
      attributeGroups: [...formData.attributeGroups, newGroup]
    });
  };

  // Filter groups based on search query
  const filteredGroups = formData.attributeGroups.filter(group => {
    if (!searchQuery) return true;
    
    // Check if group name matches
    if (group.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
    
    // Check if any attribute in the group matches
    return group.attributes.some(attr => 
      attr.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Attributs du produit</h2>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <Info className="h-5 w-5" />
          </button>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un attribut..."
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {showInfo && (
        <div className="bg-blue-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">À propos des attributs</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Les attributs permettent de définir les caractéristiques spécifiques de votre produit.</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Vous pouvez réorganiser les groupes d'attributs par glisser-déposer</li>
                  <li>Les attributs marqués d'un astérisque (*) sont obligatoires</li>
                  <li>Certains attributs sont communs à tous les produits, d'autres sont spécifiques à la catégorie</li>
                  <li>Vous pouvez ajouter des attributs supplémentaires selon vos besoins</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={formData.attributeGroups.map(group => group.id)}
          strategy={verticalListSortingStrategy}
        >
          {filteredGroups.map((group) => (
            <AttributeGroupEditor
              key={group.id}
              group={group}
              onUpdate={handleUpdateGroup}
              onDelete={handleDeleteGroup}
              availableAttributes={availableAttributes}
            />
          ))}
        </SortableContext>
      </DndContext>
      
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleAddGroup}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
        >
          <Plus className="h-5 w-5 mr-2" />
          Ajouter un groupe d'attributs
        </button>
      </div>
    </div>
  );
}