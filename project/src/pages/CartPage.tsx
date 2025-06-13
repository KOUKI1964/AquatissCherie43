import React, { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, CreditCard, Copy, Key, ArrowLeft, Tag, Check } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { BannerNotification } from '../components/BannerNotification';

interface Notification {
  message: string;
  type: 'success' | 'error';
}

export function CartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    cartItems, 
    updateQuantity: updateItemQuantity, 
    removeFromCart,
    activeDiscounts,
    removeDiscount,
    getItemTotal,
    getSubtotal,
    getTax,
    getTotal,
    getDiscountTotal
  } = useCart();
  
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [previousPage, setPreviousPage] = useState<string>('/');
  const [copiedCode, setCopiedCode] = useState<number | null>(null);

  useEffect(() => {
    // Sauvegarder la page précédente quand l'utilisateur arrive sur la page du panier
    if (location.state?.from) {
      setPreviousPage(location.state.from);
    }
  }, [location]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  const handleUpdateQuantity = (itemId: number, newQuantity: number, size: string, color: string) => {
    if (newQuantity < 1) return;
    updateItemQuantity(itemId, newQuantity, size, color);
    showNotification('Quantité mise à jour', 'success');
  };

  const handleRemoveItem = (itemId: number, size: string, color: string) => {
    removeFromCart(itemId, size, color);
    showNotification('Article supprimé du panier', 'success');
  };

  const handleRemoveDiscount = (code: string) => {
    removeDiscount(code);
    showNotification('Réduction supprimée', 'success');
  };

  const handleCopyProductCode = (itemId: number) => {
    const item = cartItems.find(item => item.id === itemId);
    if (item?.productCode) {
      navigator.clipboard.writeText(item.productCode);
      setCopiedCode(itemId);
      setTimeout(() => setCopiedCode(null), 2000);
      showNotification('Code produit copié', 'success');
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      showNotification('Le panier est vide', 'error');
      return;
    }
    navigate('/commande');
  };

  const handleContinueShopping = () => {
    // Si une page précédente a été enregistrée, y retourner
    if (previousPage && previousPage !== '/panier') {
      navigate(previousPage);
    } else if (location.key !== 'default') {
      // Sinon, essayer de retourner à la page précédente dans l'historique
      navigate(-1);
    } else {
      // En dernier recours, retourner à la page d'accueil
      navigate('/');
    }
  };

  // Group cart items by productCode to ensure each variant is displayed separately
  const groupedCartItems = cartItems.reduce((acc, item) => {
    const key = `${item.id}-${item.size}-${item.color}-${item.productCode}`;
    if (!acc[key]) {
      acc[key] = item;
    }
    return acc;
  }, {} as Record<string, typeof cartItems[0]>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Mon Panier</h1>

      {/* Cart page notification banner */}
      <BannerNotification location="cart_page" />

      {notification && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {notification.message}
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Votre panier est vide</p>
          <button 
            onClick={handleContinueShopping}
            className="inline-block bg-[#8B1F38] text-white px-6 py-3 rounded-md hover:bg-[#7A1B31]"
          >
            Continuer mes achats
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Active Discounts */}
            {activeDiscounts.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h2 className="text-lg font-medium text-green-800 mb-2">Remises actives</h2>
                <div className="space-y-2">
                  {activeDiscounts.map((discount, index) => {
                    const product = cartItems.find(item => item.id === discount.productId);
                    return (
                      <div key={index} className="flex items-center justify-between text-green-700 p-2 bg-green-100 rounded">
                        <div className="flex items-center">
                          <Key className="h-5 w-5 mr-2" style={{ 
                            color: discount.type === 'silver' ? '#C0C0C0' : 
                                  discount.type === 'bronze' ? '#CD7F32' : '#FFD700' 
                          }} />
                          <span>-{discount.percentage}% sur {product?.name}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveDiscount(discount.code)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-sm text-green-700">
                  <p>Économie totale : <span className="font-bold">{getDiscountTotal().toFixed(2)} €</span></p>
                </div>
              </div>
            )}

            {/* Cart Items */}
            {Object.values(groupedCartItems).map((item) => {
              const hasDiscount = activeDiscounts.some(d => d.productId === item.id);
              const discount = activeDiscounts.find(d => d.productId === item.id);
              
              return (
                <div key={`${item.id}-${item.size}-${item.color}-${item.productCode}`} className="flex flex-col md:flex-row items-start md:items-center border-b border-gray-200 py-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-32 object-cover rounded"
                  />
                  <div className="flex-1 ml-0 md:ml-6 mt-4 md:mt-0">
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    
                    {/* Product Code */}
                    {item.productCode && (
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <Tag className="h-4 w-4 mr-1" />
                        <span className="font-mono">{item.productCode}</span>
                        <button 
                          onClick={() => handleCopyProductCode(item.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                          title="Copier le code produit"
                        >
                          {copiedCode === item.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                    
                    <p className="text-gray-600 mt-1">
                      Taille: {item.size} | Couleur: {item.color}
                    </p>
                    <div className="mt-1">
                      {hasDiscount ? (
                        <>
                          <p className="text-gray-500 line-through">{item.price.toFixed(2)} €</p>
                          <p className="text-[#8B1F38] font-medium">
                            {(item.price * (1 - (discount?.percentage || 0) / 100)).toFixed(2)} € 
                            <span className="ml-2 text-sm text-green-600">(-{discount?.percentage}%)</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-[#8B1F38] font-medium">{item.price.toFixed(2)} €</p>
                      )}
                    </div>
                    
                    <div className="flex items-center mt-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, item.size, item.color)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="mx-4 font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, item.size, item.color)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id, item.size, item.color)}
                        className="ml-6 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right mt-4 md:mt-0">
                    <p className="font-medium text-lg">
                      {getItemTotal(item).toFixed(2)} €
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6 sticky top-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Récapitulatif</h2>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{getSubtotal().toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA (20%)</span>
                  <span>{getTax().toFixed(2)} €</span>
                </div>
                {activeDiscounts.length > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Remises</span>
                    <span>-{getDiscountTotal().toFixed(2)} €</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>{getTotal().toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessingPayment || cartItems.length === 0}
                className={`w-full bg-[#8B1F38] text-white py-3 rounded-md hover:bg-[#7A1B31] flex items-center justify-center mb-3 ${
                  (isProcessingPayment || cartItems.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Passer la commande
              </button>

              <button
                onClick={handleContinueShopping}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 flex items-center justify-center"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Continuer mes achats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}