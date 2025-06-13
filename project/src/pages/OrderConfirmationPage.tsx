import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Package, Truck, Gift, Key } from 'lucide-react';
import { COUNTRIES } from '../types/address';

export function OrderConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderDetails = location.state?.orderDetails;

  useEffect(() => {
    if (!orderDetails) {
      navigate('/');
    }
  }, [orderDetails, navigate]);

  if (!orderDetails) {
    return null;
  }

  // Get country name from country code
  const getCountryName = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* En-tête */}
          <div className="bg-[#8B1F38] px-6 py-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-center">
              Commande confirmée !
            </h1>
            <p className="mt-2 text-center text-white/90">
              Merci pour votre commande. Un email de confirmation vous a été envoyé.
            </p>
          </div>

          {/* Détails de la commande */}
          <div className="px-6 py-8">
            <div className="space-y-6">
              {/* Numéro de commande */}
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Numéro de commande
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  #{orderDetails.orderId}
                </p>
              </div>

              {/* Statut de la commande */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Suivi de votre commande
                </h2>
                <div className="relative">
                  <div className="absolute left-8 top-0 h-full w-0.5 bg-gray-200"></div>
                  <div className="space-y-8">
                    <div className="relative flex items-center">
                      <div className="absolute left-0 w-16 text-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                      </div>
                      <div className="ml-20">
                        <p className="text-sm font-medium text-gray-900">Commande confirmée</p>
                        <p className="text-sm text-gray-500">
                          {new Date().toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-0 w-16 text-center">
                        <Package className="h-5 w-5 text-gray-400 mx-auto" />
                      </div>
                      <div className="ml-20">
                        <p className="text-sm font-medium text-gray-900">En cours de préparation</p>
                        <p className="text-sm text-gray-500">
                          Votre commande est en cours de préparation
                        </p>
                      </div>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-0 w-16 text-center">
                        <Truck className="h-5 w-5 text-gray-400 mx-auto" />
                      </div>
                      <div className="ml-20">
                        <p className="text-sm font-medium text-gray-900">Expédition</p>
                        <p className="text-sm text-gray-500">
                          Livraison prévue sous 3-5 jours ouvrés
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Récapitulatif de la commande */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Récapitulatif de votre commande
                </h2>
                <div className="space-y-4">
                  {orderDetails.items.map((item: any) => {
                    const hasDiscount = orderDetails.discounts?.some((d: any) => d.productId === item.id);
                    const discount = orderDetails.discounts?.find((d: any) => d.productId === item.id);
                    
                    return (
                      <div key={item.id} className="flex items-center">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-20 object-cover rounded"
                        />
                        <div className="ml-4 flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-500">
                            Taille: {item.size} | Couleur: {item.color}
                          </p>
                          <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                          {hasDiscount && (
                            <div className="flex items-center text-xs text-green-600">
                              <Key className="h-3 w-3 mr-1" />
                              <span>Remise: -{discount?.percentage}%</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {(item.price * item.quantity).toFixed(2)} €
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Sous-total</span>
                    <span>{orderDetails.subtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>TVA (20%)</span>
                    <span>{orderDetails.tax.toFixed(2)} €</span>
                  </div>
                  {orderDetails.discountTotal > 0 && (
                    <div className="flex justify-between text-sm text-green-600 mt-2">
                      <span className="flex items-center">
                        <Key className="h-4 w-4 mr-1" />
                        Remises
                      </span>
                      <span>-{orderDetails.discountTotal.toFixed(2)} €</span>
                    </div>
                  )}
                  {orderDetails.giftCardDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 mt-2">
                      <span className="flex items-center">
                        <Gift className="h-4 w-4 mr-1" />
                        Chèques cadeaux
                      </span>
                      <span>-{orderDetails.giftCardDiscount.toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-medium text-gray-900 mt-4">
                    <span>Total</span>
                    <span>{orderDetails.total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Adresse de livraison */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Adresse de livraison
                </h2>
                <p className="text-sm text-gray-600">
                  {orderDetails.shippingAddress.firstName} {orderDetails.shippingAddress.lastName}<br />
                  {orderDetails.shippingAddress.address}<br />
                  {orderDetails.shippingAddress.postalCode} {orderDetails.shippingAddress.city}<br />
                  {getCountryName(orderDetails.shippingAddress.country)}<br />
                  {orderDetails.shippingAddress.phone}
                </p>
              </div>

              {/* Bouton de retour */}
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#8B1F38] hover:bg-[#7A1B31]"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Retour à la boutique
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}