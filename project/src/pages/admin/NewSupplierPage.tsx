import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Globe,
  Truck,
  Mail,
  Phone,
  User,
  MapPin,
  DollarSign,
  Percent,
  Check,
  AlertCircle,
  Building,
  CreditCard,
  Tag,
  FileText,
  Link as LinkIcon,
  Calendar,
  ShoppingCart,
  Key,
  Webhook,
  Clock,
  Settings,
  RefreshCw,
  Database
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { z } from 'zod';

// Schema for form validation
const supplierSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  type: z.enum(['local', 'dropshipping', 'mixte']),
  country: z.string().min(1, 'Le pays est requis'),
  address: z.string().min(1, 'L\'adresse est requise'),
  phone: z.string().min(1, 'Le téléphone est requis'),
  email: z.string().email('Email invalide'),
  contact_name: z.string().min(1, 'Le nom du contact est requis'),
  contact_support: z.string().optional().nullable(),
  shipping_method: z.string().optional().nullable(),
  processing_time: z.number().int().nonnegative().optional().nullable(),
  delivery_time: z.string().optional().nullable(),
  shipping_zones: z.array(z.string()).optional().nullable(),
  shipping_fee_type: z.enum(['fixed', 'variable']).optional().nullable(),
  shipping_fee: z.number().nonnegative().optional().nullable(),
  return_policy: z.string().optional().nullable(),
  terms_conditions: z.string().optional().nullable(),
  has_connected_catalog: z.boolean().default(false),
  import_method: z.string().optional().nullable(),
  api_url: z.string().url().optional().nullable(),
  api_key: z.string().optional().nullable(),
  sync_enabled: z.boolean().optional().default(false),
  mode: z.enum(['test', 'production']).optional().nullable(),
  webhook_url: z.string().url().optional().nullable(),
  pricing_method: z.enum(['fixed', 'percentage', 'special']).optional().nullable(),
  includes_vat: z.boolean().default(true),
  recommended_margin: z.number().nonnegative().optional().nullable(),
  has_supplier_discount: z.boolean().default(false),
  discount_percentage: z.number().nonnegative().optional().nullable(),
  has_contract: z.boolean().default(false),
  has_local_stock: z.boolean().default(false),
  minimum_order: z.number().nonnegative().default(0),
  payment_methods: z.array(z.string()).optional().nullable(),
});

type SupplierForm = z.infer<typeof supplierSchema>;

export function NewSupplierPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SupplierForm>({
    name: '',
    type: 'local',
    country: '',
    address: '',
    phone: '',
    email: '',
    contact_name: '',
    contact_support: null,
    shipping_method: null,
    processing_time: null,
    delivery_time: null,
    shipping_zones: null,
    shipping_fee_type: null,
    shipping_fee: null,
    return_policy: null,
    terms_conditions: null,
    has_connected_catalog: false,
    import_method: null,
    api_url: null,
    api_key: null,
    sync_enabled: false,
    mode: null,
    webhook_url: null,
    pricing_method: null,
    includes_vat: true,
    recommended_margin: null,
    has_supplier_discount: false,
    discount_percentage: null,
    has_contract: false,
    has_local_stock: false,
    minimum_order: 0,
    payment_methods: null,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [paymentMethodsInput, setPaymentMethodsInput] = useState('');
  const [shippingZonesInput, setShippingZonesInput] = useState('');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Process arrays from string inputs
      const formData = {
        ...form,
        payment_methods: paymentMethodsInput ? paymentMethodsInput.split(',').map(m => m.trim()) : null,
        shipping_zones: shippingZonesInput ? shippingZonesInput.split(',').map(z => z.trim()) : null,
      };

      // Validate form data
      supplierSchema.parse(formData);

      setIsLoading(true);

      // Insert supplier
      const { data, error } = await supabase
        .from('suppliers')
        .insert(formData)
        .select()
        .single();

      if (error) throw error;

      setSuccess('Fournisseur créé avec succès');
      setTimeout(() => {
        navigate('/admin/suppliers');
      }, 2000);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else {
        console.error('Error creating supplier:', error);
        setError(error.message || 'Une erreur est survenue lors de la création du fournisseur');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testApiConnection = async () => {
    if (!form.api_url) {
      setError('URL de l\'API non définie');
      return;
    }

    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // This is a mock test - in a real application, you would make an actual API call
      const success = Math.random() > 0.3; // 70% chance of success for demo purposes
      
      setApiTestResult({
        success,
        message: success 
          ? 'Connexion à l\'API réussie' 
          : 'Échec de la connexion à l\'API. Vérifiez vos paramètres.'
      });
    } catch (error: any) {
      setApiTestResult({
        success: false,
        message: `Erreur: ${error.message || 'Une erreur est survenue'}`
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/admin/suppliers')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Nouveau fournisseur
            </h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50"
          >
            <Save className="h-5 w-5 mr-2" />
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
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

        <div className="bg-white shadow rounded-lg">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'general'
                    ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Informations générales
              </button>
              <button
                onClick={() => setActiveTab('shipping')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'shipping'
                    ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Livraison
              </button>
              <button
                onClick={() => setActiveTab('commercial')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'commercial'
                    ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Informations commerciales
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'api'
                    ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                API et intégration
              </button>
            </nav>
          </div>

          {/* Form content */}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {/* General Information */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom du fournisseur
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type de fournisseur
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Tag className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          value={form.type}
                          onChange={(e) => setForm({ ...form, type: e.target.value as 'local' | 'dropshipping' | 'mixte' })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          required
                        >
                          <option value="local">Local</option>
                          <option value="dropshipping">Dropshipping</option>
                          <option value="mixte">Mixte</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Pays
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Globe className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={form.country}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Téléphone
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom du contact principal
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={form.contact_name}
                          onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Contact support
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={form.contact_support || ''}
                          onChange={(e) => setForm({ ...form, contact_support: e.target.value || null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Téléphone ou email du support"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Adresse
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute top-3 left-3 pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <textarea
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          rows={3}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Information */}
              {activeTab === 'shipping' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Méthode d'expédition
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Truck className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={form.shipping_method || ''}
                          onChange={(e) => setForm({ ...form, shipping_method: e.target.value || null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Ex: Express, Standard, etc."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Délai de traitement (jours)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={form.processing_time || ''}
                          onChange={(e) => setForm({ ...form, processing_time: e.target.value ? parseInt(e.target.value) : null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Ex: 3"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Délai de livraison
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={form.delivery_time || ''}
                          onChange={(e) => setForm({ ...form, delivery_time: e.target.value || null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Ex: 3-5 jours ouvrés"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type de frais de livraison
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          value={form.shipping_fee_type || ''}
                          onChange={(e) => setForm({ ...form, shipping_fee_type: e.target.value as 'fixed' | 'variable' | null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                        >
                          <option value="">Sélectionner un type</option>
                          <option value="fixed">Fixe</option>
                          <option value="variable">Variable</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Frais de livraison
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.shipping_fee || ''}
                          onChange={(e) => setForm({ ...form, shipping_fee: e.target.value ? parseFloat(e.target.value) : null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Ex: 9.99"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Zones de livraison (séparées par des virgules)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Globe className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={shippingZonesInput}
                          onChange={(e) => setShippingZonesInput(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Ex: France, Belgique, Suisse"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Politique de retour
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute top-3 left-3 pointer-events-none">
                          <FileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <textarea
                          value={form.return_policy || ''}
                          onChange={(e) => setForm({ ...form, return_policy: e.target.value || null })}
                          rows={3}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Décrivez la politique de retour du fournisseur"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Conditions générales
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute top-3 left-3 pointer-events-none">
                          <FileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <textarea
                          value={form.terms_conditions || ''}
                          onChange={(e) => setForm({ ...form, terms_conditions: e.target.value || null })}
                          rows={3}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Conditions générales du fournisseur"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Commercial Information */}
              {activeTab === 'commercial' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Méthode de tarification
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          value={form.pricing_method || ''}
                          onChange={(e) => setForm({ ...form, pricing_method: e.target.value as 'fixed' | 'percentage' | 'special' | null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                        >
                          <option value="">Sélectionner une méthode</option>
                          <option value="fixed">Fixe</option>
                          <option value="percentage">Pourcentage</option>
                          <option value="special">Spéciale</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Marge recommandée (%)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Percent className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.recommended_margin || ''}
                          onChange={(e) => setForm({ ...form, recommended_margin: e.target.value ? parseFloat(e.target.value) : null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Ex: 30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Commande minimum
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <ShoppingCart className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.minimum_order}
                          onChange={(e) => setForm({ ...form, minimum_order: parseFloat(e.target.value) })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Ex: 100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Méthode d'import
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={form.import_method || ''}
                          onChange={(e) => setForm({ ...form, import_method: e.target.value || null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Ex: CSV, API, Manuel"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Méthodes de paiement (séparées par des virgules)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <CreditCard className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={paymentMethodsInput}
                          onChange={(e) => setPaymentMethodsInput(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Ex: Virement bancaire, Carte de crédit, PayPal"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 grid grid-cols-2 gap-6">
                      <div className="flex items-center">
                        <input
                          id="has_connected_catalog"
                          name="has_connected_catalog"
                          type="checkbox"
                          checked={form.has_connected_catalog}
                          onChange={(e) => setForm({ ...form, has_connected_catalog: e.target.checked })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="has_connected_catalog" className="ml-2 block text-sm text-gray-900">
                          Catalogue connecté
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          id="includes_vat"
                          name="includes_vat"
                          type="checkbox"
                          checked={form.includes_vat}
                          onChange={(e) => setForm({ ...form, includes_vat: e.target.checked })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="includes_vat" className="ml-2 block text-sm text-gray-900">
                          TVA incluse
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          id="has_supplier_discount"
                          name="has_supplier_discount"
                          type="checkbox"
                          checked={form.has_supplier_discount}
                          onChange={(e) => setForm({ ...form, has_supplier_discount: e.target.checked })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="has_supplier_discount" className="ml-2 block text-sm text-gray-900">
                          Remise fournisseur
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          id="has_contract"
                          name="has_contract"
                          type="checkbox"
                          checked={form.has_contract}
                          onChange={(e) => setForm({ ...form, has_contract: e.target.checked })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="has_contract" className="ml-2 block text-sm text-gray-900">
                          Contrat existant
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          id="has_local_stock"
                          name="has_local_stock"
                          type="checkbox"
                          checked={form.has_local_stock}
                          onChange={(e) => setForm({ ...form, has_local_stock: e.target.checked })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="has_local_stock" className="ml-2 block text-sm text-gray-900">
                          Stock local
                        </label>
                      </div>
                    </div>

                    {form.has_supplier_discount && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Pourcentage de remise
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Percent className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={form.discount_percentage || ''}
                            onChange={(e) => setForm({ ...form, discount_percentage: e.target.value ? parseFloat(e.target.value) : null })}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                            placeholder="Ex: 10"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* API and Integration */}
              {activeTab === 'api' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <LinkIcon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Intégration API</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Configurez l'intégration API avec ce fournisseur pour synchroniser automatiquement les produits, les prix et les stocks.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        URL de l'API
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LinkIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="url"
                          value={form.api_url || ''}
                          onChange={(e) => setForm({ ...form, api_url: e.target.value || null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="https://api.fournisseur.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Clé API
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          value={form.api_key || ''}
                          onChange={(e) => setForm({ ...form, api_key: e.target.value || null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Clé secrète d'API"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        URL de webhook
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Webhook className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="url"
                          value={form.webhook_url || ''}
                          onChange={(e) => setForm({ ...form, webhook_url: e.target.value || null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="https://webhook.fournisseur.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Mode
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Settings className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          value={form.mode || ''}
                          onChange={(e) => setForm({ ...form, mode: e.target.value as 'test' | 'production' | null })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                        >
                          <option value="">Sélectionner un mode</option>
                          <option value="test">Test</option>
                          <option value="production">Production</option>
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            id="sync_enabled"
                            name="sync_enabled"
                            type="checkbox"
                            checked={form.sync_enabled}
                            onChange={(e) => setForm({ ...form, sync_enabled: e.target.checked })}
                            className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                          />
                          <label htmlFor="sync_enabled" className="ml-2 block text-sm text-gray-900">
                            Activer la synchronisation automatique
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={testApiConnection}
                          disabled={!form.api_url || isTestingApi}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50"
                        >
                          {isTestingApi ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Test en cours...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Tester la connexion
                            </>
                          )}
                        </button>
                      </div>
                      
                      {apiTestResult && (
                        <div className={`mt-3 p-3 rounded-md ${apiTestResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                          <div className="flex">
                            {apiTestResult.success ? (
                              <Check className={`h-5 w-5 text-green-400 mr-2`} />
                            ) : (
                              <AlertCircle className={`h-5 w-5 text-red-400 mr-2`} />
                            )}
                            <p className={`text-sm ${apiTestResult.success ? 'text-green-700' : 'text-red-700'}`}>
                              {apiTestResult.message}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Informations sur l'API</h4>
                        <p className="text-sm text-gray-500 mb-2">
                          L'intégration API permet de synchroniser automatiquement les produits, les prix et les stocks avec ce fournisseur.
                        </p>
                        <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
                          <li>Utilisez le mode "Test" pour vérifier l'intégration avant de passer en production</li>
                          <li>La synchronisation peut être programmée ou déclenchée manuellement</li>
                          <li>Les webhooks permettent de recevoir des notifications en temps réel</li>
                        </ul>
                        <div className="mt-4">
                          <p className="text-sm text-gray-700">
                            Après avoir créé le fournisseur, vous pourrez importer ses produits depuis la 
                            <Link to="/admin/product-import" className="ml-1 text-[#8B1F38] hover:underline">
                              page d'importation des produits
                            </Link>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}