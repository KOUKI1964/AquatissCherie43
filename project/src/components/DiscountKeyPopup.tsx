import React, { useState, useEffect, useRef } from 'react';
import { X, LogIn, ShoppingBag, Circle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

interface DiscountKeyPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (firstPart: string, secondPart: string) => void;
  discountType?: 'silver' | 'bronze' | 'gold';
  discountPercentage?: number;
  productId?: string;
  productName?: string;
  productPrice?: number;
  productImage?: string;
  size?: string;
  color?: string;
}

const KEY_TYPES = {
  silver: { name: 'Argent', color: '#C0C0C0' },
  bronze: { name: 'Bronze', color: '#CD7F32' },
  gold: { name: 'Or', color: '#FFD700' }
};

export function DiscountKeyPopup({ 
  isOpen, 
  onClose, 
  onSubmit, 
  discountType, 
  discountPercentage,
  productId,
  productName,
  productPrice,
  productImage,
  size = 'M',
  color = 'Noir'
}: DiscountKeyPopupProps) {
  const [firstPart, setFirstPart] = useState('');
  const [secondPart, setSecondPart] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { cartItems, addToCart } = useCart();
  const MAX_ATTEMPTS = 5;
  
  // Refs for input fields
  const firstDigitRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const secondDigitRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (isOpen) {
      setFirstPart('');
      setSecondPart('');
      setError(null);
      setSuccess(null);
      checkAuthStatus();
      loadAttempts();
      
      // Focus on first input when popup opens
      setTimeout(() => {
        if (firstDigitRefs[0].current) {
          firstDigitRefs[0].current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
        
      if (data) {
        setUserProfile(data);
      }
    }
  };

  const loadAttempts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('profiles')
      .select('login_attempts')
      .eq('id', session.user.id)
      .maybeSingle();

    if (data) {
      setAttempts(data.login_attempts || 0);
    }
  };

  const updateAttempts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    await supabase
      .from('profiles')
      .update({ login_attempts: newAttempts })
      .eq('id', session.user.id);

    return newAttempts;
  };

  const addProductToCart = () => {
    if (!productId || !productName || !productPrice || !discountPercentage) return;

    // Calculate discounted price
    const discountedPrice = productPrice * (1 - discountPercentage / 100);

    // Check if product is already in cart
    const existingItem = cartItems.find(item => 
      item.id === parseInt(productId) && 
      item.size === size && 
      item.color === color
    );

    if (existingItem) {
      // Update existing item with discounted price
      addToCart({
        ...existingItem,
        price: discountedPrice,
        quantity: existingItem.quantity
      });
    } else {
      // Add new item with discount
      addToCart({
        id: parseInt(productId),
        name: productName,
        price: discountedPrice,
        image: productImage || '',
        quantity: 1,
        size,
        color,
        productCode: productId // Add the product ID as the product code
      });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    index: number, 
    isFirstPart: boolean,
    refs: React.RefObject<HTMLInputElement>[]
  ) => {
    const value = e.target.value;
    
    // Only allow one digit
    if (value.length > 1) {
      e.target.value = value.slice(0, 1);
    }
    
    // Only allow digits
    if (!/^\d*$/.test(e.target.value)) {
      e.target.value = '';
      return;
    }
    
    // Move to next input if a digit was entered
    if (value.length === 1 && index < 3) {
      refs[index + 1].current?.focus();
    }
    
    // Update the combined value
    const newValues = refs.map((ref, i) => ref.current?.value || '');
    if (isFirstPart) {
      setFirstPart(newValues.join(''));
    } else {
      setSecondPart(newValues.join(''));
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>, 
    index: number, 
    isFirstPart: boolean,
    refs: React.RefObject<HTMLInputElement>[]
  ) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === 'Backspace' && index > 0 && !e.currentTarget.value) {
      refs[index - 1].current?.focus();
    }
    
    // Move to next part when pressing right arrow on last digit
    if (e.key === 'ArrowRight' && index === 3 && isFirstPart) {
      secondDigitRefs[0].current?.focus();
    }
    
    // Move to previous part when pressing left arrow on first digit
    if (e.key === 'ArrowLeft' && index === 0 && !isFirstPart) {
      firstDigitRefs[3].current?.focus();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>, 
    isFirstPart: boolean,
    refs: React.RefObject<HTMLInputElement>[]
  ) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 4);
    
    if (digits.length > 0) {
      // Distribute digits to inputs
      digits.split('').forEach((digit, i) => {
        if (i < 4 && refs[i].current) {
          refs[i].current!.value = digit;
        }
      });
      
      // Update the combined value
      const newValues = refs.map((ref, i) => i < digits.length ? digits[i] : (ref.current?.value || ''));
      if (isFirstPart) {
        setFirstPart(newValues.join(''));
        // If we pasted 4 digits, move to the next section
        if (digits.length === 4) {
          secondDigitRefs[0].current?.focus();
        } else {
          // Otherwise focus on the next empty input
          refs[digits.length].current?.focus();
        }
      } else {
        setSecondPart(newValues.join(''));
        // If we pasted 4 digits, we're done
        if (digits.length === 4) {
          refs[3].current?.blur();
        } else {
          // Otherwise focus on the next empty input
          refs[digits.length].current?.focus();
        }
      }
    }
  };

  const validateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Veuillez vous connecter pour utiliser les clés de réductions.');
        return;
      }

      // Check if max attempts reached
      if (attempts >= MAX_ATTEMPTS) {
        setError('Nombre maximum de tentatives atteint');
        return;
      }

      // Get current user's profile
      const { data: currentUser } = await supabase
        .from('profiles')
        .select('user_identifier, purchases_count')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!currentUser) {
        setError('Utilisateur non trouvé');
        return;
      }

      // Check if user has made at least one purchase
      if (currentUser.purchases_count < 1) {
        setError('Effectuez votre premier achat pour profiter des clés de réduction !');
        return;
      }

      // Verify first part matches current user's first 4 digits
      if (firstPart !== currentUser.user_identifier.substring(0, 4)) {
        const newAttempts = await updateAttempts();
        setError(newAttempts >= MAX_ATTEMPTS ? 
          'Nombre maximum de tentatives atteint' : 
          'Code invalide'
        );
        return;
      }

      // Find partner user by last 4 digits
      const { data: partnerUser } = await supabase
        .from('profiles')
        .select('id, share_discount_key')
        .filter('user_identifier', 'ilike', `%${secondPart}`)
        .maybeSingle();

      if (!partnerUser) {
        const newAttempts = await updateAttempts();
        setError(newAttempts >= MAX_ATTEMPTS ? 
          'Nombre maximum de tentatives atteint' : 
          'Code invalide'
        );
        return;
      }

      // Check if partner shares discount keys
      if (!partnerUser.share_discount_key) {
        setError('Le partenaire ne partage pas encore de clés promo');
        return;
      }

      // Check if combination already used
      const combinedCode = `${firstPart}${secondPart}`;
      const { data: existingUse } = await supabase
        .from('discount_keys_usage')
        .select('id')
        .eq('code', combinedCode)
        .maybeSingle();

      if (existingUse) {
        setError('Code déjà utilisé');
        return;
      }

      // Get the discount key ID based on type
      if (!discountType) {
        setError('Type de réduction non spécifié');
        return;
      }

      const { data: discountKey } = await supabase
        .from('discount_keys')
        .select('id')
        .eq('type', discountType)
        .eq('is_active', true)
        .maybeSingle();

      if (!discountKey) {
        setError('Clé de réduction non trouvée');
        return;
      }

      // Record the usage with the correct discount key ID
      const { error: usageError } = await supabase
        .from('discount_keys_usage')
        .insert({
          code: combinedCode,
          user_id: session.user.id,
          partner_id: partnerUser.id,
          discount_key_id: discountKey.id
        });

      if (usageError) throw usageError;

      // Add or update product in cart with discount
      addProductToCart();

      // Show success message
      setSuccess('Clé de réduction activée. La remise a été appliquée à votre panier.');

      // Call onSubmit callback
      onSubmit(firstPart, secondPart);

      // Close popup after a delay
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error validating code:', error);
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Clé de réduction {discountType && KEY_TYPES[discountType].name}
            </h3>
            {discountType && discountPercentage && (
              <p className="text-sm text-gray-500 mt-1">
                Réduction de {discountPercentage}%
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="text-center py-6">
            <LogIn className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Veuillez vous connecter pour utiliser les clés de réductions.
            </p>
            <Link
              to="/connexion"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31]"
              onClick={onClose}
            >
              <LogIn className="h-5 w-5 mr-2" />
              Se connecter
            </Link>
          </div>
        ) : userProfile && userProfile.purchases_count < 1 ? (
          <div className="text-center py-6">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Effectuez votre premier achat pour profiter des clés de réduction !
            </p>
            <div className="bg-amber-50 p-4 rounded-md mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                <p className="text-sm text-amber-700">
                  Les clés de réduction sont disponibles après votre premier achat.
                </p>
              </div>
            </div>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31]"
              onClick={onClose}
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              Continuer mes achats
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-4 bg-red-50 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 rounded-md">
                <div className="flex items-center">
                  <ShoppingBag className="h-5 w-5 text-green-400 mr-2" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}

            <form onSubmit={validateCode} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mon code (<strong>quatre premiers</strong> chiffres)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={`first-${index}`} className="relative">
                      <input
                        ref={firstDigitRefs[index]}
                        type="text"
                        maxLength={1}
                        pattern="\d"
                        className="w-full h-12 text-center text-lg font-medium bg-gray-100 border border-gray-300 rounded-md focus:border-[#8B1F38] focus:ring-[#8B1F38] disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                        disabled={isLoading || attempts >= MAX_ATTEMPTS}
                        onChange={(e) => handleInputChange(e, index, true, firstDigitRefs)}
                        onKeyDown={(e) => handleKeyDown(e, index, true, firstDigitRefs)}
                        onPaste={(e) => handlePaste(e, true, firstDigitRefs)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code partenaire (quatre <strong>derniers</strong> chiffres)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={`second-${index}`} className="relative">
                      <input
                        ref={secondDigitRefs[index]}
                        type="text"
                        maxLength={1}
                        pattern="\d"
                        className="w-full h-12 text-center text-lg font-medium bg-gray-100 border border-gray-300 rounded-md focus:border-[#8B1F38] focus:ring-[#8B1F38] disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                        disabled={isLoading || attempts >= MAX_ATTEMPTS}
                        onChange={(e) => handleInputChange(e, index, false, secondDigitRefs)}
                        onKeyDown={(e) => handleKeyDown(e, index, false, secondDigitRefs)}
                        onPaste={(e) => handlePaste(e, false, secondDigitRefs)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading || attempts >= MAX_ATTEMPTS || firstPart.length !== 4 || secondPart.length !== 4}
                  className={`px-4 py-2 text-sm font-medium text-white bg-[#8B1F38] rounded-md hover:bg-[#7A1B31] disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? 'Validation...' : 'Valider'}
                </button>
              </div>

              {attempts > 0 && (
                <p className="text-sm text-gray-500 text-center">
                  Tentatives restantes : {MAX_ATTEMPTS - attempts}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}