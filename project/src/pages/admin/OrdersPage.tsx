import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Search,
  Filter,
  ArrowUpDown,
  Edit,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Download,
  FileDown,
  Eye,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  ShoppingBag,
  User,
  Mail,
  Phone,
  MapPin,
  Gift,
  Key
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminSidebar } from '../../components/AdminSidebar';

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'shipped' | 'cancelled';
  created_at: string;
  updated_at: string;
  shipping_address?: {
    firstName: string;
    lastName: string;
    address: string;
    phone: string;
  };
  tracking_number?: string;
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  items?: OrderItem[];
  gift_cards?: GiftCard[];
  discount_keys_usage?: DiscountKeyUsage[];
}

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  size: string;
  color: string;
}

interface GiftCard {
  id: string;
  code: string;
  amount: number;
}

interface DiscountKeyUsage {
  id: string;
  code: string;
  discount_key: {
    type: 'silver' | 'bronze' | 'gold';
    percentage: number;
  };
}

interface FilterState {
  status: string;
  dateRange: string;
  search: string;
  startDate: string;
  endDate: string;
}

export function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    dateRange: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showTrackingInput, setShowTrackingInput] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchOrders();
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

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email,
            phone
          ),
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            size,
            color
          ),
          gift_card_transactions (
            id,
            amount_used,
            gift_card:gift_card_id (
              id,
              code,
              amount
            )
          )
        `)
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply date range filter
      if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
        query = query
          .gte('created_at', `${filters.startDate}T00:00:00`)
          .lte('created_at', `${filters.endDate}T23:59:59`);
      } else if (filters.dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`);
      } else if (filters.dateRange === 'week') {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (filters.dateRange === 'month') {
        const today = new Date();
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      // Apply search filter
      if (filters.search) {
        // We need to join with profiles to search by customer name or email
        query = query.or(`profiles.email.ilike.%${filters.search}%,profiles.first_name.ilike.%${filters.search}%,profiles.last_name.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Process the data to format it correctly
      const processedOrders = data?.map(order => {
        return {
          ...order,
          customer: order.profiles,
          items: order.order_items,
          gift_cards: order.gift_card_transactions?.map((transaction: any) => transaction.gift_card) || []
        };
      }) || [];

      setOrders(processedOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError('Erreur lors du chargement des commandes');
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
    fetchOrders();
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      dateRange: 'all',
      search: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
    fetchOrders();
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      setSuccess(`Statut de la commande mis à jour avec succès`);
      
      // Update the order in the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus as any, updated_at: new Date().toISOString() } 
            : order
        )
      );
      
      // Update selected order if it's the one being viewed
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: newStatus as any,
          updated_at: new Date().toISOString()
        });
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating order status:', error);
      setError('Erreur lors de la mise à jour du statut de la commande');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddTrackingNumber = async (orderId: string) => {
    try {
      if (!trackingNumber.trim()) {
        setError('Veuillez entrer un numéro de suivi');
        return;
      }
      
      setIsUpdatingStatus(true);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          tracking_number: trackingNumber,
          status: 'shipped',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      setSuccess('Numéro de suivi ajouté et commande marquée comme expédiée');
      
      // Update the order in the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                tracking_number: trackingNumber,
                status: 'shipped',
                updated_at: new Date().toISOString() 
              } 
            : order
        )
      );
      
      // Update selected order if it's the one being viewed
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          tracking_number: trackingNumber,
          status: 'shipped',
          updated_at: new Date().toISOString()
        });
      }
      
      // Reset tracking number input
      setTrackingNumber('');
      setShowTrackingInput(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error adding tracking number:', error);
      setError('Erreur lors de l\'ajout du numéro de suivi');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Date',
      'Client',
      'Email',
      'Montant',
      'Statut'
    ];

    const csvData = orders.map(order => [
      order.id,
      new Date(order.created_at).toLocaleDateString('fr-FR'),
      `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`,
      order.customer?.email || '',
      `${order.total_amount.toFixed(2)} €`,
      getStatusLabel(order.status)
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commandes_export_${new Date().toISOString()}.csv`;
    link.click();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'processing': return 'En cours';
      case 'completed': return 'Terminée';
      case 'shipped': return 'Expédiée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <RefreshCw className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = orders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(orders.length / itemsPerPage);

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
                  <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Gérez les commandes de vos clients
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
                    placeholder="Rechercher par client, email ou numéro de commande..."
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <option value="pending">En attente</option>
                        <option value="processing">En cours</option>
                        <option value="completed">Terminée</option>
                        <option value="shipped">Expédiée</option>
                        <option value="cancelled">Annulée</option>
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
                        <option value="custom">Période personnalisée</option>
                      </select>
                    </div>
                    
                    {filters.dateRange === 'custom' && (
                      <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date de début
                          </label>
                          <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date de fin
                          </label>
                          <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                          />
                        </div>
                      </div>
                    )}
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

          {/* Orders list */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center">
                      Commande
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('created_at')}
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
                    Client
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('total_amount')}
                  >
                    <div className="flex items-center">
                      Montant
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
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
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      </div>
                    </td>
                  </tr>
                ) : currentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Aucune commande trouvée
                    </td>
                  </tr>
                ) : (
                  currentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ShoppingBag className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">#{order.id.substring(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.customer?.first_name} {order.customer?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customer?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          <span className="flex items-center">
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{getStatusLabel(order.status)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="text-[#8B1F38] hover:text-[#7A1B31] mr-3"
                          title="Voir les détails"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowTrackingInput(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Ajouter un numéro de suivi"
                        >
                          <Truck className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {orders.length > itemsPerPage && (
            <div className="px-6 py-4 bg-white border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Affichage de{' '}
                    <span className="font-medium">
                      {Math.min((currentPage - 1) * itemsPerPage + 1, orders.length)}
                    </span>
                    {' '}à{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, orders.length)}
                    </span>
                    {' '}sur{' '}
                    <span className="font-medium">{orders.length}</span>
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

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-gray-900">
                  Détails de la commande #{selectedOrder.id.substring(0, 8)}
                </h2>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Order Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Informations</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Date</span>
                      <span className="text-sm font-medium">{formatDate(selectedOrder.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Statut</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusLabel(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                    {selectedOrder.tracking_number && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Numéro de suivi</span>
                        <span className="text-sm font-medium">{selectedOrder.tracking_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Client</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">
                          {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <p className="text-sm">{selectedOrder.customer?.email}</p>
                    </div>
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <p className="text-sm">{selectedOrder.customer?.phone || 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Adresse de livraison</h3>
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        {selectedOrder.shipping_address?.firstName} {selectedOrder.shipping_address?.lastName}<br />
                        {selectedOrder.shipping_address?.address}<br />
                        {selectedOrder.shipping_address?.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Articles commandés</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produit
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Détails
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix unitaire
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantité
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items && selectedOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              Taille: {item.size} | Couleur: {item.color}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gift Cards and Discounts */}
              {(selectedOrder.gift_cards?.length > 0 || selectedOrder.discount_keys_usage?.length > 0) && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Réductions appliquées</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedOrder.gift_cards?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Gift className="h-4 w-4 mr-1 text-[#8B1F38]" />
                          Chèques cadeaux
                        </h4>
                        <div className="space-y-2">
                          {selectedOrder.gift_cards.map((card) => (
                            <div key={card.id} className="flex justify-between text-sm">
                              <span>{card.code}</span>
                              <span className="font-medium">{formatCurrency(card.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedOrder.discount_keys_usage?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Key className="h-4 w-4 mr-1 text-[#8B1F38]" />
                          Clés de réduction
                        </h4>
                        <div className="space-y-2">
                          {selectedOrder.discount_keys_usage.map((usage) => (
                            <div key={usage.id} className="flex justify-between text-sm">
                              <span>Code: {usage.code}</span>
                              <span className="font-medium">-{usage.discount_key.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Récapitulatif</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Sous-total HT</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedOrder.total_amount / 1.2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">TVA (20%)</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedOrder.total_amount - (selectedOrder.total_amount / 1.2))}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Total TTC</span>
                        <span className="text-sm font-bold">{formatCurrency(selectedOrder.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-wrap justify-between items-center">
                  <div className="mb-4 sm:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modifier le statut
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                        disabled={isUpdatingStatus}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="pending">En attente</option>
                        <option value="processing">En cours</option>
                        <option value="completed">Terminée</option>
                        <option value="shipped">Expédiée</option>
                        <option value="cancelled">Annulée</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        // Generate PDF or print view
                        window.print();
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Imprimer
                    </button>
                    <button
                      onClick={() => setShowOrderDetails(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <X className="h-5 w-5 mr-2" />
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Number Input Modal */}
        {showTrackingInput && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Ajouter un numéro de suivi
                </h3>
                <button
                  onClick={() => {
                    setShowTrackingInput(false);
                    setTrackingNumber('');
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                Commande #{selectedOrder.id.substring(0, 8)} pour {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de suivi
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                  placeholder="Ex: 1Z999AA10123456784"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTrackingInput(false);
                    setTrackingNumber('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleAddTrackingNumber(selectedOrder.id)}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#8B1F38] rounded-md hover:bg-[#7A1B31] disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Enregistrement...' : 'Enregistrer et expédier'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}