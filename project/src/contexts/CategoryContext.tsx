import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  level?: number;
  path_name?: string;
  path_slug?: string;
}

interface CategoryContextType {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
  getCategoryBySlug: (slug: string) => Category | null;
  getChildCategories: (parentId: string) => Category[];
  getParentCategory: (childId: string) => Category | null;
  getCategoryPath: (categoryId: string) => Category[];
}

const CategoryContext = createContext<CategoryContextType>({
  categories: [],
  isLoading: false,
  error: null,
  refreshCategories: async () => {},
  getCategoryBySlug: () => null,
  getChildCategories: () => [],
  getParentCategory: () => null,
  getCategoryPath: () => []
});

export const useCategories = () => useContext(CategoryContext);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();

    // Setup real-time subscription for category changes
    const categoriesSubscription = supabase
      .channel('public:product_categories')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_categories'
      }, () => {
        console.log('Categories changed, refreshing data...');
        // Clear cache and fetch fresh data
        localStorage.removeItem('frontendCategories');
        localStorage.removeItem('frontendCategoriesLastFetched');
        fetchCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(categoriesSubscription);
    };
  }, []);

  const fetchCategories = async () => {
    try {
      setError(null);
      
      // Check if we have cached categories and they're not too old
      const cachedCategories = localStorage.getItem('frontendCategories');
      const lastFetched = localStorage.getItem('frontendCategoriesLastFetched');
      
      // Use cache if it exists and is less than 5 minutes old
      if (cachedCategories && lastFetched) {
        const cacheAge = Date.now() - new Date(lastFetched).getTime();
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          const parsedCategories = JSON.parse(cachedCategories);
          if (parsedCategories && parsedCategories.length > 0) {
            console.log('Using cached categories');
            setCategories(parsedCategories);
            setIsLoading(false);
            return;
          }
        }
      }
      
      setIsLoading(true);
      
      // Fetch categories from database
      const { data, error } = await supabase
        .from('category_hierarchy_view')
        .select('*')
        .eq('is_active', true)
        .order('path_name');
        
      if (error) throw error;
      
      // Cache the categories
      localStorage.setItem('frontendCategories', JSON.stringify(data));
      localStorage.setItem('frontendCategoriesLastFetched', new Date().toISOString());
      
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryBySlug = (slug: string): Category | null => {
    return categories.find(category => category.slug === slug) || null;
  };

  const getChildCategories = (parentId: string): Category[] => {
    return categories.filter(category => category.parent_id === parentId);
  };

  const getParentCategory = (childId: string): Category | null => {
    const child = categories.find(category => category.id === childId);
    if (!child || !child.parent_id) return null;
    return categories.find(category => category.id === child.parent_id) || null;
  };

  const getCategoryPath = (categoryId: string): Category[] => {
    const result: Category[] = [];
    let current = categories.find(c => c.id === categoryId);
    
    while (current) {
      result.unshift(current);
      if (!current.parent_id) break;
      current = categories.find(c => c.id === current?.parent_id);
    }
    
    return result;
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        isLoading,
        error,
        refreshCategories: fetchCategories,
        getCategoryBySlug,
        getChildCategories,
        getParentCategory,
        getCategoryPath
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}