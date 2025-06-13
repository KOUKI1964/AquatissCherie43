import React, { useState, useEffect } from 'react';
import { COUNTRIES, CountryData, Address, validatePostalCode } from '../types/address';

interface AddressFormProps {
  initialAddress?: Partial<Address>;
  onSubmit: (address: Address) => void;
  onCancel?: () => void;
  buttonText?: string;
  showCancelButton?: boolean;
}

export function AddressForm({
  initialAddress = {},
  onSubmit,
  onCancel,
  buttonText = 'Enregistrer',
  showCancelButton = true
}: AddressFormProps) {
  const [address, setAddress] = useState<Address>({
    street: initialAddress.street || '',
    postalCode: initialAddress.postalCode || '',
    city: initialAddress.city || '',
    country: initialAddress.country || 'FR'
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Address, boolean>>>({});
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);

  useEffect(() => {
    // Find the selected country data
    const country = COUNTRIES.find(c => c.code === address.country);
    setSelectedCountry(country || null);
  }, [address.country]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate on change
    validateField(name as keyof Address, value);
  };

  const validateField = (field: keyof Address, value: string) => {
    let error = '';
    
    switch (field) {
      case 'street':
        if (!value.trim()) {
          error = 'La rue est requise';
        } else if (value.length < 5) {
          error = 'L\'adresse est trop courte';
        }
        break;
      case 'postalCode':
        if (!value.trim()) {
          error = 'Le code postal est requis';
        } else if (address.country && !validatePostalCode(value, address.country)) {
          error = 'Format de code postal invalide';
        }
        break;
      case 'city':
        if (!value.trim()) {
          error = 'La ville est requise';
        }
        break;
      case 'country':
        if (!value) {
          error = 'Le pays est requis';
        }
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateForm = (): boolean => {
    const fields: (keyof Address)[] = ['street', 'postalCode', 'city', 'country'];
    let isValid = true;
    
    // Mark all fields as touched
    const newTouched: Partial<Record<keyof Address, boolean>> = {};
    fields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);
    
    // Validate all fields
    fields.forEach(field => {
      const fieldIsValid = validateField(field, address[field]);
      isValid = isValid && fieldIsValid;
    });
    
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(address);
    }
  };

  const getFieldError = (field: keyof Address): string => {
    return touched[field] && errors[field] ? errors[field] || '' : '';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="street" className="block text-sm font-medium text-gray-700">
          Rue
        </label>
        <textarea
          id="street"
          name="street"
          rows={2}
          value={address.street}
          onChange={handleChange}
          onBlur={() => validateField('street', address.street)}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            getFieldError('street')
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-[#8B1F38] focus:border-[#8B1F38]'
          }`}
          placeholder="Numéro et nom de rue, appartement, bâtiment, etc."
        />
        {getFieldError('street') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('street')}</p>
        )}
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700">
          Pays
        </label>
        <select
          id="country"
          name="country"
          value={address.country}
          onChange={handleChange}
          onBlur={() => validateField('country', address.country)}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            getFieldError('country')
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-[#8B1F38] focus:border-[#8B1F38]'
          }`}
        >
          {COUNTRIES.map(country => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        {getFieldError('country') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('country')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
            Code postal
          </label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            value={address.postalCode}
            onChange={handleChange}
            onBlur={() => validateField('postalCode', address.postalCode)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              getFieldError('postalCode')
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-[#8B1F38] focus:border-[#8B1F38]'
            }`}
            placeholder={selectedCountry?.postalCodeExample || ''}
          />
          {getFieldError('postalCode') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('postalCode')}</p>
          )}
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            Ville
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={address.city}
            onChange={handleChange}
            onBlur={() => validateField('city', address.city)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              getFieldError('city')
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-[#8B1F38] focus:border-[#8B1F38]'
            }`}
            placeholder="Ville"
          />
          {getFieldError('city') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('city')}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        {showCancelButton && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31]"
        >
          {buttonText}
        </button>
      </div>
    </form>
  );
}