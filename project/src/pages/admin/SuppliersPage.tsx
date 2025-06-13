import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  Globe,
  Truck,
  Mail,
  Phone,
  User,
  MapPin,
  Tag,
  RefreshCw,
  Eye,
  EyeOff,
  FileDown,
  AlertTriangle,
  History,
  Link as LinkIcon,
  Key,
  Webhook,
  Clock,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminSidebar } from '../../components/AdminSidebar';

interface Supplier {
  id: string;
  name: string;
  type: 'local' | 'dropshipping' | 'mixte';
  is_active: boolean;
  country: string;
  address: string;
  phone: string;
  email: string;
  contact_name: string;
  contact_support?: string;
  shipping_method: string | null;
  processing_time: number | null;
  delivery_time?: string | null;
  shipping_zones: string[] | null;
  shipping_fee_type: 'fixed' | 'variable' | null;
  shipping_fee: number | null;
  return_policy: string | null;
  terms_conditions?: string | null;
  has_connected_catalog: boolean;
  import_method: string | null;
  api_url: string | null;
  api_key?: string | null;
  sync_enabled?: boolean;
  mode?: 'test' | 'production' | null;
  webhook_url?: string | null;
  pricing_method: 'fixed' | 'percentage' | 'special' | null;
  includes_vat: boolean;
  recommended_margin: number | null;
  has_supplier_discount: boolean;
  discount_percentage: number | null;
  has_contract: boolean;
  has_local_stock: boolean;
  minimum_order: number;
  payment_methods: string[] | null;
  created_at: string;
  updated_at: string;
  supplier_code: string | null;
}

interface SupplierCodeHistory {
  supplier_name: string;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
  last_used_at: string;
}

interface FilterState {
  search: string;
  type: string;
  country: string;
  isActive: string;
  apiIntegration: string;
}

export function SuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: '',
    country: '',
    isActive: '',
    apiIntegration: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [countries, setCountries] = useState<string[]>([]);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showCodeHistoryModal, setShowCodeHistoryModal] = useState(false);
  const [selectedSupplierCode, setSelectedSupplierCode] = useState<string | null>(null);
  const [codeHistory, setCodeHistory] = useState<SupplierCodeHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchSuppliers();
  }, [currentPage, sortConfig]);

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

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('suppliers')
        .select('*')
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,supplier_code.ilike.%${filters.search}%`);
      }
      
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters.country) {
        query = query.eq('country', filters.country);
      }
      
      if (filters.isActive) {
        query = query.eq('is_active', filters.isActive === 'active');
      }
      
      if (filters.apiIntegration) {
        if (filters.apiIntegration === 'connected') {
          query = query.not('api_url', 'is', null);
        } else if (filters.apiIntegration === 'not_connected') {
          query = query.is('api_url', null);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setSuppliers(data || []);
      
      // Extract unique countries for filter
      const uniqueCountries = [...new Set(data?.map(supplier => supplier.country) || [])];
      setCountries(uniqueCountries.sort());
      
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      setError('Erreur lors du chargement des fournisseurs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupplierCodeHistory = async (code: string) => {
    try {
      setIsLoadingHistory(true);
      
      const { data, error } = await supabase.rpc('get_supplier_code_history', {
        p_code: code
      });
      
      if (error) throw error;
      
      setCodeHistory(data || []);
      setShowCodeHistoryModal(true);
      
    } catch (error: any) {
      console.error('Error fetching supplier code history:', error);
      setError(`Erreur lors du chargement de l'historique du code: ${error.message}`);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchSuppliers();
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      type: '',
      country: '',
      isActive: '',
      apiIntegration: ''
    });
    setCurrentPage(1);
    fetchSuppliers();
  };

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ 
          is_active: !supplier.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplier.id);

      if (error) throw error;
      
      setSuccess(`Fournisseur ${!supplier.is_active ? 'activé' : 'désactivé'} avec succès`);
      fetchSuppliers();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(`Erreur lors de la modification: ${error.message}`);
    }
  };

  const handleDelete = async (supplierId: string) => {
    try {
      // Check if supplier has products
      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_code', suppliers.find(s => s.id === supplierId)?.supplier_code || '');
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        setError(`Ce fournisseur est associé à ${count} produits. Veuillez d'abord supprimer ou réassigner ces produits.`);
        setDeleteConfirmation(null);
        return;
      }
      
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;

      setSuccess('Fournisseur supprimé avec succès');
      fetchSuppliers();
      setDeleteConfirmation(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Code',
      'Nom',
      'Type',
      'Pays',
      'Email',
      'Contact',
      'Téléphone',
      'Statut',
      'API URL',
      'Mode'
    ];

    const csvData = suppliers.map(supplier => [
      supplier.supplier_code || '',
      supplier.name,
      supplier.type,
      supplier.country,
      supplier.email,
      supplier.contact_name,
      supplier.phone,
      supplier.is_active ? 'Actif' : 'Inactif',
      supplier.api_url || '',
      supplier.mode || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `suppliers_export_${new Date().toISOString()}.csv`;
    link.click();
  };

  const handleViewCodeHistory = (code: string) => {
    setSelectedSupplierCode(code);
    fetchSupplierCodeHistory(code);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSuppliers = suppliers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(suppliers.length / itemsPerPage);

  const getSupplierTypeLabel = (type: string) => {
    switch (type) {
      case 'local': return 'Local';
      case 'dropshipping': return 'Dropshipping';
      case 'mixte': return 'Mixte';
      default: return type;
    }
  };

  const getApiStatusLabel = (supplier: Supplier) => {
    if (!supplier.api_url) return 'Non connecté';
    if (!supplier.sync_enabled) return 'Désactivé';
    return supplier.mode === 'production' ? 'Production' : 'Test';
  };

  const getApiStatusColor = (supplier: Supplier) => {
    if (!supplier.api_url) return 'bg-gray-100 text-gray-800';
    if (!supplier.sync_enabled) return 'bg-yellow-100 text-yellow-800';
    return supplier.mode === 'production' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  if (isLoading && suppliers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 p-8">
        {error && (
          <div className="mb-4 bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/admin/dashboard"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                  >
                    <Home className="h-5 w-5 mr-2" />
                    Tableau de bord
                  </Link>
                  <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Gérez vos fournisseurs et leurs informations
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FileDown className="h-5 w-5 mr-2" />
                  Exporter CSV
                </button>
                <Link
                  to="/admin/suppliers/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nouveau fournisseur
                </Link>
              </div>
            </div>

            {/* Search and filters */}
            <div className="mt-6">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher par nom, email ou code..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                >
                  <Filter className="h-5 w-5 mr-2" />
                  Filtres
                </button>
              </div>

              {/* Filter panel */}
              {showFilters && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type
                      </label>
                      <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous les types</option>
                        <option value="local">Local</option>
                        <option value="dropshipping">Dropshipping</option>
                        <option value="mixte">Mixte</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Pays
                      </label>
                      <select
                        value={filters.country}
                        onChange={(e) => handleFilterChange('country', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous les pays</option>
                        {countries.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Statut
                      </label>
                      <select
                        value={filters.isActive}
                        onChange={(e) => handleFilterChange('isActive', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous les statuts</option>
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Intégration API
                      </label>
                      <select
                        value={filters.apiIntegration}
                        onChange={(e) => handleFilterChange('apiIntegration', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous</option>
                        <option value="connected">Connecté</option>
                        <option value="not_connected">Non connecté</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                    >
                      Réinitialiser
                    </button>
                    <button
                      onClick={applyFilters}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Suppliers list */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('supplier_code')}
                  >
                    <div className="flex items-center">
                      Code
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Nom
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('country')}
                  >
                    <div className="flex items-center">
                      Pays
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Contact
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Statut
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    API
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      Aucun fournisseur trouvé
                    </td>
                  </tr>
                ) : (
                  currentSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Tag className="h-5 w-5 text-gray-400 mr-2" />
                          <div className="flex items-center">
                            <span className="font-mono text-sm">{supplier.supplier_code || '-'}</span>
                            {supplier.supplier_code && (
                              <button
                                onClick={() => handleViewCodeHistory(supplier.supplier_code!)}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                                title="Voir l'historique du code"
                              >
                                <History className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          supplier.type === 'local'
                            ? 'bg-green-100 text-green-800'
                            : supplier.type === 'dropshipping'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {getSupplierTypeLabel(supplier.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Globe className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{supplier.country}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{supplier.contact_name}</div>
                        <div className="text-sm text-gray-500">{supplier.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          supplier.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {supplier.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          getApiStatusColor(supplier)
                        }`}>
                          {getApiStatusLabel(supplier)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleToggleActive(supplier)}
                            className={`p-1 rounded-full ${
                              supplier.is_active
                                ? 'text-green-600 hover:text-green-900 hover:bg-green-100'
                                : 'text-red-600 hover:text-red-900 hover:bg-red-100'
                            }`}
                            title={supplier.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {supplier.is_active ? (
                              <Eye className="h-5 w-5" />
                            ) : (
                              <EyeOff className="h-5 w-5" />
                            )}
                          </button>
                          <Link
                            to={`/admin/suppliers/${supplier.id}/edit`}
                            className="p-1 rounded-full text-blue-600 hover:text-blue-900 hover:bg-blue-100"
                            title="Modifier"
                          >
                            <Edit className="h-5 w-5" />
                          </Link>
                          {deleteConfirmation === supplier.id ? (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleDelete(supplier.id)}
                                className="p-1 rounded-full text-green-600 hover:text-green-900 hover:bg-green-100"
                                title="Confirmer la suppression"
                              >
                                <Check className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="p-1 rounded-full text-red-600 hover:text-red-900 hover:bg-red-100"
                                title="Annuler"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmation(supplier.id)}
                              className="p-1 rounded-full text-red-600 hover:text-red-900 hover:bg-red-100"
                              title="Supprimer"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {suppliers.length > itemsPerPage && (
            <div className="px-6 py-4 bg-white border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Affichage de{' '}
                    <span className="font-medium">
                      {Math.min((currentPage - 1) * itemsPerPage + 1, suppliers.length)}
                    </span>
                    {' '}à{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, suppliers.length)}
                    </span>
                    {' '}sur{' '}
                    <span className="font-medium">{suppliers.length}</span>
                    {' '}résultats
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Précédent
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border ${
                          currentPage === page
                            ? 'bg-[#8B1F38] text-white border-[#8B1F38]'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        } text-sm font-medium`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmer la suppression
                </h3>
              </div>
              <p className="text-gray-500 mb-4">
                Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmation)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Supplier Code History Modal */}
        {showCodeHistoryModal && selectedSupplierCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Historique du code fournisseur: {selectedSupplierCode}
                </h3>
                <button
                  onClick={() => setShowCodeHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : codeHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun historique trouvé pour ce code fournisseur
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nom du fournisseur
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Créé le
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supprimé le
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dernière utilisation
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {codeHistory.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.supplier_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.deleted_at ? new Date(record.deleted_at).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.last_used_at).toLocaleDateString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCodeHistoryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}