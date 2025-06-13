import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Download,
  Save,
  AlertCircle,
  Gift,
  Key,
  ShoppingBag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

export function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showTrackingInput, setShowTrackingInput] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    if (id) {
      fetchOrder();
    }
  }, [id]);

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

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
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
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Process the data to format it correctly
      const processedOrder = {
        ...data,
        customer: data.profiles,
        items: data.order_items,
        gift_cards: data.gift_card_transactions?.map((transaction: any) => transaction.gift_card) || []
      };

      setOrder(processedOrder);
      if (processedOrder.tracking_number) {
        setTrackingNumber(processedOrder.tracking_number);
      }
    } catch (error: any) {
      console.error('Error fetching order:', error);
      setError('Erreur lors du chargement de la commande');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setSuccess(`Statut de la commande mis à jour avec succès`);
      
      // Update the order in the local state
      if (order) {
        setOrder({
          ...order,
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

  const handleAddTrackingNumber = async () => {
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
        .eq('id', id);

      if (error) throw error;
      
      setSuccess('Numéro de suivi ajouté et commande marquée comme expédiée');
      
      // Update the order in the local state
      if (order) {
        setOrder({
          ...order,
          tracking_number: trackingNumber,
          status: 'shipped',
          updated_at: new Date().toISOString()
        });
      }
      
      // Hide tracking input
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
      case 'processing': return <Package className="h-4 w-4" />;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center text-red-500 mb-4">
              <AlertCircle className="h-6 w-6 mr-2" />
              <h2 className="text-xl font-medium">Commande introuvable</h2>
            </div>
            <p className="text-gray-600 mb-4">
              La commande que vous recherchez n'existe pas ou a été supprimée.
            </p>
            <Link
              to="/admin/orders"
              className="inline-flex items-center text-[#8B1F38] hover:text-[#7A1B31]"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour à la liste des commandes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <Link
              to="/admin/orders"
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Commande #{order.id.substring(0, 8)}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Imprimer
            </button>
            <button
              onClick={() => setShowTrackingInput(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Truck className="h-5 w-5 mr-2" />
              {order.tracking_number ? 'Modifier le suivi' : 'Ajouter un suivi'}
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
              <CheckCircle className="h-5 w-5 text-green-400" />
              <p className="ml-3 text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Info */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Détails de la commande</h2>
                  <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    <span className="flex items-center">
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{getStatusLabel(order.status)}</span>
                    </span>
                  </span>
                </div>
              </div>
              
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date de commande</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(order.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dernière mise à jour</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(order.updated_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Montant total</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(order.total_amount)}</p>
                  </div>
                  {order.tracking_number && (
                    <div>
                      <p className="text-sm text-gray-500">Numéro de suivi</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">{order.tracking_number}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Order Items */}
              <div className="px-6 py-5">
                <h3 className="text-base font-medium text-gray-900 mb-4">Articles commandés</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
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
                      {order.items && order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <ShoppingBag className="h-5 w-5 text-gray-400 mr-2" />
                              <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                            </div>
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
              
              {/* Order Summary */}
              <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                <div className="sm:w-1/2 ml-auto">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Sous-total HT</span>
                      <span className="text-sm font-medium">{formatCurrency(order.total_amount / 1.2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">TVA (20%)</span>
                      <span className="text-sm font-medium">{formatCurrency(order.total_amount - (order.total_amount / 1.2))}</span>
                    </div>
                    {order.gift_cards && order.gift_cards.length > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span className="text-sm flex items-center">
                          <Gift className="h-4 w-4 mr-1" />
                          Chèques cadeaux
                        </span>
                        <span className="text-sm font-medium">
                          -{formatCurrency(order.gift_cards.reduce((sum, card) => sum + card.amount, 0))}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Total TTC</span>
                        <span className="text-sm font-bold">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Client</h2>
              </div>
              <div className="px-6 py-5">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.customer?.first_name} {order.customer?.last_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">{order.customer?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">{order.customer?.phone || 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Adresse de livraison</h2>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {order.shipping_address?.firstName} {order.shipping_address?.lastName}<br />
                      {order.shipping_address?.address}<br />
                      {order.shipping_address?.phone}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Actions */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Actions</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modifier le statut
                  </label>
                  <select
                    value={order.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
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
                
                <button
                  onClick={() => setShowTrackingInput(true)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                >
                  <Truck className="h-5 w-5 mr-2" />
                  {order.tracking_number ? 'Modifier le numéro de suivi' : 'Ajouter un numéro de suivi'}
                </button>
                
                <button
                  onClick={() => window.print()}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Imprimer la commande
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking Number Input Modal */}
        {showTrackingInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {order.tracking_number ? 'Modifier le numéro de suivi' : 'Ajouter un numéro de suivi'}
                </h3>
                <button
                  onClick={() => {
                    setShowTrackingInput(false);
                    setTrackingNumber(order.tracking_number || '');
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                Commande #{order.id.substring(0, 8)} pour {order.customer?.first_name} {order.customer?.last_name}
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
                    setTrackingNumber(order.tracking_number || '');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddTrackingNumber}
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