export interface Address {
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface ShippingAddress extends Address {
  id?: string;
  userId?: string;
  isDefault?: boolean;
  name?: string;
}

// Country data with postal code validation patterns
export interface CountryData {
  name: string;
  code: string;
  postalCodePattern: string;
  postalCodeExample: string;
}

// List of common countries with postal code validation patterns
export const COUNTRIES: CountryData[] = [
  {
    name: 'France',
    code: 'FR',
    postalCodePattern: '^\\d{5}$',
    postalCodeExample: '75001'
  },
  {
    name: 'Belgique',
    code: 'BE',
    postalCodePattern: '^\\d{4}$',
    postalCodeExample: '1000'
  },
  {
    name: 'Suisse',
    code: 'CH',
    postalCodePattern: '^\\d{4}$',
    postalCodeExample: '1200'
  },
  {
    name: 'Luxembourg',
    code: 'LU',
    postalCodePattern: '^\\d{4}$',
    postalCodeExample: '2540'
  },
  {
    name: 'Allemagne',
    code: 'DE',
    postalCodePattern: '^\\d{5}$',
    postalCodeExample: '10115'
  },
  {
    name: 'Italie',
    code: 'IT',
    postalCodePattern: '^\\d{5}$',
    postalCodeExample: '00144'
  },
  {
    name: 'Espagne',
    code: 'ES',
    postalCodePattern: '^\\d{5}$',
    postalCodeExample: '28001'
  },
  {
    name: 'Royaume-Uni',
    code: 'GB',
    postalCodePattern: '^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$',
    postalCodeExample: 'SW1A 1AA'
  },
  {
    name: 'Pays-Bas',
    code: 'NL',
    postalCodePattern: '^\\d{4} ?[A-Z]{2}$',
    postalCodeExample: '1234 AB'
  },
  {
    name: 'Portugal',
    code: 'PT',
    postalCodePattern: '^\\d{4}-\\d{3}$',
    postalCodeExample: '1000-100'
  },
  {
    name: 'Canada',
    code: 'CA',
    postalCodePattern: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$',
    postalCodeExample: 'K1A 0B1'
  },
  {
    name: 'Etats-Unis',
    code: 'US',
    postalCodePattern: '^\\d{5}(-\\d{4})?$',
    postalCodeExample: '10001'
  }
];

// Function to validate postal code based on country
export const validatePostalCode = (postalCode: string, countryCode: string): boolean => {
  const country = COUNTRIES.find(c => c.code === countryCode);
  if (!country) return true; // If country not found, don't validate
  
  const pattern = new RegExp(country.postalCodePattern);
  return pattern.test(postalCode);
};

// Function to get postal code example for a country
const getPostalCodeExample = (countryCode: string): string => {
  const country = COUNTRIES.find(c => c.code === countryCode);
  return country ? country.postalCodeExample : '';
};