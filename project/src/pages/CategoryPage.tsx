import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heart, ShoppingBag, Tag, Key } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { DiscountKeyPopup } from '../components/DiscountKeyPopup';
import { ProductVariantSelector } from '../components/ProductVariantSelector';
import { useCategories } from '../contexts/CategoryContext';

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  status: string;
  metadata: {
    discount_key?: string;
  };
  product_media: {
    media_id: string;
    is_primary: boolean;
    sort_order: number;
    media_files: {
      id: string;
      url: string;
    };
  }[];
}

interface DiscountKey {
  id: string;
  type: 'silver' | 'bronze' | 'gold';
  percentage: number;
}

interface SelectedVariant {
  sku: string;
  price: number;
  sale_price: number | null;
  attributes: Record<string, any>;
  stock_quantity: number;
}

const KEY_TYPES = {
  silver: { name: 'Argent', color: '#C0C0C0' },
  bronze: { name: 'Bronze', color: '#CD7F32' },
  gold: { name: 'Or', color: '#FFD700' }
};

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getCategoryBySlug, getCategoryPath } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<SelectedVariant | null>(null);
  const [discountKeys, setDiscountKeys] = useState<Record<string, DiscountKey>>({});
  const [showDiscountKeyPopup, setShowDiscountKeyPopup] = useState(false);
  const [selectedDiscountKey, setSelectedDiscountKey] = useState<string | null>(null);
  const { addToCart, addDiscount } = useCart();

  useEffect(() => {
    if (slug) {
      fetchCategory();
      fetchDiscountKeys();
    }
  }, [slug]);

  const fetchCategory = async () => {
    try {
      setIsLoading(true);
      
      // Get the category from context
      const category = getCategoryBySlug(slug || '');
      
      if (!category) {
        setError('Catégorie non trouvée');
        setIsLoading(false);
        return;
      }
      
      // Then fetch products in this category
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          sku,
          price,
          sale_price,
          stock_quantity,
          status,
          metadata,
          product_media (
            media_id,
            is_primary,
            sort_order,
            media_files:media_id (
              id,
              url
            )
          )
        `)
        .eq('category_id', category.id)
        .eq('status', 'published');

      if (productsError) throw productsError;
      
      const productsWithSortedMedia = productsData?.map(product => ({
        ...product,
        product_media: product.product_media
          .sort((a, b) => {
            if (a.is_primary) return -1;
            if (b.is_primary) return 1;
            return a.sort_order - b.sort_order;
          })
      }));

      setProducts(productsWithSortedMedia || []);
    } catch (error) {
      console.error('Error fetching category data:', error);
      setError('Erreur lors du chargement de la catégorie');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDiscountKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_keys')
        .select('*')
        .eq('is_active', true);

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

  const getProductImage = (product: Product): string => {
    const primaryImage = product.product_media?.find(media => media.is_primary);
    if (primaryImage?.media_files) {
      return primaryImage.media_files.url;
    }

    const firstImage = product.product_media?.[0]?.media_files;
    if (firstImage) {
      return firstImage.url;
    }

    return 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';
  };

  const handleAddToCart = (product: Product) => {
    if (!selectedVariant) {
      alert('Veuillez sélectionner une taille et une couleur');
      return;
    }

    const cartItem = {
      id: parseInt(product.id),
      name: product.name,
      price: selectedVariant.sale_price || selectedVariant.price,
      image: getProductImage(product),
      quantity: 1,
      size: selectedVariant.attributes.Taille,
      color: selectedVariant.attributes.Couleur,
      productCode: selectedVariant.sku // Use the variant SKU as the product code
    };

    addToCart(cartItem);
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  const handleDiscountKeyClick = (keyId: string, product: Product) => {
    setSelectedDiscountKey(keyId);
    setSelectedProduct(product);
    setShowDiscountKeyPopup(true);
  };

  const handleDiscountKeySubmit = (firstPart: string, secondPart: string) => {
    if (selectedDiscountKey && selectedProduct) {
      const discount = discountKeys[selectedDiscountKey];
      
      // Add the discount to the context
      addDiscount({
        type: discount.type,
        percentage: discount.percentage,
        code: `${firstPart}${secondPart}`,
        productId: parseInt(selectedProduct.id)
      });
      
      // Close popup and reset state
      setShowDiscountKeyPopup(false);
      setSelectedDiscountKey(null);
    }
  };

  const handleVariantChange = (variant: SelectedVariant | null) => {
    setSelectedVariant(variant);
  };

  // Get category information from context
  const category = getCategoryBySlug(slug || '');
  const categoryPath = category ? getCategoryPath(category.id) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-red-700">{error || 'Catégorie non trouvée'}</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-[#8B1F38] text-white rounded-md hover:bg-[#7A1B31]"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        {categoryPath.length > 0 && (
          <div className="mb-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <a href="/" className="text-gray-500 hover:text-gray-700">Accueil</a>
                </li>
                {categoryPath.map((cat, index) => (
                  <li key={cat.id} className="flex items-center">
                    <span className="text-gray-400 mx-1">/</span>
                    {index === categoryPath.length - 1 ? (
                      <span className="text-gray-900 font-medium">{cat.name}</span>
                    ) : (
                      <a 
                        href={`/categorie/${cat.slug}`} 
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {cat.name}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        )}
        
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8 text-center">{category.name}</h1>
        
        {category.description && (
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <p className="text-gray-600">{category.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-gray-500">Aucun produit disponible dans cette catégorie.</p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="group relative">
                <div className="aspect-w-3 aspect-h-4 overflow-hidden rounded-lg">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-full h-[400px] object-cover object-center"
                  />
                  <div className="absolute top-4 right-4 z-10">
                    <button className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100">
                      <Heart className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                    {product.metadata?.discount_key && discountKeys[product.metadata.discount_key] && (
                      <button
                        onClick={() => handleDiscountKeyClick(product.metadata.discount_key!, product)}
                        className="flex items-center bg-gray-100 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <Key 
                          className="h-4 w-4 mr-1"
                          style={{ 
                            color: KEY_TYPES[discountKeys[product.metadata.discount_key].type].color 
                          }}
                        />
                        <span className="text-xs font-medium">
                          -{discountKeys[product.metadata.discount_key].percentage}%
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Tag className="h-4 w-4 mr-1" />
                      <span>{product.sku}</span>
                    </div>
                    <div className="text-right">
                      {product.sale_price ? (
                        <div>
                          <p className="text-gray-500 line-through text-sm">{product.price.toFixed(2)} €</p>
                          <p className="text-[#8B1F38] font-medium">
                            {product.sale_price.toFixed(2)} €
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-900 font-medium">{product.price.toFixed(2)} €</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="mt-4 w-full bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center justify-center"
                  >
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Ajouter au panier
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de sélection de taille et couleur */}
      {selectedProduct && !showDiscountKeyPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold">{selectedProduct.name}</h2>
                <p className="text-sm text-gray-500 mt-1">SKU: {selectedVariant?.sku || selectedProduct.sku}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setSelectedVariant(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <img
                src={getProductImage(selectedProduct)}
                alt={selectedProduct.name}
                className="w-full h-[300px] object-cover rounded-lg"
              />
              <div>
                <p className="text-gray-600 mb-4">{selectedProduct.description}</p>
                <div className="mb-6">
                  {selectedVariant ? (
                    selectedVariant.sale_price ? (
                      <>
                        <p className="text-gray-500 line-through">{selectedVariant.price.toFixed(2)} €</p>
                        <p className="text-2xl font-bold text-[#8B1F38]">
                          {selectedVariant.sale_price.toFixed(2)} €
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold">{selectedVariant.price.toFixed(2)} €</p>
                    )
                  ) : (
                    selectedProduct.sale_price ? (
                      <>
                        <p className="text-gray-500 line-through">{selectedProduct.price.toFixed(2)} €</p>
                        <p className="text-2xl font-bold text-[#8B1F38]">
                          {selectedProduct.sale_price.toFixed(2)} €
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold">{selectedProduct.price.toFixed(2)} €</p>
                    )
                  )}
                </div>
                
                <ProductVariantSelector
                  productId={selectedProduct.id}
                  basePrice={selectedProduct.price}
                  baseSalePrice={selectedProduct.sale_price}
                  baseSku={selectedProduct.sku}
                  onVariantChange={handleVariantChange}
                />

                <button
                  onClick={() => handleAddToCart(selectedProduct)}
                  disabled={!selectedVariant}
                  className={`w-full bg-gray-900 text-white py-3 rounded-md hover:bg-gray-800 flex items-center justify-center mt-6 ${
                    !selectedVariant ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup de saisie du code de réduction */}
      <DiscountKeyPopup
        isOpen={showDiscountKeyPopup}
        onClose={() => {
          setShowDiscountKeyPopup(false);
          setSelectedDiscountKey(null);
        }}
        onSubmit={handleDiscountKeySubmit}
        discountType={selectedDiscountKey ? discountKeys[selectedDiscountKey]?.type : undefined}
        discountPercentage={selectedDiscountKey ? discountKeys[selectedDiscountKey]?.percentage : undefined}
        productId={selectedProduct?.id}
        productName={selectedProduct?.name}
        productPrice={selectedProduct?.sale_price || selectedProduct?.price}
        productImage={selectedProduct ? getProductImage(selectedProduct) : undefined}
        size={selectedVariant?.attributes.Taille}
        color={selectedVariant?.attributes.Couleur}
      />
    </div>
  );
}