import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Home,
  Folder,
  FolderPlus,
  Edit,
  Trash2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Save,
  X,
  Check,
  AlertTriangle,
  Search,
  RefreshCw,
  Menu as MenuIcon,
  Move,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Layers,
  Info,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { z } from 'zod';
import { AdminSidebar } from '../../components/AdminSidebar';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  level?: number;
  path_name?: string;
  sort_order?: number;
}

interface CategoryHierarchy extends Category {
  children?: CategoryHierarchy[];
}

const categorySchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  parent_id: z.string().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().optional(),
});

export function CategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [hierarchicalCategories, setHierarchicalCategories] = useState<CategoryHierarchy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);
  const [productsInCategory, setProductsInCategory] = useState<number>(0);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [form, setForm] = useState({
    name: '',
    description: '',
    parent_id: null as string | null,
    is_active: true,
    sort_order: 0,
  });
  const [searchParentQuery, setSearchParentQuery] = useState('');
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Setup real-time subscription for category changes
  useEffect(() => {
    const categoriesSubscription = supabase
      .channel('categories-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_categories'
      }, () => {
        console.log('Categories table changed, refreshing data...');
        fetchCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(categoriesSubscription);
    };
  }, []);

  useEffect(() => {
    checkAdminAccess();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!adminData) {
      navigate('/admin/login');
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch categories with hierarchy information
      const { data: hierarchyData, error: hierarchyError } = await supabase
        .from('category_hierarchy_view')
        .select('*')
        .order('path_name');

      if (hierarchyError) throw hierarchyError;
      
      // Fetch regular categories for form operations
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      
      setCategories(categoriesData || []);
      
      // Build hierarchical structure
      const hierarchy = buildHierarchy(hierarchyData || []);
      setHierarchicalCategories(hierarchy);
      
      // Expand top-level categories by default
      const topLevelIds = hierarchy.map(cat => cat.id);
      setExpandedCategories(new Set(topLevelIds));
      
      // Cache the categories in localStorage for faster access
      localStorage.setItem('categories', JSON.stringify(categoriesData));
      localStorage.setItem('categoriesHierarchy', JSON.stringify(hierarchyData));
      localStorage.setItem('categoriesLastFetched', new Date().toISOString());
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Erreur lors du chargement des catégories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const buildHierarchy = (flatCategories: Category[]): CategoryHierarchy[] => {
    const categoryMap: Record<string, CategoryHierarchy> = {};
    const rootCategories: CategoryHierarchy[] = [];

    // First pass: create all category objects
    flatCategories.forEach(cat => {
      categoryMap[cat.id] = { ...cat, children: [] };
    });

    // Second pass: build the hierarchy
    flatCategories.forEach(cat => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        // This is a child category
        categoryMap[cat.parent_id].children?.push(categoryMap[cat.id]);
      } else if (!cat.parent_id) {
        // This is a root category
        rootCategories.push(categoryMap[cat.id]);
      }
    });

    // Sort root categories and their children
    return rootCategories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      categorySchema.parse(form);

      // Generate slug from name
      const slug = form.name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      if (editingCategory) {
        const { error } = await supabase
          .from('product_categories')
          .update({
            name: form.name,
            slug,
            description: form.description || null,
            parent_id: form.parent_id,
            is_active: form.is_active,
            sort_order: form.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        setToastMessage('Catégorie mise à jour avec succès');
        setShowSuccessToast(true);
      } else {
        // Get max sort_order for the parent level
        let maxSortOrder = 0;
        if (form.parent_id) {
          const siblings = categories.filter(c => c.parent_id === form.parent_id);
          maxSortOrder = Math.max(0, ...siblings.map(c => c.sort_order || 0));
        } else {
          const rootCategories = categories.filter(c => !c.parent_id);
          maxSortOrder = Math.max(0, ...rootCategories.map(c => c.sort_order || 0));
        }

        const { error } = await supabase
          .from('product_categories')
          .insert({
            name: form.name,
            slug,
            description: form.description || null,
            parent_id: form.parent_id,
            is_active: form.is_active,
            sort_order: maxSortOrder + 1,
          });

        if (error) throw error;
        setToastMessage('Catégorie créée avec succès');
        setShowSuccessToast(true);
      }

      await fetchCategories();
      resetForm();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else {
        setError(error.message || 'Une erreur est survenue');
      }
    }
  };

  const checkCategoryUsage = async (categoryId: string) => {
    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (error) throw error;
      
      setProductsInCategory(count || 0);
      return count || 0;
    } catch (error) {
      console.error('Error checking category usage:', error);
      return 0;
    }
  };

  const confirmDelete = async (categoryId: string) => {
    const count = await checkCategoryUsage(categoryId);
    setShowDeleteConfirmation(categoryId);
  };

  const handleDelete = async (categoryId: string) => {
    try {
      // Check if category has children
      const hasChildren = categories.some(c => c.parent_id === categoryId);
      
      if (hasChildren) {
        setError('Impossible de supprimer une catégorie qui contient des sous-catégories');
        setShowDeleteConfirmation(null);
        return;
      }
      
      // Check if category is used by products
      const count = await checkCategoryUsage(categoryId);
      
      if (count > 0) {
        setError(`Impossible de supprimer une catégorie utilisée par ${count} produit(s)`);
        setShowDeleteConfirmation(null);
        return;
      }

      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      setToastMessage('Catégorie supprimée avec succès');
      setShowSuccessToast(true);
      await fetchCategories();
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la suppression');
    } finally {
      setShowDeleteConfirmation(null);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      parent_id: null,
      is_active: true,
      sort_order: 0,
    });
    setEditingCategory(null);
    setShowNewCategoryForm(false);
    setSearchParentQuery('');
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id,
      is_active: category.is_active,
      sort_order: category.sort_order || 0,
    });
    setShowNewCategoryForm(true);
  };

  const getCategoryLevel = (category: Category): string => {
    if (!category.parent_id) return 'Menu principal';
    
    const parentCategory = categories.find(c => c.id === category.parent_id);
    if (!parentCategory?.parent_id) return 'Catégorie';
    
    return 'Sous-catégorie';
  };

  const handleDragStart = (e: React.DragEvent, categoryId: string) => {
    e.dataTransfer.setData('text/plain', categoryId);
    setDraggedCategory(categoryId);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    if (draggedCategory !== categoryId) {
      setDragOverCategory(categoryId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    setDraggedCategory(null);
    setDragOverCategory(null);
    
    if (draggedId === targetCategoryId) return;
    
    try {
      const draggedCategory = categories.find(c => c.id === draggedId);
      const targetCategory = categories.find(c => c.id === targetCategoryId);
      
      if (!draggedCategory || !targetCategory) return;
      
      // Check if we're trying to make a category its own ancestor
      let currentParent = targetCategory.parent_id;
      while (currentParent) {
        if (currentParent === draggedId) {
          setError("Impossible de déplacer une catégorie sous l'une de ses sous-catégories");
          return;
        }
        const parent = categories.find(c => c.id === currentParent);
        currentParent = parent?.parent_id || null;
      }
      
      // Move category to be a child of the target
      const { error } = await supabase
        .from('product_categories')
        .update({
          parent_id: targetCategoryId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draggedId);
        
      if (error) throw error;
      
      setToastMessage('Catégorie déplacée avec succès');
      setShowSuccessToast(true);
      await fetchCategories();
    } catch (error: any) {
      setError(error.message || 'Erreur lors du déplacement de la catégorie');
    }
  };

  const handleDropAsRoot = async (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    setDraggedCategory(null);
    setDragOverCategory(null);
    
    try {
      // Move category to be a root category
      const { error } = await supabase
        .from('product_categories')
        .update({
          parent_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draggedId);
        
      if (error) throw error;
      
      setToastMessage('Catégorie déplacée au niveau racine avec succès');
      setShowSuccessToast(true);
      await fetchCategories();
    } catch (error: any) {
      setError(error.message || 'Erreur lors du déplacement de la catégorie');
    }
  };

  const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;
      
      // Get siblings (categories at the same level)
      const siblings = categories.filter(c => 
        c.parent_id === category.parent_id && c.id !== categoryId
      );
      
      // Sort siblings by sort_order
      siblings.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      
      // Find current index
      const allCategoriesAtLevel = [category, ...siblings].sort((a, b) => 
        (a.sort_order || 0) - (b.sort_order || 0)
      );
      const currentIndex = allCategoriesAtLevel.findIndex(c => c.id === categoryId);
      
      if (direction === 'up' && currentIndex > 0) {
        // Swap with previous
        const prevCategory = allCategoriesAtLevel[currentIndex - 1];
        const prevSortOrder = prevCategory.sort_order || 0;
        const currentSortOrder = category.sort_order || 0;
        
        // Update both categories
        await supabase
          .from('product_categories')
          .update({ sort_order: prevSortOrder })
          .eq('id', categoryId);
          
        await supabase
          .from('product_categories')
          .update({ sort_order: currentSortOrder })
          .eq('id', prevCategory.id);
          
      } else if (direction === 'down' && currentIndex < allCategoriesAtLevel.length - 1) {
        // Swap with next
        const nextCategory = allCategoriesAtLevel[currentIndex + 1];
        const nextSortOrder = nextCategory.sort_order || 0;
        const currentSortOrder = category.sort_order || 0;
        
        // Update both categories
        await supabase
          .from('product_categories')
          .update({ sort_order: nextSortOrder })
          .eq('id', categoryId);
          
        await supabase
          .from('product_categories')
          .update({ sort_order: currentSortOrder })
          .eq('id', nextCategory.id);
      }
      
      setToastMessage('Ordre mis à jour avec succès');
      setShowSuccessToast(true);
      await fetchCategories();
    } catch (error: any) {
      setError(error.message || 'Erreur lors du changement d\'ordre');
    }
  };

  const toggleCategoryActive = async (categoryId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('product_categories')
        .update({
          is_active: !currentActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', categoryId);
        
      if (error) throw error;
      
      setToastMessage(`Catégorie ${!currentActive ? 'activée' : 'désactivée'} avec succès`);
      setShowSuccessToast(true);
      await fetchCategories();
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la modification du statut');
    }
  };

  const syncWithFrontendMenu = async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      // Clear the categories cache to force a refresh on the frontend
      localStorage.removeItem('frontendCategories');
      localStorage.removeItem('frontendCategoriesLastFetched');
      
      // Update the categories in the database to trigger the real-time subscription
      const { data: categories } = await supabase
        .from('product_categories')
        .select('id')
        .limit(1);
        
      if (categories && categories.length > 0) {
        // Update a timestamp field to trigger the subscription
        await supabase
          .from('product_categories')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', categories[0].id);
      }
      
      // Refresh the categories
      await fetchCategories();
      
      setToastMessage('Synchronisation avec le menu frontend réussie');
      setShowSuccessToast(true);
    } catch (error: any) {
      setError('Erreur lors de la synchronisation: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredParentCategories = categories
    .filter(c => {
      // Filter out the category being edited (to prevent circular references)
      if (editingCategory && c.id === editingCategory.id) return false;
      
      // Filter by search query if present
      if (searchParentQuery) {
        return c.name.toLowerCase().includes(searchParentQuery.toLowerCase());
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by level first, then by name
      const levelA = a.parent_id ? (categories.find(c => c.id === a.parent_id)?.parent_id ? 2 : 1) : 0;
      const levelB = b.parent_id ? (categories.find(c => c.id === b.parent_id)?.parent_id ? 2 : 1) : 0;
      
      if (levelA !== levelB) return levelA - levelB;
      return a.name.localeCompare(b.name);
    });

  const getCategoryPath = (category: Category): string => {
    if (!category.parent_id) return category.name;
    
    const parent = categories.find(c => c.id === category.parent_id);
    if (!parent) return category.name;
    
    if (!parent.parent_id) return `${parent.name} > ${category.name}`;
    
    const grandparent = categories.find(c => c.id === parent.parent_id);
    if (!grandparent) return `${parent.name} > ${category.name}`;
    
    return `${grandparent.name} > ${parent.name} > ${category.name}`;
  };

  const renderCategoryTree = (
    categories: CategoryHierarchy[],
    level = 0
  ): JSX.Element[] => {
    return categories
      .filter(category => {
        if (searchQuery) {
          return category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return true;
      })
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(category => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedCategories.has(category.id);
        const levelName = level === 0 ? 'Menu principal' : level === 1 ? 'Catégorie' : 'Sous-catégorie';
        const isDragging = draggedCategory === category.id;
        const isDragOver = dragOverCategory === category.id;

        return (
          <div 
            key={category.id}
            draggable
            onDragStart={(e) => handleDragStart(e, category.id)}
            onDragOver={(e) => handleDragOver(e, category.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, category.id)}
            className={`${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-2 border-blue-400' : ''}`}
          >
            <div 
              className={`flex items-center py-2 px-2 rounded-lg ${
                level === 0 
                  ? 'bg-gray-100 font-medium' 
                  : level === 1 
                    ? 'ml-6 hover:bg-gray-50' 
                    : 'ml-12 hover:bg-gray-50'
              }`}
            >
              <button
                onClick={() => toggleCategory(category.id)}
                className="p-1 hover:bg-gray-200 rounded-full mr-2"
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )
                ) : (
                  <div className="w-4" />
                )}
              </button>
              
              <div className="p-1 mr-2">
                <Move className="h-4 w-4 text-gray-400 cursor-move" />
              </div>
              
              <Folder className={`h-5 w-5 mr-2 ${
                level === 0 
                  ? 'text-[#8B1F38]' 
                  : level === 1 
                    ? 'text-blue-500' 
                    : 'text-green-500'
              }`} />
              
              <div className="flex-1">
                <span className="text-sm">{category.name}</span>
                <span className="ml-2 text-xs text-gray-500">({levelName})</span>
                {!category.is_active && (
                  <span className="ml-2 text-xs text-red-500">(Inactive)</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => moveCategory(category.id, 'up')}
                  className="p-1 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-700"
                  title="Monter"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveCategory(category.id, 'down')}
                  className="p-1 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-700"
                  title="Descendre"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleCategoryActive(category.id, category.is_active)}
                  className={`p-1 hover:bg-gray-200 rounded-full ${
                    category.is_active ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'
                  }`}
                  title={category.is_active ? 'Désactiver' : 'Activer'}
                >
                  {category.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => startEdit(category)}
                  className="p-1 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-700"
                  title="Modifier"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => confirmDelete(category.id)}
                  className="p-1 hover:bg-gray-200 rounded-full text-red-500 hover:text-red-700"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {isExpanded && hasChildren && (
              <div>
                {renderCategoryTree(category.children || [], level + 1)}
              </div>
            )}
          </div>
        );
      });
  };

  const renderCategoryList = () => {
    return categories
      .filter(category => {
        if (searchQuery) {
          return category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by level first, then by sort_order
        const levelA = a.parent_id ? (categories.find(c => c.id === a.parent_id)?.parent_id ? 2 : 1) : 0;
        const levelB = b.parent_id ? (categories.find(c => c.id === b.parent_id)?.parent_id ? 2 : 1) : 0;
        
        if (levelA !== levelB) return levelA - levelB;
        return (a.sort_order || 0) - (b.sort_order || 0);
      })
      .map(category => {
        const level = category.parent_id 
          ? (categories.find(c => c.id === category.parent_id)?.parent_id ? 2 : 1) 
          : 0;
        const levelName = level === 0 ? 'Menu principal' : level === 1 ? 'Catégorie' : 'Sous-catégorie';
        const parentName = category.parent_id 
          ? categories.find(c => c.id === category.parent_id)?.name 
          : null;
        const grandParentName = parentName && categories.find(c => c.id === category.parent_id)?.parent_id
          ? categories.find(c => c.id === categories.find(c => c.id === category.parent_id)?.parent_id)?.name
          : null;
        
        return (
          <div 
            key={category.id}
            className="border-b border-gray-200 last:border-b-0"
          >
            <div className="flex items-center py-3 px-4 hover:bg-gray-50">
              <Folder className={`h-5 w-5 mr-3 ${
                level === 0 
                  ? 'text-[#8B1F38]' 
                  : level === 1 
                    ? 'text-blue-500' 
                    : 'text-green-500'
              }`} />
              
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="font-medium">{category.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({levelName})</span>
                  {!category.is_active && (
                    <span className="ml-2 text-xs text-red-500">(Inactive)</span>
                  )}
                </div>
                
                {parentName && (
                  <div className="text-xs text-gray-500">
                    {grandParentName 
                      ? `${grandParentName} > ${parentName}`
                      : `Sous ${parentName}`
                    }
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleCategoryActive(category.id, category.is_active)}
                  className={`p-1 hover:bg-gray-200 rounded-full ${
                    category.is_active ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'
                  }`}
                  title={category.is_active ? 'Désactiver' : 'Activer'}
                >
                  {category.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => startEdit(category)}
                  className="p-1 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-700"
                  title="Modifier"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => confirmDelete(category.id)}
                  className="p-1 hover:bg-gray-200 rounded-full text-red-500 hover:text-red-700"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 p-8 transition-all duration-300" id="content">
        {error && (
          <div className="mb-4 bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed top-4 right-4 bg-green-50 p-4 rounded-lg shadow-lg z-50 animate-fade-in-out">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-800">{toastMessage}</span>
              <button 
                onClick={() => setShowSuccessToast(false)}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm">
          {/* En-tête */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/admin/dashboard"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                  >
                    <Home className="h-5 w-5 mr-2" />
                    Tableau de bord
                  </Link>
                  <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Gérez les catégories de produits
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={syncWithFrontendMenu}
                  disabled={isSyncing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Synchronisation...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Synchroniser avec le frontend
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowNewCategoryForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                >
                  <FolderPlus className="h-5 w-5 mr-2" />
                  Nouvelle catégorie
                </button>
              </div>
            </div>
          </div>

          {/* Recherche et filtres */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="relative flex-grow max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une catégorie..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`p-2 rounded-md ${viewMode === 'tree' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  title="Vue arborescente"
                >
                  <MenuIcon className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  title="Vue liste"
                >
                  <Layers className="h-5 w-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-6">
            {/* Zone de drop pour les catégories racines */}
            <div 
              className={`mb-4 p-4 border-2 border-dashed rounded-lg ${
                draggedCategory ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropAsRoot}
            >
              <div className="text-center text-gray-500">
                <p>Déposez ici pour créer une entrée de menu principal</p>
              </div>
            </div>

            {/* Liste des catégories */}
            <div className="bg-white rounded-lg">
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <Folder className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune catégorie</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Commencez par créer une nouvelle catégorie.
                  </p>
                </div>
              ) : viewMode === 'tree' ? (
                <div className="divide-y divide-gray-200">
                  {renderCategoryTree(hierarchicalCategories)}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {renderCategoryList()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shopify-style Category Modal */}
        {showNewCategoryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    title="Aide"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de la catégorie
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Ex: Robes d'été"
                      autoFocus
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catégorie parente
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.parent_id ? getCategoryPath(categories.find(c => c.id === form.parent_id) || { id: '', name: '', slug: '', parent_id: null, is_active: true }) : ''}
                        onClick={() => setShowParentDropdown(true)}
                        onFocus={() => setShowParentDropdown(true)}
                        onChange={(e) => setSearchParentQuery(e.target.value)}
                        placeholder="Sélectionner une catégorie parente (optionnel)"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    {showParentDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md max-h-60 overflow-auto">
                        <div className="p-2 border-b border-gray-200">
                          <input
                            type="text"
                            value={searchParentQuery}
                            onChange={(e) => setSearchParentQuery(e.target.value)}
                            placeholder="Rechercher une catégorie..."
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <ul className="py-1">
                          <li 
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => {
                              setForm({ ...form, parent_id: null });
                              setShowParentDropdown(false);
                              setSearchParentQuery('');
                            }}
                          >
                            <span className="font-medium">Menu principal</span>
                          </li>
                          {filteredParentCategories.map((category) => {
                            const level = category.parent_id 
                              ? (categories.find(c => c.id === category.parent_id)?.parent_id ? 2 : 1) 
                              : 0;
                            
                            return (
                              <li 
                                key={category.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onClick={() => {
                                  setForm({ ...form, parent_id: category.id });
                                  setShowParentDropdown(false);
                                  setSearchParentQuery('');
                                }}
                              >
                                <div className="flex items-center">
                                  {level === 0 && (
                                    <span className="font-medium">{category.name}</span>
                                  )}
                                  {level === 1 && (
                                    <span>
                                      <span className="text-gray-500">
                                        {categories.find(c => c.id === category.parent_id)?.name} &gt;{' '}
                                      </span>
                                      <span className="font-medium">{category.name}</span>
                                    </span>
                                  )}
                                  {level === 2 && (
                                    <span>
                                      <span className="text-gray-500">
                                        {categories.find(c => c.id === categories.find(p => p.id === category.parent_id)?.parent_id)?.name} &gt;{' '}
                                        {categories.find(c => c.id === category.parent_id)?.name} &gt;{' '}
                                      </span>
                                      <span className="font-medium">{category.name}</span>
                                    </span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optionnelle)
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Description de la catégorie..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      id="is_active"
                      name="is_active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Catégorie active
                    </label>
                  </div>

                  {form.parent_id && (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <Info className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700">
                            Chemin complet: <span className="font-medium">{getCategoryPath(categories.find(c => c.id === form.parent_id) || { id: '', name: '', slug: '', parent_id: null, is_active: true })}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-between">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingCategory ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2 text-[#8B1F38]" />
                  Guide d'utilisation des catégories
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">Structure des catégories</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Notre système de catégories est organisé en trois niveaux hiérarchiques :
                    </p>
                    <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                      <li><span className="font-medium">Menu principal</span> : Premier niveau, visible dans la navigation principale du site</li>
                      <li><span className="font-medium">Catégorie</span> : Deuxième niveau, regroupement intermédiaire</li>
                      <li><span className="font-medium">Sous-catégorie</span> : Troisième niveau, catégories spécifiques où sont classés les produits</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">Créer une nouvelle catégorie</h4>
                    <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-2">
                      <li>
                        <span className="font-medium">Nom de la catégorie</span> : Entrez un nom clair et descriptif. Ce nom sera visible par les clients.
                      </li>
                      <li>
                        <span className="font-medium">Catégorie parente</span> : Sélectionnez où cette catégorie doit apparaître dans la hiérarchie.
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Pour créer une entrée de menu principal, laissez ce champ vide</li>
                          <li>Pour créer une catégorie, sélectionnez une entrée de menu principal</li>
                          <li>Pour créer une sous-catégorie, sélectionnez une catégorie</li>
                        </ul>
                      </li>
                      <li>
                        <span className="font-medium">Description</span> : Optionnelle, mais utile pour le référencement SEO et pour clarifier le contenu de la catégorie.
                      </li>
                      <li>
                        <span className="font-medium">Catégorie active</span> : Décochez cette case pour masquer temporairement la catégorie sur le site sans la supprimer.
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">Gestion des catégories</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                      <li>
                        <span className="font-medium">Glisser-déposer</span> : Vous pouvez réorganiser les catégories en les faisant glisser vers une autre catégorie ou vers la zone "Menu principal".
                      </li>
                      <li>
                        <span className="font-medium">Flèches haut/bas</span> : Utilisez ces boutons pour changer l'ordre d'affichage des catégories de même niveau.
                      </li>
                      <li>
                        <span className="font-medium">Activer/Désactiver</span> : L'icône d'œil permet de rendre une catégorie visible ou invisible sur le site.
                      </li>
                      <li>
                        <span className="font-medium">Modifier</span> : Permet de changer les propriétés d'une catégorie existante.
                      </li>
                      <li>
                        <span className="font-medium">Supprimer</span> : Supprime définitivement une catégorie. Attention : vous ne pouvez pas supprimer une catégorie qui contient des sous-catégories ou des produits.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">Bonnes pratiques</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                      <li>Limitez-vous à 3 niveaux de profondeur pour une navigation optimale</li>
                      <li>Utilisez des noms courts et descriptifs pour les catégories</li>
                      <li>Évitez de créer trop de catégories de premier niveau</li>
                      <li>Assurez-vous que chaque produit est correctement classé</li>
                      <li>Utilisez la vue arborescente pour visualiser la hiérarchie complète</li>
                      <li>Utilisez la vue liste pour une gestion rapide de nombreuses catégories</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Info className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Astuce</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>
                            Après avoir modifié la structure des catégories, cliquez sur "Synchroniser avec le frontend" pour vous assurer que les changements sont immédiatement visibles sur le site.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation de suppression */}
        {showDeleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmer la suppression
                </h3>
              </div>
              
              {productsInCategory > 0 ? (
                <div>
                  <p className="text-red-600 mb-4">
                    Cette catégorie est utilisée par {productsInCategory} produit(s). Veuillez d'abord retirer ces produits de la catégorie.
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowDeleteConfirmation(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-500 mb-4">
                    Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirmation(null)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleDelete(showDeleteConfirmation)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}