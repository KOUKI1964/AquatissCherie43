import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Plus, Minus, AlertCircle, Save, Image as ImageIcon, Key, Truck, RefreshCw, Info, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { ProductFormData, AttributeGroup } from '../../types/product';
import { DynamicAttributeForm } from '../../components/admin/DynamicAttributeForm';
import { VariantGenerator } from '../../components/admin/VariantGenerator';
import { UniqueCodeGenerator } from '../../components/admin/UniqueCodeGenerator';

const productSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().min(1, 'La description est requise'),
  sku: z.string().min(1, 'Le SKU est requis'),
  price: z.number().min(0, 'Le prix doit être positif'),
  sale_price: z.number().min(0, 'Le prix de vente doit être positif')
    .nullable()
    .optional()
    .refine(price => price === null || price > 0, {
      message: "Le prix de vente doit être positif ou vide"
    }),
  stock_quantity: z.number().min(0, 'Le stock doit être positif'),
  low_stock_threshold: z.number().min(0, 'Le seuil doit être positif'),
  category_id: z.string().uuid('Catégorie invalide'),
  supplier_code: z.string().min(1, 'Le fournisseur est requis'),
  status: z.enum(['draft', 'published', 'archived']),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
}).refine(data => {
  if (data.sale_price != null) {
    return data.sale_price < data.price;
  }
  return true;
}, {
  message: "Le prix promotionnel doit être inférieur au prix normal",
  path: ["sale_price"]
});

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  path_name?: string;
  slug?: string;
}

interface Supplier {
  id: string;
  name: string;
  supplier_code: string;
  type: 'local' | 'dropshipping' | 'mixte';
  is_active: boolean;
}

interface DiscountKey {
  id: string;
  type: 'silver' | 'bronze' | 'gold';
  percentage: number;
  is_active: boolean;
}

interface MediaFile {
  id: string;
  name: string;
  url: string;
  file_type: 'image' | 'video' | 'document';
}

interface Product {
  id: string;
  name: string;
  sku: string;
  supplier_code: string;
}

const KEY_TYPES = {
  silver: { name: 'Argent', color: '#C0C0C0' },
  bronze: { name: 'Bronze', color: '#CD7F32' },
  gold: { name: 'Or', color: '#FFD700' }
};

export function NewProductPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductFormData>({
    name: '',
    description: '',
    sku: '',
    price: 0,
    sale_price: null,
    stock_quantity: 0,
    low_stock_threshold: 5,
    category_id: '',
    supplier_code: '',
    status: 'draft',
    seo_title: '',
    seo_description: '',
    seo_keywords: [],
    attributeGroups: [],
    variants: [],
    metadata: {},
    isVariant: false,
    parentProductId: '',
    variantSuffix: ''
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [discountKeys, setDiscountKeys] = useState<DiscountKey[]>([]);
  const [selectedMediaFiles, setSelectedMediaFiles] = useState<MediaFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedDiscountKey, setSelectedDiscountKey] = useState<string | null>(null);
  const [searchSupplier, setSearchSupplier] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'attributes' | 'variants' | 'seo'>('basic');
  const [parentProducts, setParentProducts] = useState<Product[]>([]);
  const [searchParentProduct, setSearchParentProduct] = useState('');
  const [filteredParentProducts, setFilteredParentProducts] = useState<Product[]>([]);
  const [nextAvailableSuffix, setNextAvailableSuffix] = useState<string>('.01');

  useEffect(() => {
    checkAdminAccess();
    fetchCategories();
    fetchDiscountKeys();
    fetchSuppliers();
    fetchMediaFiles();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (suppliers.length > 0) {
      if (searchSupplier) {
        const filtered = suppliers.filter(supplier => 
          supplier.name.toLowerCase().includes(searchSupplier.toLowerCase()) ||
          supplier.supplier_code.includes(searchSupplier)
        );
        setFilteredSuppliers(filtered);
      } else {
        setFilteredSuppliers(suppliers);
      }
    }
  }, [searchSupplier, suppliers]);

  // Effect to filter parent products
  useEffect(() => {
    if (parentProducts.length > 0) {
      if (searchParentProduct) {
        const filtered = parentProducts.filter(product => 
          product.name.toLowerCase().includes(searchParentProduct.toLowerCase()) ||
          product.sku.includes(searchParentProduct)
        );
        setFilteredParentProducts(filtered);
      } else {
        setFilteredParentProducts(parentProducts);
      }
    }
  }, [searchParentProduct, parentProducts]);

  // Effet pour générer le SKU lorsque le fournisseur change
  useEffect(() => {
    if (form.supplier_code && !form.isVariant) {
      generateSku(form.supplier_code);
    }
  }, [form.supplier_code, form.isVariant]);

  // Effect to update selected category when category_id changes
  useEffect(() => {
    if (form.category_id && categories.length > 0) {
      const category = categories.find(c => c.id === form.category_id);
      if (category) {
        setSelectedCategory(category);
      }
    }
  }, [form.category_id, categories]);

  // Effect to update SKU when parent product changes
  useEffect(() => {
    if (form.isVariant && form.parentProductId) {
      const parentProduct = parentProducts.find(p => p.id === form.parentProductId);
      if (parentProduct) {
        // Find the next available suffix for this parent
        fetchNextAvailableSuffix(parentProduct.sku);
      }
    }
  }, [form.isVariant, form.parentProductId]);

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
      // Fetch categories with hierarchy information
      const { data, error } = await supabase
        .from('category_hierarchy_view')
        .select('id, name, parent_id, path_name, slug')
        .order('path_name');

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
      setFilteredSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setError('Erreur lors du chargement des fournisseurs');
    }
  };

  const fetchMediaFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .eq('file_type', 'image')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaFiles(data || []);
    } catch (error) {
      console.error('Error fetching media files:', error);
    }
  };

  const fetchDiscountKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_keys')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setDiscountKeys(data || []);
    } catch (error) {
      console.error('Error fetching discount keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, supplier_code')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParentProducts(data || []);
      setFilteredParentProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchNextAvailableSuffix = async (parentSku: string) => {
    try {
      // Fetch all variants of the parent product
      const { data, error } = await supabase
        .from('products')
        .select('sku')
        .like('sku', `${parentSku}.%`)
        .order('sku', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Find the highest suffix
        let highestSuffix = 0;
        data.forEach(product => {
          const suffixMatch = product.sku.match(/\.(\d+)$/);
          if (suffixMatch) {
            const suffix = parseInt(suffixMatch[1], 10);
            if (suffix > highestSuffix) {
              highestSuffix = suffix;
            }
          }
        });

        // Increment for next available
        const nextSuffix = highestSuffix + 1;
        const formattedSuffix = `.${nextSuffix.toString().padStart(2, '0')}`;
        setNextAvailableSuffix(formattedSuffix);
        
        // Update form with the new SKU
        setForm(prev => ({
          ...prev,
          sku: parentSku + formattedSuffix,
          variantSuffix: formattedSuffix
        }));
      } else {
        // No existing variants, start with .01
        setNextAvailableSuffix('.01');
        setForm(prev => ({
          ...prev,
          sku: parentSku + '.01',
          variantSuffix: '.01'
        }));
      }
    } catch (error) {
      console.error('Error fetching next available suffix:', error);
      // Fallback to .01 if there's an error
      setNextAvailableSuffix('.01');
      setForm(prev => ({
        ...prev,
        sku: parentSku + '.01',
        variantSuffix: '.01'
      }));
    }
  };

  // Fonction pour générer un SKU unique
  const generateSku = async (supplierCode: string) => {
    if (!supplierCode) return;
    
    setIsGeneratingSku(true);
    try {
      // Appel à la fonction RPC pour générer un SKU unique
      const { data, error } = await supabase.rpc('generate_unique_sku', {
        p_supplier_code: supplierCode
      });

      if (error) throw error;
      
      if (data) {
        setForm(prev => ({ ...prev, sku: data }));
      }
    } catch (error) {
      console.error('Error generating SKU:', error);
      
      // Fallback: génération côté client si l'appel RPC échoue
      const supplierPrefix = supplierCode;
      const randomPart = Math.floor(Math.random() * 900000 + 100000).toString();
      const newSku = `${supplierPrefix}.${randomPart}`;
      
      setForm(prev => ({ ...prev, sku: newSku }));
    } finally {
      setIsGeneratingSku(false);
    }
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const supplierCode = e.target.value;
    setForm(prev => ({ ...prev, supplier_code: supplierCode }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    
    // Find the selected category
    const category = categories.find(c => c.id === categoryId);
    setSelectedCategory(category || null);
    
    // Update form data
    setForm(prev => ({
      ...prev,
      category_id: categoryId,
      // Reset attribute groups when category changes
      attributeGroups: []
    }));
  };

  const handleParentProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parentId = e.target.value;
    
    // Find the selected parent product
    const parentProduct = parentProducts.find(p => p.id === parentId);
    
    if (parentProduct) {
      // Update form with parent product info
      setForm(prev => ({
        ...prev,
        parentProductId: parentId,
        supplier_code: parentProduct.supplier_code,
        // Reset SKU to be generated based on parent
        sku: ''
      }));
      
      // Generate SKU with suffix
      fetchNextAvailableSuffix(parentProduct.sku);
    }
  };

  const handleMediaSelect = (file: MediaFile) => {
    setSelectedMediaFiles(prev => {
      const isAlreadySelected = prev.some(f => f.id === file.id);
      if (isAlreadySelected) {
        return prev.filter(f => f.id !== file.id);
      } else {
        return [...prev, file];
      }
    });
  };

  const handleFormChange = (field: keyof ProductFormData, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAttributeFormChange = (updatedFormData: ProductFormData) => {
    setForm(updatedFormData);
  };

  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setForm(prev => ({
      ...prev,
      sale_price: value === '' ? null : parseFloat(value)
    }));
  };

  const handleIsVariantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isVariant = e.target.checked;
    
    // Reset SKU and parent product if toggling off
    if (!isVariant) {
      setForm(prev => ({
        ...prev,
        isVariant,
        parentProductId: '',
        variantSuffix: '',
        // Regenerate SKU based on supplier code
        sku: prev.supplier_code ? '' : prev.sku
      }));
      
      // Regenerate SKU if supplier code exists
      if (form.supplier_code) {
        generateSku(form.supplier_code);
      }
    } else {
      setForm(prev => ({
        ...prev,
        isVariant
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = {
        ...form,
        metadata: {
          ...form.metadata,
          discount_key: selectedDiscountKey,
          isVariant: form.isVariant,
          parentProductId: form.parentProductId,
          variantSuffix: form.variantSuffix
        }
      };

      productSchema.parse(formData);

      // Insert the product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          description: formData.description,
          sku: formData.sku,
          price: formData.price,
          sale_price: formData.sale_price,
          stock_quantity: formData.stock_quantity,
          low_stock_threshold: formData.low_stock_threshold,
          category_id: formData.category_id,
          supplier_code: formData.supplier_code,
          status: formData.status,
          seo_title: formData.seo_title,
          seo_description: formData.seo_description,
          seo_keywords: formData.seo_keywords,
          metadata: {
            ...formData.metadata,
            attributeGroups: formData.attributeGroups,
            variants_enabled: formData.variants.length > 0
          }
        })
        .select()
        .single();

      if (productError) throw productError;

      // Associate media files
      if (selectedMediaFiles.length > 0) {
        const { error: imagesError } = await supabase
          .from('product_media')
          .insert(
            selectedMediaFiles.map((file, index) => ({
              product_id: product.id,
              media_id: file.id,
              sort_order: index,
              is_primary: index === 0
            }))
          );

        if (imagesError) throw imagesError;
      }

      // Insert variants
      if (formData.variants.length > 0) {
        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(
            formData.variants.map(variant => ({
              product_id: product.id,
              name: variant.attributes ? 
                Object.entries(variant.attributes)
                  .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                  .join(' - ') : 
                `Variante de ${product.name}`,
              sku: variant.sku,
              price: variant.price,
              sale_price: variant.sale_price,
              stock_quantity: variant.stock_quantity,
              attributes: variant.attributes || {}
            }))
          );

        if (variantError) throw variantError;
      }

      navigate('/admin/products');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else {
        setError(error.message || 'Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/admin/products')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Nouveau produit
            </h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50"
          >
            <Save className="h-5 w-5 mr-2" />
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg mb-6">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'basic'
                    ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Informations de base
              </button>
              <button
                onClick={() => setActiveTab('attributes')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'attributes'
                    ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Attributs
              </button>
              <button
                onClick={() => setActiveTab('variants')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'variants'
                    ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Variantes
              </button>
              <button
                onClick={() => setActiveTab('seo')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'seo'
                    ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                SEO
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* Variant Option */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="isVariant"
                        name="isVariant"
                        type="checkbox"
                        checked={form.isVariant}
                        onChange={handleIsVariantChange}
                        className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="isVariant" className="font-medium text-gray-700">
                        Ce produit est une variante d'un produit existant
                      </label>
                      <p className="text-gray-500 text-sm">
                        Activez cette option si ce produit est une variation (taille, couleur, etc.) d'un produit existant.
                      </p>
                    </div>
                  </div>
                </div>

                {form.isVariant && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Produit parent
                    </h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Sélectionner le produit parent
                        </label>
                        <div className="mt-1 relative">
                          <input
                            type="text"
                            value={searchParentProduct}
                            onChange={(e) => setSearchParentProduct(e.target.value)}
                            placeholder="Rechercher un produit..."
                            className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          />
                          <select
                            value={form.parentProductId}
                            onChange={handleParentProductChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                            required={form.isVariant}
                          >
                            <option value="">Sélectionner un produit parent</option>
                            {filteredParentProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Suffixe de variante
                        </label>
                        <div className="mt-1 relative">
                          <input
                            type="text"
                            value={form.variantSuffix}
                            readOnly
                            className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm cursor-not-allowed"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Le suffixe est généré automatiquement (.01, .02, etc.)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Image du produit
                  </h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {selectedMediaFiles.map((file, index) => (
                      <div key={file.id} className="relative">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="h-40 w-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleMediaSelect(file)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setShowMediaLibrary(true)}
                      className="relative h-40 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center"
                    >
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-1 text-sm text-gray-600">
                          Sélectionner des images
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Clé de réduction
                  </h2>
                  <div className="grid grid-cols-3 gap-4">
                    {discountKeys.map((key) => (
                      <button
                        key={key.id}
                        onClick={() => setSelectedDiscountKey(key.id)}
                        className={`p-4 rounded-lg border-2 ${
                          selectedDiscountKey === key.id
                            ? 'border-[#8B1F38] bg-[#8B1F38] bg-opacity-5'
                            : 'border-gray-200 hover:border-gray-300'
                        } transition-colors`}
                      >
                        <div className="flex items-center justify-center mb-2">
                          <Key
                            className="h-6 w-6"
                            style={{ color: KEY_TYPES[key.type].color }}
                          />
                        </div>
                        <p className="text-sm font-medium text-gray-900 text-center">
                          {KEY_TYPES[key.type].name}
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                          -{key.percentage}%
                        </p>
                        <p className="text-xs font-mono text-gray-400 text-center mt-1">
                          {key.id.substring(0, 8)}...
                        </p>
                      </button>
                    ))}
                  </div>
                  {selectedDiscountKey && (
                    <button
                      onClick={() => setSelectedDiscountKey(null)}
                      className="mt-4 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Retirer la clé de réduction
                    </button>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Informations de base
                  </h2>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom du produit
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        SKU
                      </label>
                      <div className="mt-1 relative">
                        <input
                          type="text"
                          value={form.sku}
                          readOnly
                          className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm cursor-not-allowed"
                        />
                        {isGeneratingSku && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {form.isVariant 
                          ? "Le SKU est généré automatiquement à partir du produit parent" 
                          : "Le SKU est généré automatiquement à partir du code fournisseur"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        rows={4}
                        value={form.description}
                        onChange={(e) => handleFormChange('description', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Catégorie
                      </label>
                      <select
                        value={form.category_id}
                        onChange={handleCategoryChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      >
                        <option value="">Sélectionner une catégorie</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.path_name || category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Fournisseur
                      </label>
                      <div className="mt-1 relative">
                        <div className="flex items-center">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Truck className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={searchSupplier}
                            onChange={(e) => setSearchSupplier(e.target.value)}
                            placeholder="Rechercher un fournisseur..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          />
                        </div>
                        <select
                          value={form.supplier_code}
                          onChange={handleSupplierChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                          required
                          disabled={form.isVariant}
                        >
                          <option value="">Sélectionner un fournisseur</option>
                          {filteredSuppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.supplier_code}>
                              {supplier.name} ({supplier.supplier_code})
                            </option>
                          ))}
                        </select>
                      </div>
                      {form.isVariant && (
                        <p className="mt-1 text-xs text-gray-500">
                          Le fournisseur est hérité du produit parent
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Statut
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) => handleFormChange('status', e.target.value as 'draft' | 'published' | 'archived')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      >
                        <option value="draft">Brouillon</option>
                        <option value="published">Publié</option>
                        <option value="archived">Archivé</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Prix et stock
                  </h2>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Prix
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.price}
                          onChange={(e) => handleFormChange('price', parseFloat(e.target.value))}
                          className="block w-full pr-12 rounded-md border-gray-300 focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">€</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Prix promotionnel (optionnel)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.sale_price ?? ''}
                          onChange={handleSalePriceChange}
                          placeholder="Laissez vide pour aucune promotion"
                          className="block w-full pr-12 rounded-md border-gray-300 focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">€</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.stock_quantity}
                        onChange={(e) => handleFormChange('stock_quantity', parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Seuil d'alerte stock bas
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.low_stock_threshold}
                        onChange={(e) => handleFormChange('low_stock_threshold', parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'attributes' && selectedCategory && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-md mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Info className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Attributs pour {selectedCategory.name}</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          Les attributs ci-dessous sont spécifiques à la catégorie sélectionnée.
                          Vous pouvez les modifier, en ajouter ou en supprimer selon vos besoins.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <DynamicAttributeForm
                  categoryId={selectedCategory.id}
                  categorySlug={selectedCategory.slug || ''}
                  formData={form}
                  onChange={handleAttributeFormChange}
                />
                
                <UniqueCodeGenerator
                  formData={form}
                  onChange={handleAttributeFormChange}
                />
              </div>
            )}

            {activeTab === 'variants' && (
              <VariantGenerator
                formData={form}
                onChange={handleAttributeFormChange}
              />
            )}

            {activeTab === 'seo' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  SEO
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Titre SEO
                    </label>
                    <input
                      type="text"
                      value={form.seo_title}
                      onChange={(e) => handleFormChange('seo_title', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      placeholder="Laissez vide pour utiliser le nom du produit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description SEO
                    </label>
                    <textarea
                      rows={3}
                      value={form.seo_description}
                      onChange={(e) => handleFormChange('seo_description', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      placeholder="Laissez vide pour utiliser la description du produit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Mots-clés SEO
                    </label>
                    <input
                      type="text"
                      value={form.seo_keywords.join(', ')}
                      onChange={(e) => handleFormChange('seo_keywords', e.target.value.split(',').map(k => k.trim()))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      placeholder="Séparez les mots-clés par des virgules"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'basic') {
                navigate('/admin/products');
              } else if (activeTab === 'attributes') {
                setActiveTab('basic');
              } else if (activeTab === 'variants') {
                setActiveTab('attributes');
              } else if (activeTab === 'seo') {
                setActiveTab('variants');
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
          >
            {activeTab === 'basic' ? 'Annuler' : 'Précédent'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'basic') {
                setActiveTab('attributes');
              } else if (activeTab === 'attributes') {
                setActiveTab('variants');
              } else if (activeTab === 'variants') {
                setActiveTab('seo');
              } else if (activeTab === 'seo') {
                handleSubmit(new Event('submit') as any);
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
          >
            {activeTab === 'seo' ? 'Enregistrer' : 'Suivant'}
          </button>
        </div>
      </div>

      {/* Modal de sélection de média */}
      {showMediaLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Sélectionner des images
              </h3>
              <button
                onClick={() => setShowMediaLibrary(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {mediaFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleMediaSelect(file)}
                  className={`relative cursor-pointer group ${
                    selectedMediaFiles.some(f => f.id === file.id)
                      ? 'ring-2 ring-[#8B1F38]'
                      : ''
                  }`}
                >
                  <img
                    src={file.url}
                    alt={file.name}
                    className="h-40 w-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg" />
                  {selectedMediaFiles.some(f => f.id === file.id) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#8B1F38] bg-opacity-20">
                      <div className="bg-[#8B1F38] rounded-full p-2">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowMediaLibrary(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={() => setShowMediaLibrary(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#8B1F38] rounded-md hover:bg-[#7A1B31]"
              >
                Confirmer la sélection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}