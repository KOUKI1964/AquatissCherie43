import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, MapPin, Phone, User, Mail, ArrowLeft, Check, AlertCircle, Gift, X, Globe } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { Address, ShippingAddress, COUNTRIES } from '../types/address';
import { AddressSelector } from '../components/AddressSelector';
import { ShippingAddressModal } from '../components/ShippingAddressModal';
import { BannerNotification } from '../components/BannerNotification';

const checkoutSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().optional(),
  email: z.string().email('Email invalide'),
  phone: z.string().min(10, 'Numéro de téléphone invalide')
});

interface CheckoutForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface GiftCard {
  id: string;
  code: string;
  amount: number;
  is_used: boolean;
  expires_at: string;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { 
    cartItems, 
    clearCart, 
    activeDiscounts,
    getItemTotal,
    getSubtotal,
    getTax,
    getTotal,
    getDiscountTotal
  } = useCart();
  
  const [form, setForm] = useState<CheckoutForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [appliedGiftCards, setAppliedGiftCards] = useState<GiftCard[]>([]);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [giftCardSuccess, setGiftCardSuccess] = useState<string | null>(null);
  const [isApplyingGiftCard, setIsApplyingGiftCard] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [useAlternateAddress, setUseAlternateAddress] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [alternateAddress, setAlternateAddress] = useState<Address | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/panier');
      return;
    }

    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/connexion');
        return;
      }

      setUserId(session.user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!error && profile) {
        setUserProfile(profile);
        setForm({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email,
          phone: profile.phone || '',
        });

        // Check if user has a default address
        const { data: addresses } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_default', true)
          .maybeSingle();

        if (addresses) {
          setShippingAddress({
            id: addresses.id,
            street: addresses.street,
            postalCode: addresses.postal_code,
            city: addresses.city,
            country: addresses.country,
            userId: addresses.user_id,
            isDefault: addresses.is_default
          });
        } else if (profile.street) {
          // Use profile address if no default address exists
          setShippingAddress({
            street: profile.street,
            postalCode: profile.postal_code || '',
            city: profile.city || '',
            country: profile.country || 'FR',
            userId: profile.id,
            isDefault: true
          });
        }
      }
    };

    fetchUserProfile();
  }, [navigate, cartItems.length]);

  const calculateGiftCardDiscount = () => {
    return appliedGiftCards.reduce((total, card) => total + card.amount, 0);
  };

  const calculateFinalTotal = () => {
    const total = getTotal();
    const giftCardDiscount = calculateGiftCardDiscount();
    return Math.max(total - giftCardDiscount, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      checkoutSchema.parse(form);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    // Validate shipping address
    if (!shippingAddress && !alternateAddress) {
      setError('Une adresse de livraison est requise');
      return;
    }

    setIsLoading(true);

    try {
      // Simuler le traitement du paiement
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Utilisateur non connecté');
      }

      // Mettre à jour le profil utilisateur
      await supabase
        .from('profiles')
        .update({
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      // Préparer l'adresse de livraison
      const finalShippingAddress = useAlternateAddress && alternateAddress 
        ? alternateAddress 
        : shippingAddress;

      if (!finalShippingAddress) {
        throw new Error('Adresse de livraison manquante');
      }

      // Créer la commande
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: session.user.id,
          total_amount: calculateFinalTotal(),
          status: 'completed',
          shipping_address: {
            firstName: form.firstName,
            lastName: form.lastName,
            address: finalShippingAddress.street,
            postalCode: finalShippingAddress.postalCode,
            city: finalShippingAddress.city,
            country: finalShippingAddress.country,
            phone: form.phone
          }
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Marquer les chèques cadeaux comme utilisés
      if (appliedGiftCards.length > 0) {
        for (const card of appliedGiftCards) {
          // Mettre à jour le statut du chèque cadeau
          await supabase
            .from('gift_cards')
            .update({
              is_used: true,
              order_id: orderData.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', card.id);

          // Enregistrer la transaction
          await supabase
            .from('gift_card_transactions')
            .insert({
              gift_card_id: card.id,
              order_id: orderData.id,
              amount_used: card.amount,
              created_by: session.user.id
            });
        }
      }

      // Créer les éléments de commande
      const orderItems = cartItems.map(item => ({
        order_id: orderData.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        size: item.size,
        color: item.color
      }));

      await supabase
        .from('order_items')
        .insert(orderItems);

      setSuccess(true);
      clearCart();

      // Préparer les détails de la commande pour la page de confirmation
      const orderDetails = {
        orderId: orderData.id,
        items: cartItems,
        subtotal: getSubtotal(),
        tax: getTax(),
        discounts: activeDiscounts,
        discountTotal: getDiscountTotal(),
        giftCardDiscount: calculateGiftCardDiscount(),
        total: calculateFinalTotal(),
        shippingAddress: {
          firstName: form.firstName,
          lastName: form.lastName,
          address: finalShippingAddress.street,
          postalCode: finalShippingAddress.postalCode,
          city: finalShippingAddress.city,
          country: finalShippingAddress.country,
          phone: form.phone
        }
      };

      // Rediriger vers la page de confirmation
      navigate('/commande/confirmation', { 
        state: { orderDetails },
        replace: true 
      });
    } catch (error) {
      console.error('Error processing order:', error);
      setError('Une erreur est survenue lors du traitement de votre commande');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyGiftCard = async () => {
    if (!giftCardCode.trim()) {
      setGiftCardError('Veuillez entrer un code de chèque cadeau');
      return;
    }

    setGiftCardError(null);
    setGiftCardSuccess(null);
    setIsApplyingGiftCard(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Utilisateur non connecté');
      }

      // Vérifier si le code existe et est valide
      const { data: giftCard, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('code', giftCardCode.trim())
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;

      if (!giftCard) {
        setGiftCardError('Code invalide, expiré ou déjà utilisé');
        return;
      }

      // Vérifier si le chèque cadeau appartient à l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', session.user.id)
        .single();

      if (giftCard.recipient_email !== profile.email) {
        setGiftCardError('Ce chèque cadeau ne vous appartient pas');
        return;
      }

      // Vérifier si le chèque cadeau est déjà appliqué
      if (appliedGiftCards.some(card => card.id === giftCard.id)) {
        setGiftCardError('Ce chèque cadeau est déjà appliqué');
        return;
      }

      // Ajouter le chèque cadeau à la liste des chèques appliqués
      setAppliedGiftCards([...appliedGiftCards, giftCard]);
      setGiftCardCode('');
      setGiftCardSuccess(`Chèque cadeau de ${giftCard.amount.toFixed(2)} € appliqué avec succès`);

      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setGiftCardSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error applying gift card:', error);
      setGiftCardError('Une erreur est survenue lors de l\'application du chèque cadeau');
    } finally {
      setIsApplyingGiftCard(false);
    }
  };

  const handleRemoveGiftCard = (cardId: string) => {
    setAppliedGiftCards(appliedGiftCards.filter(card => card.id !== cardId));
  };

  const handleAddressSelected = (address: ShippingAddress) => {
    setShippingAddress(address);
  };

  const handleAlternateAddressSubmit = (address: Address) => {
    setAlternateAddress(address);
    setShowAddressModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Finaliser la commande</h1>

      {/* Checkout page notification banner */}
      <BannerNotification location="checkout_page" />

      {success ? (
        <div className="bg-green-50 p-6 rounded-lg">
          <div className="flex items-center">
            <Check className="h-6 w-6 text-green-500 mr-3" />
            <h2 className="text-lg font-medium text-green-800">
              Commande validée avec succès !
            </h2>
          </div>
          <p className="mt-2 text-sm text-green-700">
            Merci pour votre commande. Vous allez être redirigé vers la page de confirmation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              Informations de livraison
            </h2>

            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="ml-3 text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    Prénom
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Nom
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Téléphone
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse de livraison</h3>
                
                {userId && (
                  <div className="space-y-4">
                    {!useAlternateAddress ? (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <input
                              id="use-default-address"
                              name="address-type"
                              type="radio"
                              checked={!useAlternateAddress}
                              onChange={() => setUseAlternateAddress(false)}
                              className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300"
                            />
                            <label htmlFor="use-default-address" className="ml-2 block text-sm text-gray-900">
                              Utiliser mon adresse enregistrée
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              id="use-alternate-address"
                              name="address-type"
                              type="radio"
                              checked={useAlternateAddress}
                              onChange={() => setUseAlternateAddress(true)}
                              className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300"
                            />
                            <label htmlFor="use-alternate-address" className="ml-2 block text-sm text-gray-900">
                              Autre adresse de livraison
                            </label>
                          </div>
                        </div>
                        
                        <AddressSelector 
                          userId={userId}
                          selectedAddressId={shippingAddress?.id}
                          onAddressSelected={handleAddressSelected}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <input
                              id="use-default-address"
                              name="address-type"
                              type="radio"
                              checked={!useAlternateAddress}
                              onChange={() => setUseAlternateAddress(false)}
                              className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300"
                            />
                            <label htmlFor="use-default-address" className="ml-2 block text-sm text-gray-900">
                              Utiliser mon adresse enregistrée
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              id="use-alternate-address"
                              name="address-type"
                              type="radio"
                              checked={useAlternateAddress}
                              onChange={() => setUseAlternateAddress(true)}
                              className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300"
                            />
                            <label htmlFor="use-alternate-address" className="ml-2 block text-sm text-gray-900">
                              Autre adresse de livraison
                            </label>
                          </div>
                        </div>
                        
                        {alternateAddress ? (
                          <div className="bg-gray-50 p-4 rounded-md">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm text-gray-900">{alternateAddress.street}</p>
                                <p className="text-sm text-gray-500">
                                  {alternateAddress.postalCode} {alternateAddress.city}, {
                                    COUNTRIES.find(c => c.code === alternateAddress.country)?.name || alternateAddress.country
                                  }
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowAddressModal(true)}
                                className="text-sm text-[#8B1F38] hover:text-[#7A1B31]"
                              >
                                Modifier
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowAddressModal(true)}
                            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31]"
                          >
                            Ajouter une adresse de livraison
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chèque cadeau section */}
              <div className="mb-6 border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <Gift className="h-5 w-5 mr-2 text-[#8B1F38]" />
                  Utiliser un chèque cadeau
                </h3>
                
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={giftCardCode}
                      onChange={(e) => setGiftCardCode(e.target.value)}
                      placeholder="Entrez votre code"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] text-sm"
                    />
                  </div>
                  <button
                    onClick={handleApplyGiftCard}
                    disabled={isApplyingGiftCard || !giftCardCode.trim()}
                    className="px-4 py-2 bg-[#8B1F38] text-white rounded-md hover:bg-[#7A1B31] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isApplyingGiftCard ? 'Application...' : 'Appliquer'}
                  </button>
                </div>
                
                {giftCardError && (
                  <div className="mt-2 text-sm text-red-600 flex items-start">
                    <AlertCircle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                    <span>{giftCardError}</span>
                  </div>
                )}
                
                {giftCardSuccess && (
                  <div className="mt-2 text-sm text-green-600 flex items-start">
                    <Check className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                    <span>{giftCardSuccess}</span>
                  </div>
                )}

                {/* Applied gift cards */}
                {appliedGiftCards.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-500">Chèques cadeaux appliqués:</p>
                    {appliedGiftCards.map(card => (
                      <div key={card.id} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                        <div className="flex items-center">
                          <Gift className="h-4 w-4 text-[#8B1F38] mr-2" />
                          <span className="text-sm font-medium">{card.code}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium mr-2">{card.amount.toFixed(2)} €</span>
                          <button 
                            onClick={() => handleRemoveGiftCard(card.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/panier')}
                  className="inline-flex items-center text-gray-700 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au panier
                </button>

                <button
                  type="submit"
                  disabled={isLoading || (!shippingAddress && !alternateAddress)}
                  className={`flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] ${
                    isLoading || (!shippingAddress && !alternateAddress) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    'Traitement en cours...'
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Confirmer la commande
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div>
            <div className="bg-gray-50 rounded-lg p-6 sticky top-4">
              <h2 className="text-lg font-medium text-gray-900 mb-6">
                Récapitulatif de la commande
              </h2>

              <div className="space-y-4 mb-6">
                {cartItems.map((item) => {
                  const hasDiscount = activeDiscounts.some(d => d.productId === item.id);
                  const discount = activeDiscounts.find(d => d.productId === item.id);
                  
                  return (
                    <div key={`${item.id}-${item.size}-${item.color}-${item.productCode}`} className="flex items-center">
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
                          <p className="text-xs text-green-600">
                            Remise: -{discount?.percentage}%
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {getItemTotal(item).toFixed(2)} €
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sous-total</span>
                  <span>{getSubtotal().toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>TVA (20%)</span>
                  <span>{getTax().toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Livraison</span>
                  <span>Gratuite</span>
                </div>
                {activeDiscounts.length > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Remises</span>
                    <span>-{getDiscountTotal().toFixed(2)} €</span>
                  </div>
                )}
                {appliedGiftCards.length > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Chèques cadeaux</span>
                    <span>-{calculateGiftCardDiscount().toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-medium text-gray-900 pt-2">
                  <span>Total</span>
                  <span>{calculateFinalTotal().toFixed(2)} €</span>
                </div>
              </div>

              <div className="mt-6">
                <div className="rounded-md bg-gray-100 p-4">
                  <div className="flex items-center">
                    <Truck className="h-5 w-5 text-gray-400" />
                    <p className="ml-3 text-sm text-gray-700">
                      Livraison gratuite sous 3-5 jours ouvrés
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Address Modal */}
      <ShippingAddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSubmit={handleAlternateAddressSubmit}
        initialAddress={alternateAddress || undefined}
      />
    </div>
  );
}