import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  size: string;
  color: string;
  productCode?: string; // Add product code field
}

interface ActiveDiscount {
  type: 'silver' | 'bronze' | 'gold';
  percentage: number;
  code: string;
  productId: number;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  activeDiscounts: ActiveDiscount[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: number, size?: string, color?: string) => void;
  updateQuantity: (itemId: number, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  addDiscount: (discount: ActiveDiscount) => void;
  removeDiscount: (code: string) => void;
  getItemTotal: (item: CartItem) => number;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getDiscountTotal: () => number;
}

const CartContext = createContext<CartContextType>({
  cartItems: [],
  cartCount: 0,
  activeDiscounts: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  addDiscount: () => {},
  removeDiscount: () => {},
  getItemTotal: () => 0,
  getSubtotal: () => 0,
  getTax: () => 0,
  getTotal: () => 0,
  getDiscountTotal: () => 0,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  const [activeDiscounts, setActiveDiscounts] = useState<ActiveDiscount[]>(() => {
    const savedDiscounts = localStorage.getItem('activeDiscounts');
    return savedDiscounts ? JSON.parse(savedDiscounts) : [];
  });

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);
  
  // Save active discounts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('activeDiscounts', JSON.stringify(activeDiscounts));
  }, [activeDiscounts]);

  const addToCart = (newItem: CartItem) => {
    setCartItems(prevItems => {
      // Find if the exact same product (same id, size, color, and productCode) already exists
      const existingItemIndex = prevItems.findIndex(item => 
        item.id === newItem.id && 
        item.size === newItem.size && 
        item.color === newItem.color &&
        item.productCode === newItem.productCode
      );

      if (existingItemIndex !== -1) {
        // If the exact same product exists, update its quantity
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + newItem.quantity,
          price: newItem.price // Update price in case it changed
        };
        return updatedItems;
      } else {
        // If it's a new product or a different variant, add it as a new item
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (itemId: number, size?: string, color?: string) => {
    setCartItems(prevItems => {
      // If size and color are provided, remove only that specific variant
      if (size && color) {
        return prevItems.filter(item => 
          !(item.id === itemId && item.size === size && item.color === color)
        );
      }
      // Otherwise, remove the first matching item by ID only
      const indexToRemove = prevItems.findIndex(item => item.id === itemId);
      if (indexToRemove === -1) return prevItems;
      
      const newItems = [...prevItems];
      newItems.splice(indexToRemove, 1);
      return newItems;
    });
    
    // Remove any discounts associated with this product
    setActiveDiscounts(prevDiscounts => 
      prevDiscounts.filter(discount => discount.productId !== itemId)
    );
  };

  const updateQuantity = (itemId: number, quantity: number, size?: string, color?: string) => {
    if (quantity < 1) return;

    setCartItems(prevItems => 
      prevItems.map(item => {
        // If size and color are provided, update only that specific variant
        if (size && color) {
          if (item.id === itemId && item.size === size && item.color === color) {
            return { ...item, quantity };
          }
          return item;
        }
        // Otherwise, update the first matching item by ID only
        if (item.id === itemId) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setActiveDiscounts([]);
    localStorage.removeItem('cart');
    localStorage.removeItem('activeDiscounts');
  };
  
  const addDiscount = (discount: ActiveDiscount) => {
    // Check if discount already exists for this product
    const existingDiscount = activeDiscounts.find(d => d.productId === discount.productId);
    
    if (existingDiscount) {
      // Replace existing discount
      setActiveDiscounts(prevDiscounts => 
        prevDiscounts.map(d => d.productId === discount.productId ? discount : d)
      );
    } else {
      // Add new discount
      setActiveDiscounts(prevDiscounts => [...prevDiscounts, discount]);
    }
  };
  
  const removeDiscount = (code: string) => {
    setActiveDiscounts(prevDiscounts => 
      prevDiscounts.filter(discount => discount.code !== code)
    );
  };
  
  // Calculate item total with any applicable discounts
  const getItemTotal = (item: CartItem) => {
    const discount = activeDiscounts.find(d => d.productId === item.id);
    
    if (discount) {
      // Apply discount: price * (1 - percentage/100) * quantity
      return item.price * (1 - discount.percentage / 100) * item.quantity;
    }
    
    return item.price * item.quantity;
  };
  
  // Calculate subtotal (before tax)
  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + getItemTotal(item), 0);
  };
  
  // Calculate tax (20%)
  const getTax = () => {
    return getSubtotal() * 0.20;
  };
  
  // Calculate total discount amount
  const getDiscountTotal = () => {
    return cartItems.reduce((total, item) => {
      const discount = activeDiscounts.find(d => d.productId === item.id);
      if (discount) {
        return total + (item.price * discount.percentage / 100 * item.quantity);
      }
      return total;
    }, 0);
  };
  
  // Calculate final total
  const getTotal = () => {
    return getSubtotal() + getTax();
  };

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      cartCount,
      activeDiscounts,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      addDiscount,
      removeDiscount,
      getItemTotal,
      getSubtotal,
      getTax,
      getTotal,
      getDiscountTotal
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}