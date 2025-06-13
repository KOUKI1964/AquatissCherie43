import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  images: {
    url: string;
    alt_text: string;
  }[];
}

export function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            description,
            price,
            sale_price,
            product_media!inner (
              media_files!inner (
                url,
                alt_text
              )
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setProduct({
            ...data,
            images: data.product_media.map((media: any) => ({
              url: media.media_files.url,
              alt_text: media.media_files.alt_text || data.name
            }))
          });
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchProduct();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-center text-gray-500">Produit non trouvé</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          {product.images.map((image, index) => (
            <img
              key={index}
              src={image.url}
              alt={image.alt_text}
              className="w-full rounded-lg shadow-lg"
            />
          ))}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <h1 className="text-3xl font-serif font-bold text-gray-900">{product.name}</h1>
          
          <div className="flex items-baseline space-x-4">
            {product.sale_price ? (
              <>
                <p className="text-2xl font-semibold text-gray-900">{product.sale_price}€</p>
                <p className="text-lg text-gray-500 line-through">{product.price}€</p>
              </>
            ) : (
              <p className="text-2xl font-semibold text-gray-900">{product.price}€</p>
            )}
          </div>

          <div className="prose prose-sm text-gray-500">
            <p>{product.description}</p>
          </div>

          <button className="w-full bg-gray-900 text-white py-3 px-6 rounded-md hover:bg-gray-800 transition-colors">
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}