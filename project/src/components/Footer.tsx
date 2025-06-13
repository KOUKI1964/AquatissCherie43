import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Gift, Globe, CreditCard } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

// Payment method icons mapping
const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  visa: <CreditCard className="h-6 w-6 text-blue-600" />,
  mastercard: <CreditCard className="h-6 w-6 text-red-500" />,
  paypal: <CreditCard className="h-6 w-6 text-blue-800" />,
  applepay: <CreditCard className="h-6 w-6 text-black" />,
  googlepay: <CreditCard className="h-6 w-6 text-gray-600" />,
  amex: <CreditCard className="h-6 w-6 text-blue-400" />
};

// Social media icons mapping
const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-5 w-5" />,
  instagram: <Instagram className="h-5 w-5" />,
  twitter: <Twitter className="h-5 w-5" />
};

export function Footer() {
  const { settings, isLoading } = useSettings();

  // Default values in case settings are still loading
  const companyDescription = settings?.company_description || 'Votre destination pour des accessoires de mode élégants et raffinés.';
  const aboutLinks = settings?.about_links || [];
  const helpLinks = settings?.help_links || [];
  const legalLinks = settings?.legal_links || [];
  const socialLinks = settings?.social_links || [];
  const newsletterEnabled = settings?.newsletter_enabled !== undefined ? settings.newsletter_enabled : true;
  const newsletterText = settings?.newsletter_text || 'Inscrivez-vous à notre newsletter pour recevoir nos dernières nouveautés et offres exclusives';
  const acceptedPayments = settings?.accepted_payments || [];
  const showLanguageSelector = settings?.show_language_selector !== undefined ? settings.show_language_selector : true;
  const showCountrySelector = settings?.show_country_selector !== undefined ? settings.show_country_selector : true;
  const footerCopyright = settings?.footer_copyright || `© ${new Date().getFullYear()} Aquatiss Chérie. Tous droits réservés.`;

  if (isLoading) {
    return (
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-4">
                  <div className="h-6 bg-gray-700 rounded w-1/3"></div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(j => (
                      <div key={j} className="h-4 bg-gray-700 rounded w-2/3"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-serif font-bold mb-4">Aquatiss Chérie</h3>
            <p className="text-gray-400">
              {companyDescription}
            </p>
            <div className="flex space-x-4 mt-4">
              {socialLinks.map((social: { type: string, url: string }, index: number) => (
                <a key={index} href={social.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                  {SOCIAL_ICONS[social.type] || <Globe className="h-5 w-5" />}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Liens Rapides</h3>
            <ul className="space-y-2">
              {aboutLinks.map((link: { name: string, url: string }, index: number) => (
                <li key={index}>
                  <Link to={link.url} className="text-gray-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-bold mb-4">Service Client</h3>
            <ul className="space-y-2">
              {helpLinks.map((link: { name: string, url: string }, index: number) => (
                <li key={index}>
                  <Link to={link.url} className="text-gray-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="flex items-center text-gray-400">
                <MapPin className="h-5 w-5 mr-2" />
                <span>123 Rue de la Mode, 75001 Paris</span>
              </li>
              <li className="flex items-center text-gray-400">
                <Phone className="h-5 w-5 mr-2" />
                <span>01 23 45 67 89</span>
              </li>
              <li className="flex items-center text-gray-400">
                <Mail className="h-5 w-5 mr-2" />
                <span>contact@aquatisscherie.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        {newsletterEnabled && (
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="max-w-md mx-auto text-center">
              <h3 className="text-lg font-medium text-white mb-2">Restez informée</h3>
              <p className="text-gray-400 mb-4">{newsletterText}</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Votre email"
                  className="flex-1 px-4 py-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-[#8B1F38] w-full"
                />
                <button className="bg-[#8B1F38] px-4 py-2 rounded-r-md hover:bg-[#7A1B31] transition-colors">
                  S'inscrire
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        {acceptedPayments.length > 0 && (
          <div className="border-t border-gray-800 mt-8 pt-8">
            <div className="flex flex-wrap justify-center gap-4">
              {acceptedPayments.map((method: string, index: number) => (
                <div key={index} className="text-gray-400">
                  {PAYMENT_ICONS[method] || <CreditCard className="h-6 w-6" />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              {footerCopyright}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              {legalLinks.map((link: { name: string, url: string }, index: number) => (
                <Link key={index} to={link.url} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Language and Country Selectors */}
          {(showLanguageSelector || showCountrySelector) && (
            <div className="flex justify-center mt-6 space-x-4">
              {showLanguageSelector && (
                <select className="bg-gray-800 text-gray-400 text-sm rounded px-2 py-1 border border-gray-700">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              )}
              
              {showCountrySelector && (
                <select className="bg-gray-800 text-gray-400 text-sm rounded px-2 py-1 border border-gray-700">
                  <option value="fr">France</option>
                  <option value="be">Belgique</option>
                  <option value="ch">Suisse</option>
                  <option value="ca">Canada</option>
                </select>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}