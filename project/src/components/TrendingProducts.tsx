import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Tag, Key, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';

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

const KEY_TYPES = {
  silver: { name: 'Argent', color: '#C0C0C0' },
  bronze: { name: 'Bronze', color: '#CD7F32' },
  gold: { name: 'Or', color: '#FFD700' }
};

export function TrendingProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discountKeys, setDiscountKeys] = useState<Record<string, DiscountKey>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const productsPerPage = 4;
  const { addToCart } = useCart();

  useEffect(() => {
    fetchTrendingProducts();
    fetchDiscountKeys();
  }, []);

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

  const fetchTrendingProducts = async () => {
    try {
      // Fetch the most recently created products
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
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(12);

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
      console.error('Error fetching products:', error);
      setError('Erreur lors du chargement des produits');
    } finally {
      setIsLoading(false);
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

  const handleQuickAddToCart = (product: Product) => {
    addToCart({
      id: parseInt(product.id),
      name: product.name,
      price: product.sale_price || product.price,
      image: getProductImage(product),
      quantity: 1,
      size: 'M', // Default size
      color: 'Noir', // Default color
      productCode: product.sku
    });
  };

  const nextPage = () => {
    if ((currentPage + 1) * productsPerPage < products.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const displayedProducts = products.slice(
    currentPage * productsPerPage,
    (currentPage + 1) * productsPerPage
  );

  const totalPages = Math.ceil(products.length / productsPerPage);

  if (isLoading) {
    return (
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse h-8 w-64 bg-gray-200 rounded mx-auto mb-8"></div>
            <div className="animate-pulse h-4 w-96 bg-gray-200 rounded mx-auto"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-serif font-bold text-gray-900">Tendances du Moment</h2>
            <p className="mt-4 text-lg text-gray-600">
              Nos pièces les plus populaires, sélectionnées pour vous
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={prevPage}
              disabled={currentPage === 0}
              className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={nextPage}
              disabled={(currentPage + 1) * productsPerPage >= products.length}
              className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          {displayedProducts.map((product) => (
            <div key={product.id} className="group relative">
              <div className="aspect-h-4 aspect-w-3 overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-0 right-0 p-2 z-10">
                  <button className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors">
                    <Heart className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button 
                    onClick={() => handleQuickAddToCart(product)}
                    className="w-full bg-white text-gray-900 py-2 rounded-md flex items-center justify-center font-medium"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Ajouter au panier
                  </button>
                </div>
              </div>
              <div className="mt-4 flex justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    <Link to={`/produit/${product.id}`}>
                      <span aria-hidden="true" className="absolute inset-0" />
                      {product.name}
                    </Link>
                  </h3>
                  <div className="mt-1 flex items-center">
                    <Tag className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-xs text-gray-500">{product.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  {product.sale_price ? (
                    <div>
                      <p className="text-xs text-gray-500 line-through">{product.price.toFixed(2)} €</p>
                      <p className="text-sm font-medium text-[#8B1F38]">{product.sale_price.toFixed(2)} €</p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-900">{product.price.toFixed(2)} €</p>
                  )}
                </div>
              </div>
              {product.metadata?.discount_key && discountKeys[product.metadata.discount_key] && (
                <div className="absolute top-0 left-0 m-2">
                  <div 
                    className="flex items-center bg-white px-2 py-1 rounded-full shadow-md"
                    style={{ 
                      borderColor: KEY_TYPES[discountKeys[product.metadata.discount_key].type].color,
                      borderWidth: '1px'
                    }}
                  >
                    <Key 
                      className="h-3 w-3 mr-1"
                      style={{ 
                        color: KEY_TYPES[discountKeys[product.metadata.discount_key].type].color 
                      }}
                    />
                    <span className="text-xs font-medium">
                      -{discountKeys[product.metadata.discount_key].percentage}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination dots */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-10">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`mx-1 h-2 w-2 rounded-full ${
                  currentPage === i ? 'bg-[#8B1F38]' : 'bg-gray-300'
                }`}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link 
            to="/nouveautes" 
            className="inline-flex items-center text-[#8B1F38] font-medium hover:text-[#7A1B31] transition-colors"
          >
            Voir toutes les nouveautés <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}