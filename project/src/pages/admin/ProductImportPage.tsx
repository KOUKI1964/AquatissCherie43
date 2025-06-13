import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Clock,
  AlertCircle,
  Check,
  X,
  FileDown,
  Truck,
  Database,
  RotateCw,
  Play,
  Pause,
  Info,
  Settings,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  StopCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminSidebar } from '../../components/AdminSidebar';

interface Supplier {
  id: string;
  name: string;
  supplier_code: string;
  type: 'local' | 'dropshipping' | 'mixte';
  is_active: boolean;
  api_url: string | null;
  api_key: string | null;
  sync_enabled: boolean;
  mode: 'test' | 'production' | null;
}

interface ImportLog {
  id: string;
  supplier_id: string;
  status: 'pending' | 'success' | 'error' | 'partial' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  products_total: number;
  products_created: number;
  products_updated: number;
  products_failed: number;
  error_message: string | null;
  details: Record<string, any>;
  supplier?: {
    name: string;
    supplier_code: string;
  };
}

export function ProductImportPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    dateRange: 'all'
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'started_at',
    direction: 'desc'
  });
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [cancellationConfirmation, setCancellationConfirmation] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchSuppliers();
    fetchImportLogs();
    
    // Set up real-time subscription for import logs
    const importLogsSubscription = supabase
      .channel('import-logs-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'import_logs'
      }, () => {
        console.log('Import logs changed, refreshing data...');
        fetchImportLogs();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(importLogsSubscription);
    };
  }, [currentPage, sortConfig, filters.status, filters.dateRange, filters.search]);

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
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, supplier_code, type, is_active, api_url, api_key, sync_enabled, mode')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
      
      // Set the first supplier as selected if none is selected
      if (data && data.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      setError('Erreur lors du chargement des fournisseurs');
    }
  };

  const fetchImportLogs = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('import_logs')
        .select(`
          *,
          supplier:supplier_id (
            name,
            supplier_code
          )
        `)
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (selectedSupplierId) {
        query = query.eq('supplier_id', selectedSupplierId);
      }
      
      if (filters.dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query
          .gte('started_at', `${today}T00:00:00`)
          .lte('started_at', `${today}T23:59:59`);
      } else if (filters.dateRange === 'week') {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        query = query.gte('started_at', weekAgo.toISOString());
      } else if (filters.dateRange === 'month') {
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setMonth(today.getMonth() - 1);
        query = query.gte('started_at', monthAgo.toISOString());
      }

      // Apply search filter
      if (filters.search) {
        // We need to join with profiles to search by customer name or email
        query = query.or(`supplier.name.ilike.%${filters.search}%,supplier.supplier_code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setImportLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching import logs:', error);
      setError('Erreur lors du chargement des logs d\'importation');
    } finally {
      setIsLoading(false);
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
    fetchImportLogs();
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      dateRange: 'all'
    });
    setCurrentPage(1);
    fetchImportLogs();
  };

  const handleStartImport = async () => {
    if (!selectedSupplierId) {
      setError('Veuillez sélectionner un fournisseur');
      return;
    }

    setIsImporting(true);
    setError(null);
    setSuccess(null);

    try {
      // Create a new import log entry with status 'pending'
      const { data: logData, error: logError } = await supabase
        .from('import_logs')
        .insert({
          supplier_id: selectedSupplierId,
          status: 'pending',
          created_by: (await supabase.auth.getSession()).data.session?.user.id
        })
        .select()
        .single();

      if (logError) throw logError;

      // Call the Supabase Edge Function to start the import
      const { data, error: functionError } = await supabase.functions.invoke('sync-products-from-supplier', {
        body: { 
          supplier_id: selectedSupplierId,
          log_id: logData.id
        }
      });

      if (functionError) throw functionError;
      
      // Check the response from the Edge Function
      if (data && data.success) {
        setSuccess(`Importation démarrée avec succès. ID: ${logData.id}`);
      } else {
        setError('Erreur lors de l\'importation: ' + (data?.message || 'Raison inconnue'));
      }
      
      // Refresh import logs to show the latest status
      fetchImportLogs();
    } catch (error: any) {
      console.error('Error starting import:', error);
      setError('Erreur lors du démarrage de l\'importation: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelImport = async (logId: string) => {
    try {
      setIsCancelling(true);
      setError(null);
      
      // Call the Edge Function to cancel the import process
      const { data, error: functionError } = await supabase.functions.invoke('cancel-product-import', {
        body: { log_id: logId }
      });

      if (functionError) {
        console.error('Error calling cancel-product-import function:', functionError);
        throw new Error('Failed to send a request to the Edge Function');
      }

      if (!data || !data.success) {
        throw new Error(data?.message || 'Erreur lors de l\'annulation');
      }
      
      setSuccess('Importation annulée avec succès');
      setCancellationConfirmation(null);
      
      // Refresh import logs to show the latest status
      fetchImportLogs();
    } catch (error: any) {
      console.error('Error cancelling import:', error);
      setError('Erreur lors de l\'annulation de l\'importation: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <RotateCw className="h-4 w-4 animate-spin" />;
      case 'success': return <Check className="h-4 w-4" />;
      case 'error': return <X className="h-4 w-4" />;
      case 'partial': return <Info className="h-4 w-4" />;
      case 'cancelled': return <StopCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const toggleExpandLog = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = importLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(importLogs.length / itemsPerPage);

  if (isLoading && importLogs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
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
                  <h1 className="text-2xl font-bold text-gray-900">Importation des Produits</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Synchronisez les produits depuis vos fournisseurs externes
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleStartImport}
                  disabled={isImporting || !selectedSupplierId}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Importation en cours...
                    </>
                  ) : (
                    <>
                      <Database className="h-5 w-5 mr-2" />
                      Lancer l'importation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Supplier Selection */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Sélection du fournisseur</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fournisseur
                </label>
                <select
                  value={selectedSupplierId || ''}
                  onChange={(e) => setSelectedSupplierId(e.target.value || null)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers.map((supplier) => (
                    <option 
                      key={supplier.id} 
                      value={supplier.id}
                      disabled={!supplier.api_url || !supplier.api_key}
                    >
                      {supplier.name} ({supplier.supplier_code}) {!supplier.api_url || !supplier.api_key ? '- Configuration API manquante' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSupplierId && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Informations API</h3>
                  {(() => {
                    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
                    if (!selectedSupplier) return <p className="text-sm text-gray-500">Fournisseur non trouvé</p>;
                    
                    if (!selectedSupplier.api_url || !selectedSupplier.api_key) {
                      return (
                        <div className="bg-yellow-50 p-3 rounded-md">
                          <p className="text-sm text-yellow-700">
                            Ce fournisseur n'a pas de configuration API complète. 
                            <Link to={`/admin/suppliers/${selectedSupplierId}/edit`} className="ml-1 text-[#8B1F38] hover:underline">
                              Configurer maintenant
                            </Link>
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">URL API:</span> 
                            <span className="ml-1 text-gray-600">{selectedSupplier.api_url}</span>
                          </div>
                          <div>
                            <span className="font-medium">Mode:</span> 
                            <span className="ml-1 text-gray-600">{selectedSupplier.mode || 'Non défini'}</span>
                          </div>
                          <div>
                            <span className="font-medium">Synchronisation auto:</span> 
                            <span className="ml-1 text-gray-600">{selectedSupplier.sync_enabled ? 'Activée' : 'Désactivée'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Search and filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher dans les logs..."
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                    >
                      <option value="">Tous les statuts</option>
                      <option value="pending">En cours</option>
                      <option value="success">Succès</option>
                      <option value="error">Erreur</option>
                      <option value="partial">Partiel</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Période
                    </label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                    >
                      <option value="all">Toutes les périodes</option>
                      <option value="today">Aujourd'hui</option>
                      <option value="week">7 derniers jours</option>
                      <option value="month">30 derniers jours</option>
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

          {/* Import Logs */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('started_at')}
                  >
                    <div className="flex items-center">
                      Date
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Fournisseur
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Statut
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('products_total')}
                  >
                    <div className="flex items-center">
                      Produits
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Durée
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
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : currentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Aucun log d'importation trouvé
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {formatDate(log.started_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Truck className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {log.supplier?.name || 'Fournisseur inconnu'}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({log.supplier?.supplier_code || 'N/A'})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(log.status)}`}>
                            <span className="flex items-center">
                              {getStatusIcon(log.status)}
                              <span className="ml-1">
                                {log.status === 'pending' ? 'En cours' : 
                                 log.status === 'success' ? 'Succès' : 
                                 log.status === 'error' ? 'Erreur' : 
                                 log.status === 'partial' ? 'Partiel' :
                                 log.status === 'cancelled' ? 'Annulé' : log.status}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            Total: {log.products_total}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.products_created} créés, {log.products_updated} mis à jour
                            {log.products_failed > 0 && `, ${log.products_failed} échoués`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {log.completed_at 
                                ? `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)} sec` 
                                : 'En cours...'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {log.status === 'pending' && (
                              <button
                                onClick={() => setCancellationConfirmation(log.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Annuler l'importation"
                              >
                                <StopCircle className="h-5 w-5" />
                              </button>
                            )}
                            <button
                              onClick={() => toggleExpandLog(log.id)}
                              className="text-[#8B1F38] hover:text-[#7A1B31]"
                            >
                              {expandedLogId === log.id ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedLogId === log.id && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {log.error_message && (
                                <div className="bg-red-50 p-4 rounded-md">
                                  <div className="flex">
                                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                                    <p className="text-sm text-red-700">{log.error_message}</p>
                                  </div>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h3 className="text-sm font-medium text-gray-700 mb-2">Statistiques</h3>
                                  <div className="bg-white p-4 rounded-md border border-gray-200">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <p className="text-xs text-gray-500">Total produits</p>
                                        <p className="text-sm font-medium">{log.products_total}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Créés</p>
                                        <p className="text-sm font-medium text-green-600">{log.products_created}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Mis à jour</p>
                                        <p className="text-sm font-medium text-blue-600">{log.products_updated}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Échoués</p>
                                        <p className="text-sm font-medium text-red-600">{log.products_failed}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h3 className="text-sm font-medium text-gray-700 mb-2">Informations</h3>
                                  <div className="bg-white p-4 rounded-md border border-gray-200">
                                    <div className="space-y-2">
                                      <div>
                                        <p className="text-xs text-gray-500">Démarré le</p>
                                        <p className="text-sm">{formatDateTime(log.started_at)}</p>
                                      </div>
                                      {log.completed_at && (
                                        <div>
                                          <p className="text-xs text-gray-500">Terminé le</p>
                                          <p className="text-sm">{formatDateTime(log.completed_at)}</p>
                                        </div>
                                      )}
                                      {log.status === 'cancelled' && (
                                        <div>
                                          <p className="text-xs text-gray-500">Statut</p>
                                          <p className="text-sm text-gray-700">Annulé par l'utilisateur</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div>
                                  <h3 className="text-sm font-medium text-gray-700 mb-2">Détails techniques</h3>
                                  <div className="bg-gray-800 text-gray-200 p-4 rounded-md overflow-x-auto">
                                    <pre className="text-xs">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {importLogs.length > itemsPerPage && (
            <div className="px-6 py-4 bg-white border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Affichage de{' '}
                    <span className="font-medium">
                      {Math.min((currentPage - 1) * itemsPerPage + 1, importLogs.length)}
                    </span>
                    {' '}à{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, importLogs.length)}
                    </span>
                    {' '}sur{' '}
                    <span className="font-medium">{importLogs.length}</span>
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

        {/* Confirmation Modal for Cancellation */}
        {cancellationConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <StopCircle className="h-5 w-5 text-red-500 mr-2" />
                Confirmer l'annulation
              </h3>
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir annuler cette importation ? Cette action est irréversible.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setCancellationConfirmation(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  disabled={isCancelling}
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleCancelImport(cancellationConfirmation)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Annulation...
                    </>
                  ) : (
                    'Confirmer l\'annulation'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}