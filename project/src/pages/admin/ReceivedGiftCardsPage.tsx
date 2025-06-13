import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Gift,
  Search,
  ArrowUpDown,
  Calendar,
  Clock,
  Check,
  X,
  AlertCircle,
  Copy,
  Eye,
  ShoppingBag,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GiftCard {
  id: string;
  code: string;
  amount: number;
  recipient_email: string;
  sender_id: string | null;
  message: string | null;
  is_used: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
  order_id: string | null;
  metadata: Record<string, any>;
}

interface SenderInfo {
  first_name: string;
  last_name: string;
  email: string;
}

export function ReceivedGiftCardsPage() {
  const navigate = useNavigate();
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<GiftCard | null>(null);
  const [senderInfo, setSenderInfo] = useState<Record<string, SenderInfo>>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(0);
  const [activeValue, setActiveValue] = useState(0);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchUserEmail();
  }, []);

  useEffect(() => {
    if (userEmail) {
      fetchReceivedGiftCards();
    }
  }, [userEmail, currentPage, searchQuery, sortConfig]);

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

  const fetchUserEmail = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }

      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      
      setUserEmail(userProfile.email);
    } catch (error) {
      console.error('Error fetching user email:', error);
      setError('Erreur lors de la récupération de l\'email de l\'utilisateur');
    }
  };

  const fetchReceivedGiftCards = async () => {
    if (!userEmail) return;
    
    try {
      setIsLoading(true);
      let query = supabase
        .from('gift_cards')
        .select('*')
        .eq('recipient_email', userEmail)
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      if (searchQuery) {
        query = query.or(`code.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch sender information for all cards
      const senderIds = data?.filter(card => card.sender_id).map(card => card.sender_id) || [];
      if (senderIds.length > 0) {
        const { data: senders } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', senderIds);
          
        if (senders) {
          const senderMap: Record<string, SenderInfo> = {};
          senders.forEach(sender => {
            senderMap[sender.id] = {
              first_name: sender.first_name,
              last_name: sender.last_name || '',
              email: sender.email
            };
          });
          setSenderInfo(senderMap);
        }
      }
      
      // Calculate total and active value
      const total = data?.reduce((sum, card) => sum + Number(card.amount), 0) || 0;
      const active = data?.filter(
        card => !card.is_used && new Date(card.expires_at) > new Date()
      ).reduce((sum, card) => sum + Number(card.amount), 0) || 0;
      
      setTotalValue(total);
      setActiveValue(active);
      setGiftCards(data || []);
    } catch (error: any) {
      console.error('Error fetching gift cards:', error);
      setError('Erreur lors du chargement des chèques cadeaux');
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleViewDetails = async (cardId: string) => {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select(`
          *,
          gift_card_transactions (
            id,
            amount_used,
            created_at,
            order_id
          )
        `)
        .eq('id', cardId)
        .single();

      if (error) throw error;
      
      setDetailCard(data);
      setShowDetailModal(cardId);
    } catch (error: any) {
      console.error('Error fetching gift card details:', error);
      setError('Erreur lors du chargement des détails du chèque cadeau');
    }
  };

  const handleDelete = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('gift_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      setSuccess('Chèque cadeau supprimé avec succès');
      setDeleteConfirmation(null);
      fetchReceivedGiftCards();
    } catch (error: any) {
      setError('Erreur lors de la suppression: ' + error.message);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGiftCards = giftCards.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(giftCards.length / itemsPerPage);

  if (isLoading && giftCards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
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
                <h1 className="text-2xl font-bold text-gray-900">Chèques Cadeaux Reçus</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Gérez les chèques cadeaux que vous avez reçus
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Valeur disponible</p>
                <p className="text-xl font-bold text-[#8B1F38]">{activeValue.toFixed(2)} €</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher par code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-200">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total reçu</p>
                <p className="text-2xl font-semibold text-gray-900">{giftCards.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <Check className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Actifs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {giftCards.filter(card => !card.is_used && new Date(card.expires_at) > new Date()).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Valeur totale</p>
                <p className="text-2xl font-semibold text-gray-900">{totalValue.toFixed(2)} €</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gift Cards List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center">
                    Code
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center">
                    Montant
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Expéditeur
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('expires_at')}
                >
                  <div className="flex items-center">
                    Expiration
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Statut
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Reçu le
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
              {currentGiftCards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Aucun chèque cadeau reçu
                  </td>
                </tr>
              ) : (
                currentGiftCards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Gift className="h-5 w-5 text-gray-400 mr-2" />
                        <div className="flex items-center">
                          <span className="font-mono text-sm">{card.code}</span>
                          <button 
                            onClick={() => handleCopyCode(card.code)}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                            title="Copier le code"
                          >
                            {copiedCode === card.code ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {card.amount.toFixed(2)} €
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {card.sender_id && senderInfo[card.sender_id] ? (
                        <span className="text-sm text-gray-900">
                          {senderInfo[card.sender_id].first_name} {senderInfo[card.sender_id].last_name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Anonyme</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {formatDate(card.expires_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        card.is_used
                          ? 'bg-gray-100 text-gray-800'
                          : new Date(card.expires_at) < new Date()
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {card.is_used
                          ? 'Utilisé'
                          : new Date(card.expires_at) < new Date()
                          ? 'Expiré'
                          : 'Actif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {formatDate(card.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(card.id)}
                          className="text-[#8B1F38] hover:text-[#7A1B31]"
                          title="Voir les détails"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {deleteConfirmation === card.id ? (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleDelete(card.id)}
                              className="text-green-600 hover:text-green-700"
                              title="Confirmer la suppression"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmation(null)}
                              className="text-red-600 hover:text-red-700"
                              title="Annuler"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmation(card.id)}
                            className="text-red-400 hover:text-red-500"
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
        {giftCards.length > itemsPerPage && (
          <div className="px-6 py-4 bg-white border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, giftCards.length)}
                  </span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, giftCards.length)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{giftCards.length}</span>
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

      {/* Gift Card Detail Modal */}
      {showDetailModal && detailCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-900">
                Détails du chèque cadeau
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(null);
                  setDetailCard(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-gradient-to-r from-[#8B1F38] to-[#7A1B31] rounded-lg p-6 text-white mb-6">
              <div className="flex justify-between items-center mb-4">
                <Gift className="h-6 w-6" />
                <span className="text-lg font-medium">Chèque Cadeau</span>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Code</span>
                  <div className="flex items-center">
                    <span className="font-mono text-lg">{detailCard.code}</span>
                    <button 
                      onClick={() => handleCopyCode(detailCard.code)}
                      className="ml-2 text-white opacity-80 hover:opacity-100"
                    >
                      {copiedCode === detailCard.code ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Montant</span>
                  <span className="text-2xl font-bold">{detailCard.amount.toFixed(2)} €</span>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Statut</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    detailCard.is_used
                      ? 'bg-white/20'
                      : new Date(detailCard.expires_at) < new Date()
                      ? 'bg-red-500/20'
                      : 'bg-green-500/20'
                  }`}>
                    {detailCard.is_used
                      ? 'Utilisé'
                      : new Date(detailCard.expires_at) < new Date()
                      ? 'Expiré'
                      : 'Actif'}
                  </span>
                </div>
              </div>
              {detailCard.message && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="italic text-sm">{detailCard.message}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Informations</h4>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Expéditeur</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {detailCard.sender_id && senderInfo[detailCard.sender_id] ? (
                        `${senderInfo[detailCard.sender_id].first_name} ${senderInfo[detailCard.sender_id].last_name}`
                      ) : (
                        'Anonyme'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Expiration</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(detailCard.expires_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Reçu le</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateTime(detailCard.created_at)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Utilisation</h4>
                {detailCard.is_used ? (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-700">
                      Ce chèque cadeau a été utilisé le {formatDateTime(detailCard.updated_at)}.
                    </p>
                    {detailCard.order_id && (
                      <p className="text-sm text-gray-700 mt-2">
                        Commande associée: <span className="font-mono">{detailCard.order_id}</span>
                      </p>
                    )}
                  </div>
                ) : new Date(detailCard.expires_at) < new Date() ? (
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-sm text-red-700">
                      Ce chèque cadeau a expiré le {formatDate(detailCard.expires_at)}.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 p-4 rounded-md">
                    <p className="text-sm text-green-700">
                      Ce chèque cadeau est valide jusqu'au {formatDate(detailCard.expires_at)}.
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      Vous pouvez l'utiliser lors de votre prochaine commande.
                    </p>
                    <div className="mt-4">
                      <Link
                        to="/"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#8B1F38] hover:bg-[#7A1B31]"
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Faire des achats
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => {
                  setDeleteConfirmation(detailCard.id);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                <div className="flex items-center">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer ce chèque
                </div>
              </button>
              
              <button
                onClick={() => {
                  setShowDetailModal(null);
                  setDetailCard(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
            
            {deleteConfirmation === detailCard.id && (
              <div className="mt-4 p-4 bg-red-50 rounded-md">
                <p className="text-sm text-red-700 mb-3">
                  Êtes-vous sûr de vouloir supprimer ce chèque cadeau ?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleDelete(detailCard.id)}
                    className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setDeleteConfirmation(null)}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}