import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  attributes: Record<string, any>;
}

interface Product {
  id: string;
  sku: string;
  price: number;
  sale_price: number | null;
}

interface ProductVariantSelectorProps {
  productId: string;
  basePrice: number;
  baseSalePrice: number | null;
  baseSku: string;
  onVariantChange: (variant: {
    sku: string;
    price: number;
    sale_price: number | null;
    attributes: Record<string, any>;
    stock_quantity: number;
  } | null) => void;
}

export function ProductVariantSelector({
  productId,
  basePrice,
  baseSalePrice,
  baseSku,
  onVariantChange
}: ProductVariantSelectorProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [currentSku, setCurrentSku] = useState<string>(baseSku);
  const [currentPrice, setCurrentPrice] = useState<number>(basePrice);
  const [currentSalePrice, setCurrentSalePrice] = useState<number | null>(baseSalePrice);
  const [stockQuantity, setStockQuantity] = useState<number>(0);

  useEffect(() => {
    fetchProductVariants();
  }, [productId]);

  const fetchProductVariants = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setVariants(data);
        
        // Extract all available sizes and colors from variants
        const sizes = new Set<string>();
        const colors = new Set<string>();
        
        data.forEach(variant => {
          if (variant.attributes.Taille) {
            sizes.add(variant.attributes.Taille);
          }
          if (variant.attributes.Couleur) {
            colors.add(variant.attributes.Couleur);
          }
        });
        
        setAvailableSizes(Array.from(sizes));
        setAvailableColors(Array.from(colors));
      } else {
        // If no variants, set default sizes and colors
        setAvailableSizes(['XS', 'S', 'M', 'L', 'XL']);
        setAvailableColors(['Noir', 'Blanc', 'Rouge']);
      }
    } catch (err) {
      console.error('Error fetching product variants:', err);
      setError('Erreur lors du chargement des variantes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // When size or color changes, find the matching variant
    if (selectedSize && selectedColor) {
      const matchingVariant = variants.find(variant => 
        variant.attributes.Taille === selectedSize && 
        variant.attributes.Couleur === selectedColor
      );
      
      if (matchingVariant) {
        // If we found a matching variant, use its data
        setCurrentSku(matchingVariant.sku);
        setCurrentPrice(matchingVariant.price);
        setCurrentSalePrice(matchingVariant.sale_price);
        setStockQuantity(matchingVariant.stock_quantity);
        
        onVariantChange({
          sku: matchingVariant.sku,
          price: matchingVariant.price,
          sale_price: matchingVariant.sale_price,
          attributes: matchingVariant.attributes,
          stock_quantity: matchingVariant.stock_quantity
        });
      } else {
        // If no matching variant, use base product data with a generated suffix
        // In a real implementation, you might want to check if this variant should exist
        const variantSuffix = `.${selectedSize.charAt(0)}${selectedColor.charAt(0)}`;
        setCurrentSku(`${baseSku}${variantSuffix}`);
        setCurrentPrice(basePrice);
        setCurrentSalePrice(baseSalePrice);
        setStockQuantity(10); // Default stock for non-existent variants
        
        onVariantChange({
          sku: `${baseSku}${variantSuffix}`,
          price: basePrice,
          sale_price: baseSalePrice,
          attributes: {
            Taille: selectedSize,
            Couleur: selectedColor
          },
          stock_quantity: 10
        });
      }
    } else {
      // If either size or color is not selected, reset to base product
      setCurrentSku(baseSku);
      setCurrentPrice(basePrice);
      setCurrentSalePrice(baseSalePrice);
      setStockQuantity(0);
      onVariantChange(null);
    }
  }, [selectedSize, selectedColor, variants]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <div>
        <p className="text-sm text-gray-500 mb-1">Référence produit: <span className="font-mono">{currentSku}</span></p>
        <p className="text-sm text-gray-500">
          Stock: <span className={stockQuantity > 0 ? "text-green-600" : "text-red-600"}>
            {stockQuantity > 0 ? `${stockQuantity} disponible(s)` : 'Épuisé'}
          </span>
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Taille
        </label>
        <div className="grid grid-cols-5 gap-2">
          {availableSizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`py-2 text-sm border rounded-md ${
                selectedSize === size
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 hover:border-gray-900'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Couleur
        </label>
        <div className="grid grid-cols-3 gap-2">
          {availableColors.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`py-2 text-sm border rounded-md ${
                selectedColor === color
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 hover:border-gray-900'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}