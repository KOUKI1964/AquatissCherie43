import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, 
  Users,
  ShoppingBag, 
  Settings, 
  ChevronDown, 
  Key, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Home, 
  Package, 
  FolderTree,
  Image,
  FileImage,
  Search,
  AlertCircle,
  Info,
  Gift,
  Truck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminSidebar } from '../../components/AdminSidebar';

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalMedia: number;
  totalActiveKeys: number;
  totalUsedKeys: number;
  totalGiftCards: number;
  activeGiftCards: number;
  giftCardRevenue: number;
  receivedGiftCards: number;
  activeReceivedGiftCards: number;
  totalSuppliers: number;
  activeSuppliers: number;
}

interface KeyType {
  type: 'silver' | 'bronze' | 'gold';
  percentage: number;
  name: string;
  color: string;
}

const KEY_TYPES: KeyType[] = [
  { type: 'silver', percentage: 5, name: 'Argent', color: '#C0C0C0' },
  { type: 'bronze', percentage: 10, name: 'Bronze', color: '#CD7F32' },
  { type: 'gold', percentage: 20, name: 'Or', color: '#FFD700' }
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalMedia: 0,
    totalActiveKeys: 0,
    totalUsedKeys: 0,
    totalGiftCards: 0,
    activeGiftCards: 0,
    giftCardRevenue: 0,
    receivedGiftCards: 0,
    activeReceivedGiftCards: 0,
    totalSuppliers: 0,
    activeSuppliers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedKeyType, setSelectedKeyType] = useState<KeyType | null>(null);
  const [activeKeys, setActiveKeys] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [validationCode, setValidationCode] = useState('');
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    details?: {
      user?: { first_name: string; last_name: string };
      partner?: { first_name: string; last_name: string };
      createdAt?: string;
    };
  } | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
    fetchActiveKeys();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (adminError) {
        console.error('Error checking admin access:', adminError);
        navigate('/admin/login');
        return;
      }

      if (!adminData) {
        navigate('/admin/login');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/admin/login');
    }
  };

  const fetchStats = async () => {
    try {
      // Get current user email
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return;
      }

      const userEmail = userProfile?.email;

      const [
        usersCount, 
        ordersData, 
        mediaCount, 
        keysData,
        giftCardsData,
        receivedGiftCardsData,
        suppliersData
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('orders').select('total_amount'),
        supabase.from('media_files').select('id', { count: 'exact' }),
        supabase.from('discount_keys').select('*'),
        supabase.from('gift_cards').select('*'),
        userEmail ? supabase.from('gift_cards').select('*').eq('recipient_email', userEmail) : { data: [] },
        supabase.from('suppliers').select('*')
      ]);

      const totalRevenue = ordersData.data?.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      ) || 0;

      const activeKeys = keysData.data?.filter(key => key.is_active).length || 0;
      const usedKeys = keysData.data?.filter(key => !key.is_active).length || 0;

      const activeGiftCards = giftCardsData.data?.filter(
        card => !card.is_used && new Date(card.expires_at) > new Date()
      ).length || 0;

      const giftCardRevenue = giftCardsData.data?.reduce(
        (sum, card) => sum + Number(card.amount),
        0
      ) || 0;

      // Calculate received gift cards stats
      const receivedGiftCards = receivedGiftCardsData.data?.length || 0;
      const activeReceivedGiftCards = receivedGiftCardsData.data?.filter(
        card => !card.is_used && new Date(card.expires_at) > new Date()
      ).length || 0;

      // Calculate supplier stats
      const totalSuppliers = suppliersData.data?.length || 0;
      const activeSuppliers = suppliersData.data?.filter(
        supplier => supplier.is_active
      ).length || 0;

      setStats({
        totalUsers: usersCount.count || 0,
        totalOrders: ordersData.data?.length || 0,
        totalRevenue,
        totalMedia: mediaCount.count || 0,
        totalActiveKeys: activeKeys,
        totalUsedKeys: usedKeys,
        totalGiftCards: giftCardsData.data?.length || 0,
        activeGiftCards,
        giftCardRevenue,
        receivedGiftCards,
        activeReceivedGiftCards,
        totalSuppliers,
        activeSuppliers
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveKeys = async () => {
    const { data, error } = await supabase
      .from('discount_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActiveKeys(data);
    } else {
      setError('Erreur lors du chargement des clés');
    }
  };

  const generateKey = async () => {
    if (!selectedKeyType) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('discount_keys')
        .insert({
          type: selectedKeyType.type,
          percentage: selectedKeyType.percentage,
          is_active: true,
          created_by: (await supabase.auth.getSession()).data.session?.user.id
        });

      if (error) throw error;

      await fetchActiveKeys();
      await fetchStats();
      setShowKeyModal(false);
      setSelectedKeyType(null);
    } catch (error) {
      console.error('Error generating key:', error);
      setError('Erreur lors de la génération de la clé');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('discount_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      await fetchActiveKeys();
      await fetchStats();
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting key:', error);
      setError('Erreur lors de la suppression de la clé');
    }
  };

  const validateDiscountCode = async () => {
    if (!validationCode || validationCode.length !== 8) {
      setValidationResult({
        isValid: false,
        message: 'Le code doit contenir 8 chiffres'
      });
      return;
    }

    try {
      const { data: usageData, error: usageError } = await supabase
        .from('discount_keys_usage')
        .select(`
          code,
          created_at,
          user:user_id (
            first_name,
            last_name
          ),
          partner:partner_id (
            first_name,
            last_name
          )
        `)
        .eq('code', validationCode)
        .maybeSingle();

      if (usageError) throw usageError;

      if (usageData) {
        setValidationResult({
          isValid: true,
          message: 'Code valide et utilisé',
          details: {
            user: usageData.user as { first_name: string; last_name: string },
            partner: usageData.partner as { first_name: string; last_name: string },
            createdAt: new Date(usageData.created_at).toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          }
        });
      } else {
        setValidationResult({
          isValid: false,
          message: 'Code non utilisé ou invalide'
        });
      }
    } catch (error) {
      console.error('Error validating code:', error);
      setValidationResult({
        isValid: false,
        message: 'Erreur lors de la validation du code'
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <AdminSidebar />
      {/* Header */}
      <header className="bg-white shadow pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Tableau de bord
            </h1>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Home className="h-5 w-5 mr-2" />
                Retour au site
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8 pl-64">
        {error && (
          <div className="mb-6 bg-red-900/50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Navigation des modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            to="/admin/products"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-lg font-medium text-white">Produits</p>
                <p className="text-sm text-gray-400">Gérer le catalogue</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/categories"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center">
              <FolderTree className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-lg font-medium text-white">Catégories</p>
                <p className="text-sm text-gray-400">Organiser les produits</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/media"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center">
              <FileImage className="h-8 w-8 text-purple-400" />
              <div className="ml-4">
                <p className="text-lg font-medium text-white">Médiathèque</p>
                <p className="text-sm text-gray-400">{stats.totalMedia} fichiers</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/users"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center">
              <Users className="h-8 w-8 text-indigo-400" />
              <div className="ml-4">
                <p className="text-lg font-medium text-white">Utilisateurs</p>
                <p className="text-sm text-gray-400">{stats.totalUsers} comptes</p>
              </div>
            </div>
          </Link>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Commandes
                </p>
                <p className="text-2xl font-semibold text-white">
                  {stats.totalOrders}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Chiffre d'affaires
                </p>
                <p className="text-2xl font-semibold text-white">
                  {stats.totalRevenue.toFixed(2)} €
                </p>
              </div>
            </div>
          </div>

          {/* Gift Cards Stats - Purchased */}
          <Link
            to="/admin/gift-cards"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-pink-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Chèques cadeaux achetés
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-semibold text-white">
                    {stats.activeGiftCards}
                  </p>
                  <span className="text-sm text-gray-400">actifs</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {stats.giftCardRevenue.toFixed(2)} € générés
                </p>
              </div>
            </div>
          </Link>

          {/* Gift Cards Stats - Received */}
          <Link
            to="/admin/gift-cards/received"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Chèques cadeaux reçus
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-semibold text-white">
                    {stats.activeReceivedGiftCards}
                  </p>
                  <span className="text-sm text-gray-400">actifs</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {stats.receivedGiftCards} reçus au total
                </p>
              </div>
            </div>
          </Link>

          {/* Suppliers Stats */}
          <Link
            to="/admin/suppliers"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-orange-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Fournisseurs
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-semibold text-white">
                    {stats.activeSuppliers}
                  </p>
                  <span className="text-sm text-gray-400">actifs</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {stats.totalSuppliers} au total
                </p>
              </div>
            </div>
          </Link>

          {/* Discount Keys Stats */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-indigo-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Clés actives
                </p>
                <p className="text-2xl font-semibold text-white">
                  {stats.totalActiveKeys}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gestion des clés */}
        <div className="bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-medium text-white">
                  Gestion des clés de réduction
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Gérez les clés de réduction et suivez leur utilisation
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowValidationPanel(!showValidationPanel)}
                  className="inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white hover:bg-gray-700"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Valider un code
                </button>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Générer une clé
                </button>
              </div>
            </div>

            {/* Types de clés disponibles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {KEY_TYPES.map((type) => (
                <div
                  key={type.type}
                  className="bg-gray-700 rounded-lg p-4"
                  style={{ borderLeft: `4px solid ${type.color}` }}
                >
                  <div className="flex items-center">
                    <Key className="h-6 w-6" style={{ color: type.color }} />
                    <div className="ml-3">
                      <p className="text-white font-medium">{type.name}</p>
                      <p className="text-gray-400 text-sm">
                        Réduction de {type.percentage}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showValidationPanel && (
              <div className="mb-6 p-6 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-4">
                  Validation d'un code
                </h3>
                <div className="flex space-x-4">
                  <input
                    type="text"
                    maxLength={8}
                    pattern="\d{8}"
                    value={validationCode}
                    onChange={(e)=> setValidationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Entrez le code à 8 chiffres"
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={validateDiscountCode}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Valider
                  </button>
                </div>

                {validationResult && (
                  <div className={`mt-4 p-4 rounded-md ${
                    validationResult.isValid ? 'bg-green-900/50' : 'bg-red-900/50'
                  }`}>
                    <p className={`text-sm ${
                      validationResult.isValid ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {validationResult.message}
                    </p>
                    {validationResult.details && (
                      <div className="mt-2 text-sm text-gray-300">
                        <p>Utilisateur : {validationResult.details.user?.first_name} {validationResult.details.user?.last_name}</p>
                        <p>Partenaire : {validationResult.details.partner?.first_name} {validationResult.details.partner?.last_name}</p>
                        <p>Date d'utilisation : {validationResult.details.createdAt}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Réduction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Créé par
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date de création
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date d'utilisation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {activeKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Key
                            className="h-5 w-5 mr-2"
                            style={{ color: KEY_TYPES.find(t => t.type === key.type)?.color }}
                          />
                          <span className="text-white">
                            {KEY_TYPES.find(t => t.type === key.type)?.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white">{key.percentage}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-white">{key.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white">{key.created_by_name || 'Admin'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white">
                          {new Date(key.created_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white">
                          {key.used_at ? new Date(key.used_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          key.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {key.is_active ? 'Active' : 'Utilisée'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {deleteConfirmation === key.id ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => deleteKey(key.id)}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmation(null)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmation(key.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-5 w-5" />
                
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de génération de clé */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-white mb-4">
              Générer une nouvelle clé
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {KEY_TYPES.map((type) => (
                <button
                  key={type.type}
                  onClick={() => setSelectedKeyType(type)}
                  className={`p-4 rounded-lg border-2 ${
                    selectedKeyType?.type === type.type
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-gray-700'
                  } hover:border-indigo-500 transition-colors`}
                >
                  <Key
                    className="h-8 w-8 mx-auto mb-2"
                    style={{ color: type.color }}
                  />
                  <p className="text-white text-center text-sm">
                    {type.name}
                  </p>
                  <p className="text-gray-400 text-center text-xs">
                    -{type.percentage}%
                  </p>
                </button>
              ))}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={generateKey}
                disabled={!selectedKeyType || isGenerating}
                className={`px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isGenerating ? 'Génération...' : 'Générer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}