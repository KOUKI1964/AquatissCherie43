import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
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
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Layers
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

export function MenuCategoriesPage() {
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

  useEffect(() => {
    checkAdminAccess();
    fetchCategories();
  }, []);

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

  const fetchCategories = async () => {
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
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Erreur lors du chargement des catégories');
    } finally {
      setIsLoading(false);
    }
  };

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
    setSuccess(null);

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
        setSuccess('Catégorie mise à jour avec succès');
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
        setSuccess('Catégorie créée avec succès');
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
      
      setSuccess('Catégorie supprimée avec succès');
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
      
      setSuccess('Catégorie déplacée avec succès');
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
      
      setSuccess('Catégorie déplacée au niveau racine avec succès');
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
      
      setSuccess('Ordre mis à jour avec succès');
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
      
      setSuccess(`Catégorie ${!currentActive ? 'activée' : 'désactivée'} avec succès`);
      await fetchCategories();
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la modification du statut');
    }
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

  const syncWithFrontendMenu = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // This would typically call a backend function to sync categories
      // For now, we'll just refresh the categories
      await fetchCategories();
      setSuccess('Synchronisation avec le menu frontend réussie');
    } catch (error: any) {
      setError('Erreur lors de la synchronisation: ' + error.message);
    } finally {
      setIsLoading(false);
    }
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
      <div className="flex-1 p-8">
        {error && (
          <div className="mb-4 bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-800">{success}</span>
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
                  <h1 className="text-2xl font-bold text-gray-900">Gestion des Menus et Catégories</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Gérez la structure de navigation du site et les catégories de produits
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={syncWithFrontendMenu}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Synchroniser avec le frontend
                </button>
                <button
                  onClick={() => setShowNewCategoryForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                >
                  <FolderPlus className="h-5 w-5 mr-2" />
                  Nouvelle entrée
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
                  placeholder="Rechercher..."
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
            {/* Formulaire */}
            {showNewCategoryForm && (
              <div className="mb-8 bg-gray-50 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    {editingCategory ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="p-1 hover:bg-gray-200 rounded-full"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Niveau
                    </label>
                    <select
                      value={form.parent_id || ''}
                      onChange={(e) => setForm({ ...form, parent_id: e.target.value || null })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                    >
                      <option value="">Menu principal</option>
                      {categories
                        .filter(c => !c.parent_id && c.id !== editingCategory?.id)
                        .map(category => (
                          <option key={category.id} value={category.id}>
                            Catégorie sous "{category.name}"
                          </option>
                        ))}
                      {categories
                        .filter(c => c.parent_id && !categories.some(child => child.parent_id === c.id) && c.id !== editingCategory?.id)
                        .map(category => {
                          const parent = categories.find(p => p.id === category.parent_id);
                          return (
                            <option key={category.id} value={category.id}>
                              Sous-catégorie sous "{parent?.name} &gt; {category.name}"
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="is_active"
                      name="is_active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Entrée active
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingCategory ? 'Mettre à jour' : 'Créer'}
                    </button>
                  </div>
                </form>
              </div>
            )}

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
                    Êtes-vous sûr de vouloir supprimer cette entrée ? Cette action est irréversible.
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