import React, { useState, useEffect } from 'react';
import { Gift, Info, CreditCard, Mail, MessageSquare, Check, AlertCircle, X, ArrowLeft, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const AMOUNTS = [50, 100, 150];

interface GiftCardForm {
  amount: number;
  customAmount: string;
  recipientEmail: string;
  message: string;
}

// Schema for form validation
const giftCardSchema = z.object({
  amount: z.number().min(1, 'Le montant doit être supérieur à 0'),
  recipientEmail: z.string().email('Email invalide'),
  message: z.string().optional()
});

// Composant pour le formulaire de paiement par carte bancaire
function CardPaymentForm({
  onSuccess,
  onError,
  amount,
  isProcessing,
  setIsProcessing
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
  amount: number;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format with spaces every 4 digits
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    // Limit to 19 characters (16 digits + 3 spaces)
    return formatted.slice(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as MM/YY
    if (digits.length > 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    
    return digits;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate card number (should be 16 digits)
    const cardDigits = cardNumber.replace(/\s/g, '');
    if (!cardDigits || cardDigits.length !== 16 || !/^\d+$/.test(cardDigits)) {
      newErrors.cardNumber = 'Numéro de carte invalide';
    }
    
    // Validate card holder name
    if (!cardName.trim()) {
      newErrors.cardName = 'Nom du titulaire requis';
    }
    
    // Validate expiry date (should be MM/YY format)
    if (!expiryDate || !expiryDate.includes('/') || expiryDate.length !== 5) {
      newErrors.expiryDate = 'Date d\'expiration invalide';
    } else {
      const [month, year] = expiryDate.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (parseInt(month) < 1 || parseInt(month) > 12) {
        newErrors.expiryDate = 'Mois invalide';
      } else if (parseInt(year) < currentYear || 
                (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiryDate = 'Carte expirée';
      }
    }
    
    // Validate CVV (should be 3 digits)
    if (!cvv || cvv.length !== 3 || !/^\d+$/.test(cvv)) {
      newErrors.cvv = 'CVV invalide';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Simuler un délai de traitement du paiement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simuler une vérification de carte
      const lastFourDigits = cardNumber.replace(/\s/g, '').slice(-4);
      
      // Simuler un échec pour certains numéros de carte (pour les tests)
      if (lastFourDigits === '0000') {
        throw new Error('Carte refusée. Veuillez utiliser une autre carte.');
      }
      
      // Simuler un succès pour tous les autres cas
      onSuccess();
    } catch (error: any) {
      console.error('Erreur de paiement:', error);
      onError(error.message || 'Une erreur est survenue lors du traitement du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Numéro de carte
        </label>
        <div className="relative">
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            className={`block w-full px-4 py-3 border ${errors.cardNumber ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38]`}
            maxLength={19}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <CreditCard className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        {errors.cardNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom du titulaire
        </label>
        <input
          type="text"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          placeholder="NOM Prénom"
          className={`block w-full px-4 py-3 border ${errors.cardName ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38]`}
        />
        {errors.cardName && (
          <p className="mt-1 text-sm text-red-600">{errors.cardName}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date d'expiration
          </label>
          <input
            type="text"
            value={expiryDate}
            onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
            placeholder="MM/AA"
            className={`block w-full px-4 py-3 border ${errors.expiryDate ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38]`}
            maxLength={5}
          />
          {errors.expiryDate && (
            <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CVV
          </label>
          <div className="relative">
            <input
              type="text"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="123"
              className={`block w-full px-4 py-3 border ${errors.cvv ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38]`}
              maxLength={3}
            />
          </div>
          {errors.cvv && (
            <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
          <p className="text-sm text-blue-700">
            Ceci est un environnement de test. Aucune carte réelle ne sera débitée.
            <br />
            Pour tester un échec, utilisez un numéro se terminant par 0000.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-gray-200 pt-4">
        <div className="text-sm text-gray-500">
          Montant total: <span className="font-bold text-gray-700">{amount.toFixed(2)} €</span>
        </div>
        <button
          type="submit"
          disabled={isProcessing}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Payer maintenant
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function GiftCardPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<GiftCardForm>({
    amount: AMOUNTS[0],
    customAmount: '',
    recipientEmail: '',
    message: ''
  });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'payment' | 'confirmation'>('form');

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserEmail(profile.email);
      }
    } else {
      // Redirect to login if not authenticated
      navigate('/connexion', { 
        state: { message: 'Veuillez vous connecter pour créer un chèque cadeau' }
      });
    }
  };

  const generateGiftCardCode = () => {
    // Format: CHK-XXXX-XXXX
    const firstPart = Math.floor(1000 + Math.random() * 9000);
    const secondPart = Math.floor(1000 + Math.random() * 9000);
    return `CHK-${firstPart}-${secondPart}`;
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Calculate the actual amount
      const actualAmount = form.amount === 0 ? parseFloat(form.customAmount) : form.amount;
      
      // Validate form data
      giftCardSchema.parse({
        amount: actualAmount,
        recipientEmail: form.recipientEmail,
        message: form.message
      });

      // Proceed to payment step
      setStep('payment');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else {
        setError(error.message || 'Erreur lors de la validation du formulaire');
      }
    }
  };

  const handlePaymentSuccess = async () => {
    setIsProcessingPayment(true);
    
    try {
      // Calculate the actual amount
      const actualAmount = form.amount === 0 ? parseFloat(form.customAmount) : form.amount;
      
      if (!userId) {
        throw new Error('Utilisateur non connecté');
      }

      // Generate a unique code
      const code = generateGiftCardCode();
      setGiftCardCode(code);
      
      // Calculate expiration date (1 year from now)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Insert gift card into database
      const { data: giftCard, error: insertError } = await supabase
        .from('gift_cards')
        .insert({
          code,
          amount: actualAmount,
          recipient_email: form.recipientEmail,
          sender_id: userId,
          message: form.message || null,
          is_used: false,
          expires_at: expiresAt.toISOString(),
          metadata: {
            payment_method: 'card',
            sender_email: userEmail,
            payment_status: 'completed'
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Show success message
      setPaymentSuccess(true);
      setStep('confirmation');
      
      // Simulate email sending (in a real app, this would be done server-side)
      console.log('Email would be sent to:', form.recipientEmail, 'with code:', code);
      
    } catch (error: any) {
      console.error('Error creating gift card:', error);
      setError(error.message || 'Erreur lors de la création du chèque cadeau');
      setStep('form');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentError = (message: string) => {
    setError(message);
    setIsProcessingPayment(false);
  };

  const resetForm = () => {
    setForm({
      amount: AMOUNTS[0],
      customAmount: '',
      recipientEmail: '',
      message: ''
    });
    setStep('form');
    setPaymentSuccess(false);
    setGiftCardCode(null);
    setError(null);
  };

  const actualAmount = form.amount === 0 ? parseFloat(form.customAmount) || 0 : form.amount;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Offrez un Chèque Cadeau
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Faites plaisir à vos proches avec un chèque cadeau Aquatiss Chérie.
            Un cadeau élégant et personnalisé qui leur permettra de choisir parmi notre collection.
          </p>
        </div>

        {success && (
          <div className="mb-8 bg-green-50 p-4 rounded-lg max-w-3xl mx-auto">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}

        {step === 'confirmation' && paymentSuccess && (
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden mb-12">
            <div className="bg-[#8B1F38] px-6 py-8 text-white">
              <div className="flex items-center justify-center mb-4">
                <Check className="h-16 w-16" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-center">
                Paiement validé !
              </h2>
              <p className="mt-2 text-center text-white/90">
                Votre chèque-cadeau a été envoyé à {form.recipientEmail}.
              </p>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Détails du chèque cadeau</h3>
                  <Gift className="h-6 w-6 text-[#8B1F38]" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Code</span>
                    <span className="font-mono font-medium">{giftCardCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant</span>
                    <span className="font-medium">{actualAmount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Destinataire</span>
                    <span>{form.recipientEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Validité</span>
                    <span>1 an</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Retour à l'accueil
                </button>
                
                <button
                  onClick={resetForm}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31]"
                >
                  <Gift className="h-5 w-5 mr-2" />
                  Créer un autre chèque cadeau
                </button>
              </div>
            </div>
          </div>
        )}

        {step !== 'confirmation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {error && (
                <div className="bg-red-50 p-4 rounded-md mb-6">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {step === 'form' ? (
                <form onSubmit={handleProceedToPayment} className="space-y-6">
                  {/* Amount Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Montant
                    </label>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setForm({ ...form, amount, customAmount: '' })}
                          className={`py-3 px-4 rounded-md text-center ${
                            form.amount === amount && form.customAmount === ''
                              ? 'bg-[#8B1F38] text-white'
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                          }`}
                        >
                          {amount} €
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        placeholder="Montant personnalisé"
                        value={form.customAmount}
                        onChange={(e) => setForm({ 
                          ...form, 
                          customAmount: e.target.value,
                          amount: 0
                        })}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38]"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">€</span>
                      </div>
                    </div>
                  </div>

                  {/* Recipient Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email du destinataire
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        required
                        value={form.recipientEmail}
                        onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38]"
                        placeholder="email@exemple.com"
                      />
                    </div>
                  </div>

                  {/* Personal Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message personnel (optionnel)
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3">
                        <MessageSquare className="h-5 w-5 text-gray-400" />
                      </div>
                      <textarea
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        rows={4}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38]"
                        placeholder="Ajoutez un message personnel..."
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Annuler
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      Procéder au paiement
                    </button>
                  </div>
                </form>
              ) : step === 'payment' ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Paiement sécurisé</h3>
                    <button
                      onClick={() => setStep('form')}
                      className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Retour
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Montant du chèque cadeau</span>
                      <span className="font-medium">{actualAmount.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Frais de traitement</span>
                      <span className="font-medium">0.00 €</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="font-medium">Total</span>
                      <span className="font-bold">{actualAmount.toFixed(2)} €</span>
                    </div>
                  </div>
                  
                  <CardPaymentForm
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    amount={actualAmount}
                    isProcessing={isProcessingPayment}
                    setIsProcessing={setIsProcessingPayment}
                  />
                </div>
              ) : null}
            </div>

            {/* Preview & Info Section */}
            <div className="space-y-8">
              {/* Card Preview */}
              <div className="bg-gradient-to-r from-[#8B1F38] to-[#7A1B31] rounded-lg p-8 text-white shadow-lg transform transition-transform hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-8">
                  <Gift className="h-8 w-8" />
                  <h3 className="text-2xl font-serif">Chèque Cadeau</h3>
                </div>
                <div className="mb-6">
                  <p className="text-4xl font-bold mb-2">
                    {actualAmount > 0 ? actualAmount.toFixed(2) : '0.00'} €
                  </p>
                  <p className="text-sm opacity-80">
                    Valable sur tout le site Aquatiss Chérie
                  </p>
                </div>
                <div className="border-t border-white/20 pt-4">
                  <p className="italic text-sm">
                    {form.message || "Votre message personnel apparaîtra ici..."}
                  </p>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  Comment ça marche ?
                </h3>
                <ol className="space-y-4">
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#8B1F38] text-white text-sm mr-3 flex-shrink-0">
                      1
                    </span>
                    <p className="text-gray-600">
                      Choisissez le montant et personnalisez votre message
                    </p>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#8B1F38] text-white text-sm mr-3 flex-shrink-0">
                      2
                    </span>
                    <p className="text-gray-600">
                      Effectuez le paiement sécurisé par carte bancaire
                    </p>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#8B1F38] text-white text-sm mr-3 flex-shrink-0">
                      3
                    </span>
                    <p className="text-gray-600">
                      Le destinataire reçoit le chèque cadeau par email
                    </p>
                  </li>
                  <li className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#8B1F38] text-white text-sm mr-3 flex-shrink-0">
                      4
                    </span>
                    <p className="text-gray-600">
                      Il peut l'utiliser immédiatement sur notre site
                    </p>
                  </li>
                </ol>
                <div className="mt-6 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>Note :</strong> Le chèque cadeau est valable 1 an à partir de la date d'achat.
                    Il peut être utilisé en une ou plusieurs fois.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}