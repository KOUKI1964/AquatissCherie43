import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Check,
  X,
  Search,
  Filter,
  ArrowUpDown,
  Home,
  RefreshCw,
  Info,
  UserPlus,
  Download,
  FileDown,
  AlertTriangle,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminSidebar } from '../../components/admin/AdminSidebar';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  last_login: string | null;
  login_attempts: number;
  blocked_until: string | null;
  purchases_count: number;
  user_identifier: string;
  is_active: boolean;
  deleted_at: string | null;
}

interface DeleteConfirmation {
  userId: string;
  hasActiveOrders: boolean;
  isAdmin: boolean;
}

export function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
    
    // Set up real-time subscription for profiles table
    const profilesSubscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        console.log('Profiles table changed, refreshing data...');
        fetchUsers();
      })
      .subscribe();
      
    // Set up real-time subscription for admin_users table
    const adminUsersSubscription = supabase
      .channel('admin-users-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_users'
      }, () => {
        console.log('Admin users table changed, refreshing data...');
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesSubscription);
      supabase.removeChannel(adminUsersSubscription);
    };
  }, [showInactiveUsers, currentPage, searchQuery, sortConfig]);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    try {
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (adminError) throw adminError;
      if (!adminData) {
        navigate('/admin/login');
      }
    } catch (error: any) {
      console.error('Error checking admin access:', error);
      navigate('/admin/login');
    }
  };

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      if (!showInactiveUsers) {
        query = query.eq('is_active', true);
      }

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);

      // Fetch roles for each user
      const userIds = data?.map(user => user.id) || [];
      if (userIds.length > 0) {
        const { data: rolesData } = await supabase
          .from('admin_users_with_roles')
          .select('id, roles')
          .in('id', userIds);
        
        if (rolesData) {
          const rolesMap: Record<string, string> = {};
          rolesData.forEach(userData => {
            if (userData.roles && userData.roles.length > 0) {
              // Get the highest level role
              const highestRole = userData.roles.reduce((prev: any, current: any) => 
                (prev.role_level > current.role_level) ? prev : current
              );
              rolesMap[userData.id] = highestRole.role_name;
            }
          });
          setUserRoles(rolesMap);
        }
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError('Erreur lors du chargement des utilisateurs');
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

  const checkUserStatus = async (userId: string) => {
    try {
      // Check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (adminError) throw adminError;

      // Check active orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId)
        .not('status', 'in', '("completed","cancelled")')
        .limit(1);

      if (ordersError) throw ordersError;

      return {
        isAdmin: !!adminData,
        hasActiveOrders: ordersData && ordersData.length > 0
      };
    } catch (error) {
      console.error('Error checking user status:', error);
      return { isAdmin: false, hasActiveOrders: false };
    }
  };

  const handleDeleteConfirmation = async (userId: string) => {
    const status = await checkUserStatus(userId);
    setDeleteConfirmation({
      userId,
      hasActiveOrders: status.hasActiveOrders,
      isAdmin: status.isAdmin
    });
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setSuccess('Utilisateur désactivé avec succès');
      setDeleteConfirmation(null);
      fetchUsers();

    } catch (error: any) {
      console.error('Error deactivating user:', error);
      setError(error.message || 'Erreur lors de la désactivation de l\'utilisateur');
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_active: true,
          deleted_at: null
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setSuccess('Utilisateur réactivé avec succès');
      fetchUsers();

    } catch (error: any) {
      console.error('Error reactivating user:', error);
      setError(error.message || 'Erreur lors de la réactivation de l\'utilisateur');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setError(null);
      setSuccess(null);

      // First, remove from admin_users if exists
      const { error: adminDeleteError } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', userId);

      if (adminDeleteError) {
        console.error('Error deleting from admin_users:', adminDeleteError);
      }

      // Remove from admin_users_roles
      const { error: rolesDeleteError } = await supabase
        .from('admin_users_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesDeleteError) {
        console.error('Error deleting from admin_users_roles:', rolesDeleteError);
      }

      // Delete from profiles
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileDeleteError) throw profileDeleteError;

      // Delete auth user using RPC function
      const { error: rpcError } = await supabase.rpc('delete_user', {
        user_id: userId
      });

      if (rpcError) throw rpcError;

      setSuccess('Utilisateur supprimé avec succès');
      fetchUsers();
      setDeleteConfirmation(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Email', 'Prénom', 'Nom', 'Téléphone', 'Date d\'inscription', 'Statut'];
    const csvData = users.map(user => [
      user.user_identifier,
      user.email,
      user.first_name,
      user.last_name || '',
      user.phone || '',
      new Date(user.created_at).toLocaleDateString('fr-FR'),
      user.is_active ? 'Actif' : 'Désactivé'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString()}.csv`;
    link.click();
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
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
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(users.length / itemsPerPage);

  // Function to add a user to admin_users table
  const addUserToAdmins = async (userId: string) => {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
        
      if (profileError) throw profileError;
      
      // Check if user is already an admin
      const { data: existingAdmin, error: checkError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      // If not an admin, add them
      if (!existingAdmin) {
        const { error: insertError } = await supabase
          .from('admin_users')
          .insert({
            id: userId,
            email: profile.email,
            role: 'admin'
          });
          
        if (insertError) throw insertError;
        
        setSuccess('Utilisateur ajouté aux administrateurs avec succès');
        
        // Assign default "viewer" role
        const { data: viewerRole } = await supabase
          .from('admin_roles')
          .select('id')
          .eq('name', 'viewer')
          .eq('is_active', true)
          .maybeSingle();
          
        if (viewerRole) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.rpc('assign_role_to_user', {
              p_assigner_id: session.user.id,
              p_user_id: userId,
              p_role_id: viewerRole.id
            });
          }
        }
      } else {
        setError('Cet utilisateur est déjà administrateur');
      }
    } catch (error: any) {
      console.error('Error adding user to admins:', error);
      setError(error.message || 'Erreur lors de l\'ajout de l\'utilisateur aux administrateurs');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <AdminSidebar />
      <div className="pl-64">
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
                  <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Gérez les utilisateurs de la plateforme
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
                <button
                  onClick={() => setShowInactiveUsers(!showInactiveUsers)}
                  className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                    showInactiveUsers
                      ? 'border-[#8B1F38] text-[#8B1F38] bg-white'
                      : 'border-gray-300 text-gray-700 bg-white'
                  } hover:bg-gray-50`}
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  {showInactiveUsers ? 'Masquer les comptes désactivés' : 'Afficher les comptes désactivés'}
                </button>
                <button
                  onClick={() => navigate('/admin/users/new')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Ajouter un utilisateur
                </button>
              </div>
            </div>
          </div>

          {/* Search and filters */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="relative flex-grow max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  to="/admin/roles"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Shield className="h-5 w-5 mr-2" />
                  Gérer les rôles
                </Link>
              </div>
            </div>
          </div>

          {/* Users list */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('first_name')}
                  >
                    <div className="flex items-center">
                      Nom
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center">
                      Email
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Téléphone
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center">
                      Inscription
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('last_login')}
                  >
                    <div className="flex items-center">
                      Dernière connexion
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Rôle
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Statut
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
                {currentUsers.map((user) => (
                  <tr key={user.id} className={!user.is_active ? 'bg-gray-50' : undefined}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user.user_identifier}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.last_login)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {userRoles[user.id] ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Shield className="h-3.5 w-3.5 mr-1" />
                          {userRoles[user.id]}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => addUserToAdmins(user.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Ajouter aux administrateurs"
                        >
                          <Shield className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                          className="text-[#8B1F38] hover:text-[#7A1B31]"
                          title="Modifier l'utilisateur"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => user.is_active ? handleDeactivateUser(user.id) : handleReactivateUser(user.id)}
                          className={`${user.is_active ? 'text-red-400 hover:text-red-500' : 'text-green-400 hover:text-green-500'}`}
                          title={user.is_active ? "Désactiver l'utilisateur" : "Réactiver l'utilisateur"}
                        >
                          {user.is_active ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteConfirmation(user.id)}
                          className="text-red-400 hover:text-red-500"
                          title="Supprimer définitivement l'utilisateur"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-white border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Suivant
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Affichage de{' '}
                      <span className="font-medium">{indexOfFirstItem + 1}</span>
                      {' '}à{' '}
                      <span className="font-medium">
                        {Math.min(indexOfLastItem, users.length)}
                      </span>
                      {' '}sur{' '}
                      <span className="font-medium">{users.length}</span>
                      {' '}résultats
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-[#8B1F38] border-[#8B1F38] text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirmation de suppression
              </h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Cette action est irréversible. Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?
            </p>
            
            {deleteConfirmation.isAdmin && (
              <div className="mb-4 p-4 bg-red-50 rounded-md">
                <p className="text-sm text-red-700">
                  <strong>Attention :</strong> Cet utilisateur est administrateur. La suppression entraînera la perte de tous ses droits d'accès.
                </p>
              </div>
            )}
            
            {deleteConfirmation.hasActiveOrders && (
              <div className="mb-4 p-4 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-700">
                  <strong>Attention :</strong> Cet utilisateur a des commandes actives. La suppression peut affecter le traitement de ces commandes.
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirmation.userId)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}