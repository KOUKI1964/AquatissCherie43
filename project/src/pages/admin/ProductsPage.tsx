import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Home,
  Edit,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  Image as ImageIcon,
  Package,
  Tag,
  Box,
  Percent,
  Check,
  X,
  Key,
  Truck,
  Copy
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminSidebar } from '../../components/AdminSidebar';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  status: 'draft' | 'published' | 'archived';
  category_id: string;
  supplier_code: string;
  created_at: string;
  updated_at: string;
  product_categories?: {
    name: string;
  };
  product_media: {
    media_id: string;
    is_primary: boolean;
    sort_order: number;
    media_files: {
      url: string;
    };
  }[];
  metadata?: {
    discount_key?: string;
    isVariant?: boolean;
    parentProductId?: string;
    variantSuffix?: string;
  };
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Supplier {
  id: string;
  name: string;
  supplier_code: string;
  type: 'local' | 'dropshipping' | 'mixte';
  is_active: boolean;
}

interface FilterState {
  search: string;
  category: string;
  supplier: string;
  status: string;
  stockStatus: string;
  priceRange: {
    min: string;
    max: string;
  };
  isVariant: string;
}

interface DiscountKey {
  id: string;
  type: 'silver' | 'bronze' | 'gold';
  percentage: number;
}

const KEY_TYPES = {
  silver: { name: 'Argent', color: '#C0C0C0' },
  bronze: { name: 'Bronze', color: '#CD7F32' },
  gold: { name: 'Or', color: '#FFD700' }
};

export function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [discountKeys, setDiscountKeys] = useState<Record<string, DiscountKey>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    supplier: '',
    status: '',
    stockStatus: '',
    priceRange: {
      min: '',
      max: ''
    },
    isVariant: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [parentProducts, setParentProducts] = useState<Record<string, Product>>({});

  useEffect(() => {
    checkAdminAccess();
    fetchCategories();
    fetchProducts();
    fetchDiscountKeys();
    fetchSuppliers();
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
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Erreur lors du chargement des catégories');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, supplier_code, type, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setError('Erreur lors du chargement des fournisseurs');
    }
  };

  const fetchDiscountKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_keys')
        .select('*');

      if (error) throw error;

      const keysMap: Record<string, DiscountKey> = {};
      data?.forEach(key => {
        keysMap[key.id] = key;
      });
      setDiscountKeys(keysMap);
    } catch (error) {
      console.error('Error fetching discount keys:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('product_media_view')
        .select(`
          products (
            id,
            name,
            sku,
            price,
            sale_price,
            stock_quantity,
            status,
            category_id,
            supplier_code,
            created_at,
            updated_at,
            metadata,
            product_categories (
              name
            )
          ),
          media_id,
          is_primary,
          sort_order,
          media_url
        `)
        .order('sort_order');

      const { data: mediaData, error: mediaError } = await query;

      if (mediaError) throw mediaError;

      // Group media by product
      const productsMap = new Map();
      mediaData?.forEach((item: any) => {
        const product = item.products;
        if (!productsMap.has(product.id)) {
          productsMap.set(product.id, {
            ...product,
            product_media: []
          });
        }
        productsMap.get(product.id).product_media.push({
          media_id: item.media_id,
          is_primary: item.is_primary,
          sort_order: item.sort_order,
          media_files: {
            url: item.media_url
          }
        });
      });

      // Get products without media as well
      const { data: productsWithoutMedia, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          price,
          sale_price,
          stock_quantity,
          status,
          category_id,
          supplier_code,
          created_at,
          updated_at,
          metadata,
          product_categories (
            name
          )
        `)
        .not('id', 'in', `(${Array.from(productsMap.keys()).join(',')})`);

      if (productsError) throw productsError;

      // Add products without media
      productsWithoutMedia?.forEach(product => {
        productsMap.set(product.id, {
          ...product,
          product_media: []
        });
      });

      // Convert map to array
      const allProducts = Array.from(productsMap.values());
      setProducts(allProducts);

      // Fetch parent products for variants
      const parentIds = allProducts
        .filter(p => p.metadata?.isVariant && p.metadata?.parentProductId)
        .map(p => p.metadata?.parentProductId);

      if (parentIds.length > 0) {
        const { data: parentProductsData } = await supabase
          .from('products')
          .select('id, name, sku')
          .in('id', parentIds);

        if (parentProductsData) {
          const parentMap: Record<string, Product> = {};
          parentProductsData.forEach(parent => {
            parentMap[parent.id] = parent;
          });
          setParentProducts(parentMap);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Erreur lors du chargement des produits');
    } finally {
      setIsLoading(false);
    }
  };

  const getProductImage = (product: Product): string | null => {
    if (product.product_media && product.product_media.length > 0) {
      const primaryMedia = product.product_media.find(media => media.is_primary);
      if (primaryMedia?.media_files?.url) {
        return primaryMedia.media_files.url;
      }
      return product.product_media[0].media_files?.url || null;
    }
    return null;
  };

  const getSupplierName = (supplierCode: string): string => {
    const supplier = suppliers.find(s => s.supplier_code === supplierCode);
    return supplier ? supplier.name : 'Non défini';
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    fetchProducts();
  };

  const handleFilterChange = (key: string, value: string | { min: string; max: string }) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    fetchProducts();
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      supplier: '',
      status: '',
      stockStatus: '',
      priceRange: {
        min: '',
        max: ''
      },
      isVariant: ''
    });
    fetchProducts();
  };

  const handleDelete = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      // Refresh the products list
      fetchProducts();
      setDeleteConfirmation(null);
    } catch (error: any) {
      setError(`Erreur lors de la suppression : ${error.message}`);
    }
  };

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const getStockStatusColor = (quantity: number) => {
    if (quantity === 0) return 'text-red-600 bg-red-100';
    if (quantity < 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'text-green-600 bg-green-100';
      case 'draft':
        return 'text-yellow-600 bg-yellow-100';
      case 'archived':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getParentProductName = (product: Product): string => {
    if (product.metadata?.isVariant && product.metadata?.parentProductId) {
      const parentId = product.metadata.parentProductId;
      const parent = parentProducts[parentId];
      return parent ? parent.name : 'Produit parent';
    }
    return '';
  };

  const filteredProducts = products.filter(product => {
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !product.name.toLowerCase().includes(searchLower) &&
        !product.sku.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Apply category filter
    if (filters.category && product.category_id !== filters.category) {
      return false;
    }

    // Apply supplier filter
    if (filters.supplier && product.supplier_code !== filters.supplier) {
      return false;
    }

    // Apply status filter
    if (filters.status && product.status !== filters.status) {
      return false;
    }

    // Apply stock status filter
    if (filters.stockStatus) {
      if (filters.stockStatus === 'in_stock' && product.stock_quantity <= 0) {
        return false;
      }
      if (filters.stockStatus === 'out_of_stock' && product.stock_quantity > 0) {
        return false;
      }
      if (filters.stockStatus === 'low_stock' && (product.stock_quantity <= 0 || product.stock_quantity >= 5)) {
        return false;
      }
    }

    // Apply price range filter
    if (filters.priceRange.min && parseFloat(filters.priceRange.min) > product.price) {
      return false;
    }
    if (filters.priceRange.max && parseFloat(filters.priceRange.max) < product.price) {
      return false;
    }

    // Apply variant filter
    if (filters.isVariant) {
      if (filters.isVariant === 'variant' && !product.metadata?.isVariant) {
        return false;
      }
      if (filters.isVariant === 'parent' && product.metadata?.isVariant) {
        return false;
      }
    }

    return true;
  });

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
              <X className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
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
                  <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Gérez votre catalogue de produits
                </p>
              </div>
              <Link
                to="/admin/products/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouveau produit
              </Link>
            </div>

            {/* Search and filters */}
            <div className="mt-6">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher par nom ou SKU..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                >
                  <Filter className="h-5 w-5 mr-2" />
                  Filtres
                </button>
              </div>

              {/* Filter panel */}
              {showFilters && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Catégorie
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Toutes les catégories</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Fournisseur
                      </label>
                      <select
                        value={filters.supplier}
                        onChange={(e) => handleFilterChange('supplier', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous les fournisseurs</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.supplier_code}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Statut
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous les statuts</option>
                        <option value="published">Publié</option>
                        <option value="draft">Brouillon</option>
                        <option value="archived">Archivé</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Stock
                      </label>
                      <select
                        value={filters.stockStatus}
                        onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous les stocks</option>
                        <option value="in_stock">En stock</option>
                        <option value="out_of_stock">Rupture de stock</option>
                        <option value="low_stock">Stock faible</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type de produit
                      </label>
                      <select
                        value={filters.isVariant}
                        onChange={(e) => handleFilterChange('isVariant', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous les types</option>
                        <option value="parent">Produits standards</option>
                        <option value="variant">Variantes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Prix
                      </label>
                      <div className="mt-1 flex space-x-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={filters.priceRange.min}
                          onChange={(e) => handleFilterChange('priceRange', {
                            ...filters.priceRange,
                            min: e.target.value
                          })}
                          className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={filters.priceRange.max}
                          onChange={(e) => handleFilterChange('priceRange', {
                            ...filters.priceRange,
                            max: e.target.value
                          })}
                          className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                    >
                      Réinitialiser
                    </button>
                    <button
                      onClick={applyFilters}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total produits</p>
                  <p className="text-2xl font-semibold text-gray-900">{products.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <Box className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">En rupture</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {products.filter(p => p.stock_quantity === 0).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <Tag className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Publiés</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {products.filter(p => p.status === 'published').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <Percent className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">En promotion</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {products.filter(p => p.sale_price !== null).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Products list */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Produit
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('sku')}
                  >
                    <div className="flex items-center">
                      SKU
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center">
                      Prix
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('stock_quantity')}
                  >
                    <div className="flex items-center">
                      Stock
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Statut
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center">
                      Catégorie
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center">
                      Fournisseur
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center">
                      Type
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center">
                      Clé de réduction
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('updated_at')}
                  >
                    <div className="flex items-center">
                      Dernière mise à jour
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {getProductImage(product) ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={getProductImage(product)}
                              alt={product.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          {product.metadata?.isVariant && (
                            <div className="text-xs text-gray-500">
                              Variante de: {getParentProductName(product)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900 font-mono">{product.sku}</div>
                        <button 
                          onClick={() => handleCopySku(product.sku)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                          title="Copier le SKU"
                        >
                          {copiedSku === product.sku ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {product.metadata?.variantSuffix && (
                        <div className="text-xs text-gray-500">
                          Suffixe: {product.metadata.variantSuffix}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.sale_price ? (
                          <>
                            <span className="line-through text-gray-500">
                              {product.price.toFixed(2)} €
                            </span>
                            <span className="ml-2 text-[#8B1F38]">
                              {product.sale_price.toFixed(2)} €
                            </span>
                          </>
                        ) : (
                          `${product.price.toFixed(2)} €`
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockStatusColor(product.stock_quantity)}`}>
                        {product.stock_quantity} en stock
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(product.status)}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.product_categories?.name || 'Non catégorisé'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.supplier_code ? getSupplierName(product.supplier_code) : 'Non défini'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.metadata?.isVariant ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {product.metadata?.isVariant ? 'Variante' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.metadata?.discount_key ? (
                        <div className="flex items-center">
                          <Key
                            className="h-4 w-4 mr-2"
                            style={{
                              color: KEY_TYPES[discountKeys[product.metadata.discount_key]?.type]?.color
                            }}
                          />
                          <span className="text-sm text-gray-900">
                            {discountKeys[product.metadata.discount_key]?.percentage}% de réduction
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Aucune</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                          className="text-[#8B1F38] hover:text-[#7A1B31]"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        {deleteConfirmation === product.id ? (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmation(null)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmation(product.id)}
                            className="text-red-400 hover:text-red-500"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}