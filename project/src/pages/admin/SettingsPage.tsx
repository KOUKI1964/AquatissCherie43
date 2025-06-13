import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Save, 
  AlertCircle, 
  Check, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Link as LinkIcon, 
  Facebook, 
  Instagram, 
  Twitter, 
  Globe, 
  CreditCard,
  Layout,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

interface SiteSetting {
  id: string;
  key: string;
  value: any;
  label: string;
  description: string | null;
  type: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface LinkItem {
  name: string;
  url: string;
}

interface SocialLinkItem {
  type: string;
  url: string;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('footer');
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isResetting, setIsResetting] = useState(false);

  // Fetch settings
  const { data: settings, isLoading: isLoadingSettings, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('key');
        
      if (error) throw error;
      return data || [];
    }
  });

  // Initialize form values when settings are loaded
  useEffect(() => {
    if (settings) {
      const initialValues: Record<string, any> = {};
      
      settings.forEach(setting => {
        try {
          // Handle different setting types appropriately
          if (setting.type === 'text' || setting.type === 'textarea') {
            // For text types, use the value directly
            initialValues[setting.key] = setting.value;
          } else {
            // For other types that should be JSON (links, social_links, etc)
            initialValues[setting.key] = typeof setting.value === 'string' 
              ? JSON.parse(setting.value) 
              : setting.value;
          }
        } catch (err) {
          console.error(`Error parsing setting ${setting.key}:`, err);
          // Fallback to raw value if parsing fails
          initialValues[setting.key] = setting.value;
        }
      });
      
      setFormValues(initialValues);
    }
  }, [settings]);

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!adminData) {
        navigate('/admin/login');
      }
    };

    checkAdminAccess();
  }, [navigate]);

  // Handle form value changes
  const handleChange = (key: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle text input changes
  const handleTextChange = (key: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleChange(key, e.target.value);
  };

  // Handle boolean input changes
  const handleBooleanChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(key, e.target.checked);
  };

  // Handle link item changes
  const handleLinkItemChange = (key: string, index: number, field: 'name' | 'url', value: string) => {
    const links = [...(formValues[key] || [])];
    links[index] = { ...links[index], [field]: value };
    handleChange(key, links);
  };

  // Add new link item
  const handleAddLinkItem = (key: string) => {
    const links = [...(formValues[key] || [])];
    links.push({ name: '', url: '' });
    handleChange(key, links);
  };

  // Remove link item
  const handleRemoveLinkItem = (key: string, index: number) => {
    const links = [...(formValues[key] || [])];
    links.splice(index, 1);
    handleChange(key, links);
  };

  // Handle social link changes
  const handleSocialLinkChange = (key: string, index: number, field: 'type' | 'url', value: string) => {
    const links = [...(formValues[key] || [])];
    links[index] = { ...links[index], [field]: value };
    handleChange(key, links);
  };

  // Add new social link
  const handleAddSocialLink = (key: string) => {
    const links = [...(formValues[key] || [])];
    links.push({ type: 'facebook', url: '' });
    handleChange(key, links);
  };

  // Handle payment methods changes
  const handlePaymentMethodChange = (key: string, method: string, isChecked: boolean) => {
    const methods = [...(formValues[key] || [])];
    
    if (isChecked && !methods.includes(method)) {
      methods.push(method);
    } else if (!isChecked && methods.includes(method)) {
      const index = methods.indexOf(method);
      methods.splice(index, 1);
    }
    
    handleChange(key, methods);
  };

  // Save all settings
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    
    try {
      // Validate form values
      for (const [key, value] of Object.entries(formValues)) {
        const setting = settings?.find(s => s.key === key);
        if (!setting) continue;
        
        if (setting.type === 'links' || setting.type === 'social_links') {
          // Validate links
          const links = value as Array<{ name: string, url: string }>;
          for (const link of links) {
            if (!link.name.trim()) {
              throw new Error(`Le nom du lien ne peut pas être vide dans "${setting.label}"`);
            }
            if (!link.url.trim()) {
              throw new Error(`L'URL du lien ne peut pas être vide dans "${setting.label}"`);
            }
          }
        }
      }
      
      // Update each setting
      for (const [key, value] of Object.entries(formValues)) {
        const setting = settings?.find(s => s.key === key);
        if (!setting) continue;

        // Convert value to appropriate format before saving
        let saveValue = value;
        if (setting.type !== 'text' && setting.type !== 'textarea' && typeof value !== 'string') {
          saveValue = JSON.stringify(value);
        }

        const { error } = await supabase
          .from('site_settings')
          .update({ value: saveValue })
          .eq('key', key);
          
        if (error) throw error;
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      
      setSuccess('Paramètres enregistrés avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'enregistrement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset settings to default values
  const handleResetDefaults = async () => {
    setIsResetting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Call a function to reset settings to default values
      const { error } = await supabase.rpc('reset_site_settings_to_default');
      
      if (error) throw error;
      
      // Refetch settings
      await refetch();
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      
      setSuccess('Paramètres réinitialisés avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error resetting settings:', err);
      setError(err.message || 'Une erreur est survenue lors de la réinitialisation des paramètres');
    } finally {
      setIsResetting(false);
    }
  };

  // Render form fields based on setting type
  const renderFormField = (setting: SiteSetting) => {
    const key = setting.key;
    const value = formValues[key];
    
    switch (setting.type) {
      case 'text':
        return (
          <input
            type="text"
            id={key}
            value={value || ''}
            onChange={(e) => handleTextChange(key, e)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
          />
        );
        
      case 'textarea':
        return (
          <textarea
            id={key}
            value={value || ''}
            onChange={(e) => handleTextChange(key, e)}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
          />
        );
        
      case 'boolean':
        return (
          <div className="mt-1">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleBooleanChange(key, e)}
                className="rounded border-gray-300 text-[#8B1F38] shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38]"
              />
              <span className="ml-2 text-sm text-gray-700">Activé</span>
            </label>
          </div>
        );
        
      case 'links':
        return (
          <div className="mt-1 space-y-2">
            {Array.isArray(value) && value.map((link: LinkItem, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={link.name || ''}
                  onChange={(e) => handleLinkItemChange(key, index, 'name', e.target.value)}
                  placeholder="Nom du lien"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                />
                <input
                  type="text"
                  value={link.url || ''}
                  onChange={(e) => handleLinkItemChange(key, index, 'url', e.target.value)}
                  placeholder="URL"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLinkItem(key, index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleAddLinkItem(key)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un lien
            </button>
          </div>
        );
        
      case 'social_links':
        return (
          <div className="mt-1 space-y-2">
            {Array.isArray(value) && value.map((link: SocialLinkItem, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <select
                  value={link.type || 'facebook'}
                  onChange={(e) => handleSocialLinkChange(key, index, 'type', e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="youtube">YouTube</option>
                  <option value="pinterest">Pinterest</option>
                </select>
                <input
                  type="text"
                  value={link.url || ''}
                  onChange={(e) => handleSocialLinkChange(key, index, 'url', e.target.value)}
                  placeholder="URL"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLinkItem(key, index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleAddSocialLink(key)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un réseau social
            </button>
          </div>
        );
        
      case 'payment_methods':
        const paymentMethods = [
          { id: 'visa', name: 'Visa' },
          { id: 'mastercard', name: 'Mastercard' },
          { id: 'paypal', name: 'PayPal' },
          { id: 'applepay', name: 'Apple Pay' },
          { id: 'googlepay', name: 'Google Pay' },
          { id: 'amex', name: 'American Express' }
        ];
        
        return (
          <div className="mt-1 grid grid-cols-2 gap-2">
            {paymentMethods.map(method => (
              <label key={method.id} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(method.id)}
                  onChange={(e) => handlePaymentMethodChange(key, method.id, e.target.checked)}
                  className="rounded border-gray-300 text-[#8B1F38] shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38]"
                />
                <span className="ml-2 text-sm text-gray-700">{method.name}</span>
              </label>
            ))}
          </div>
        );
        
      default:
        return (
          <div className="mt-1 text-sm text-red-600">
            Type de paramètre non pris en charge: {setting.type}
          </div>
        );
    }
  };

  // Group settings by tab
  const footerSettings = settings?.filter(s => 
    ['company_description', 'about_links', 'help_links', 'legal_links', 'social_links', 
     'newsletter_enabled', 'newsletter_text', 'accepted_payments', 
     'show_language_selector', 'show_country_selector', 'footer_copyright'].includes(s.key)
  ) || [];

  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar />
      <div className="flex-1 p-8 pl-64">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <SettingsIcon className="h-6 w-6 mr-2" />
              Paramètres du site
            </h1>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleResetDefaults}
                disabled={isResetting}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Valeurs par défaut
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-md bg-green-50 p-4">
              <div className="flex">
                <Check className="h-5 w-5 text-green-400" />
                <p className="ml-3 text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('footer')}
                  className={`py-4 px-6 text-sm font-medium ${
                    activeTab === 'footer'
                      ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Footer
                </button>
                <Link
                  to="/admin/banners"
                  className="py-4 px-6 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 flex items-center"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Bannières
                </Link>
              </nav>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {activeTab === 'footer' && (
                  <>
                    {footerSettings.map(setting => (
                      <div key={setting.key} className="space-y-1">
                        <label htmlFor={setting.key} className="block text-sm font-medium text-gray-700">
                          {setting.label}
                        </label>
                        {setting.description && (
                          <p className="text-xs text-gray-500">{setting.description}</p>
                        )}
                        {renderFormField(setting)}
                      </div>
                    ))}
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}