import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Users,
  Shield,
  Search,
  Filter,
  ArrowUpDown,
  Edit,
  Trash2,
  Check,
  X,
  Plus,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  User,
  Mail,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminSidebar } from '../../components/admin/AdminSidebar';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_login: string | null;
  roles: {
    role_id: string;
    role_name: string;
    role_level: number;
    permissions: Record<string, boolean>;
    assigned_at: string;
    assigned_by: string;
  }[];
  profile?: {
    first_name: string;
    last_name: string;
  };
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  level: number;
  is_active: boolean;
  permissions: Record<string, boolean>;
}

export function UserRolesPage() {
  const navigate = useNavigate();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    lastLogin: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'email',
    direction: 'asc'
  });
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [currentUserLevel, setCurrentUserLevel] = useState<number>(0);
  const [showRemoveRoleConfirmation, setShowRemoveRoleConfirmation] = useState<{userId: string, roleId: string} | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchAdminUsers();
    fetchRoles();
    fetchCurrentUserLevel();
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

  const fetchCurrentUserLevel = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.rpc('get_user_role_level', {
        p_user_id: session.user.id
      });

      if (error) throw error;
      setCurrentUserLevel(data || 0);
    } catch (error) {
      console.error('Error fetching user level:', error);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('admin_users_with_roles')
        .select('*');

      if (error) throw error;
      
      // Fetch profile information for each user
      const usersWithProfiles = await Promise.all((data || []).map(async (user) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .maybeSingle(); // Changed from single() to maybeSingle()
          
        return {
          ...user,
          profile: profileData || undefined
        };
      }));
      
      setAdminUsers(usersWithProfiles);
    } catch (error: any) {
      console.error('Error fetching admin users:', error);
      setError('Erreur lors du chargement des utilisateurs administrateurs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('is_active', true)
        .order('level', { ascending: false });

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUserId || !selectedRoleId) {
      setError('Veuillez sélectionner un utilisateur et un rôle');
      return;
    }

    // Get the level of the role being assigned
    const selectedRole = roles.find(role => role.id === selectedRoleId);
    if (!selectedRole) {
      setError('Rôle non trouvé');
      return;
    }

    // Check if current user has sufficient permissions
    if (currentUserLevel <= selectedRole.level) {
      setError('Vous n\'avez pas les permissions nécessaires pour attribuer ce rôle');
      return;
    }

    // Check if target user already has a higher or equal role
    const targetUser = adminUsers.find(user => user.id === selectedUserId);
    if (targetUser) {
      const targetUserHighestLevel = targetUser.roles?.reduce((max, role) => 
        Math.max(max, role.role_level || 0), 0) || 0;
      
      if (targetUserHighestLevel >= currentUserLevel) {
        setError('Vous ne pouvez pas modifier les rôles d\'un utilisateur de niveau supérieur ou égal');
        return;
      }
    }
    
    try {
      setIsAssigning(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase.rpc('assign_role_to_user', {
        p_assigner_id: session.user.id,
        p_user_id: selectedUserId,
        p_role_id: selectedRoleId
      });

      if (error) throw error;
      
      setSuccess('Rôle attribué avec succès');
      setShowAssignRoleModal(false);
      setSelectedUserId(null);
      setSelectedRoleId('');
      fetchAdminUsers();
    } catch (error: any) {
      setError(`Erreur lors de l'attribution: ${error.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    // Get the role being removed
    const roleToRemove = roles.find(role => role.id === roleId);
    if (!roleToRemove) {
      setError('Rôle non trouvé');
      return;
    }

    // Check if current user has sufficient permissions
    if (currentUserLevel <= roleToRemove.level) {
      setError('Vous n\'avez pas les permissions nécessaires pour retirer ce rôle');
      return;
    }

    // Check if target user has a higher or equal role
    const targetUser = adminUsers.find(user => user.id === userId);
    if (targetUser) {
      const targetUserHighestLevel = targetUser.roles?.reduce((max, role) => 
        Math.max(max, role.role_level || 0), 0) || 0;
      
      if (targetUserHighestLevel >= currentUserLevel) {
        setError('Vous ne pouvez pas modifier les rôles d\'un utilisateur de niveau supérieur ou égal');
        return;
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase.rpc('remove_role_from_user', {
        p_remover_id: session.user.id,
        p_user_id: userId,
        p_role_id: roleId
      });

      if (error) throw error;
      
      setSuccess('Rôle retiré avec succès');
      setShowRemoveRoleConfirmation(null);
      fetchAdminUsers();
    } catch (error: any) {
      setError(`Erreur lors du retrait: ${error.message}`);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const applyFilters = () => {
    // This would typically filter the data on the server
    // For now, we'll just log the filters
    console.log('Applying filters:', filters);
  };

  const resetFilters = () => {
    setFilters({
      role: '',
      lastLogin: ''
    });
  };

  const canManageUserRoles = (userRoles: any[]) => {
    // Check if the current user has a higher role level than the user's highest role
    const userHighestLevel = userRoles?.reduce((max, role) => 
      Math.max(max, role.role_level || 0), 0) || 0;
    
    return currentUserLevel > userHighestLevel;
  };

  const getRoleNameByLevel = (level: number): string => {
    switch (level) {
      case 100: return 'Super Admin';
      case 80: return 'Admin';
      case 60: return 'Manager';
      case 40: return 'Éditeur';
      case 20: return 'Lecteur';
      default: return `Niveau ${level}`;
    }
  };

  const filteredUsers = adminUsers.filter(user => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const fullName = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.toLowerCase();
      
      if (!user.email.toLowerCase().includes(searchLower) && 
          !fullName.includes(searchLower)) {
        return false;
      }
    }
    
    if (filters.role && !user.roles?.some(role => role.role_id === filters.role)) {
      return false;
    }
    
    if (filters.lastLogin === 'never' && user.last_login) {
      return false;
    }
    
    if (filters.lastLogin === 'recent' && (!user.last_login || new Date(user.last_login) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))) {
      return false;
    }
    
    return true;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = sortConfig.key === 'name' 
      ? `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}` 
      : a[sortConfig.key as keyof AdminUser];
    
    const bValue = sortConfig.key === 'name' 
      ? `${b.profile?.first_name || ''} ${b.profile?.last_name || ''}` 
      : b[sortConfig.key as keyof AdminUser];
    
    if (!aValue && !bValue) return 0;
    if (!aValue) return 1;
    if (!bValue) return -1;
    
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  if (isLoading) {
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
          {/* En-tête */}
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
                  <h1 className="text-2xl font-bold text-gray-900">Utilisateurs & Rôles</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Gérez les utilisateurs administrateurs et leurs rôles
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  to="/admin/roles"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Shield className="h-5 w-5 mr-2" />
                  Gérer les rôles
                </Link>
                <button
                  onClick={() => {
                    setSelectedUserId(null);
                    setShowAssignRoleModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Attribuer un rôle
                </button>
              </div>
            </div>
          </div>

          {/* Recherche et filtres */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1 relative">
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
              <div className="mt-4 p-4 bg-gray-100 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rôle
                    </label>
                    <select
                      value={filters.role}
                      onChange={(e) => setFilters({...filters, role: e.target.value})}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                    >
                      <option value="">Tous les rôles</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dernière connexion
                    </label>
                    <select
                      value={filters.lastLogin}
                      onChange={(e) => setFilters({...filters, lastLogin: e.target.value})}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                    >
                      <option value="">Toutes les périodes</option>
                      <option value="recent">7 derniers jours</option>
                      <option value="never">Jamais connecté</option>
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

          {/* Liste des utilisateurs */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Utilisateur
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
                    Rôles
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
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Aucun utilisateur administrateur trouvé
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.profile?.first_name} {user.profile?.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role, index) => (
                              <div key={index} className="relative group">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                  {role.role_name} ({role.role_level})
                                </span>
                                {canManageUserRoles(user.roles) && (
                                  <button
                                    onClick={() => setShowRemoveRoleConfirmation({userId: user.id, roleId: role.role_id})}
                                    className="hidden group-hover:flex absolute -top-1 -right-1 h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
                                    title="Retirer ce rôle"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">Aucun rôle</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">
                            {user.last_login 
                              ? new Date(user.last_login).toLocaleDateString('fr-FR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Jamais connecté'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowAssignRoleModal(true);
                            }}
                            className={`text-indigo-600 hover:text-indigo-900 ${!canManageUserRoles(user.roles) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Attribuer un rôle"
                            disabled={!canManageUserRoles(user.roles)}
                          >
                            <Shield className="h-5 w-5" />
                          </button>
                          <Link
                            to={`/admin/users/${user.id}/edit`}
                            className="text-blue-600 hover:text-blue-900"
                            title="Modifier l'utilisateur"
                          >
                            <Edit className="h-5 w-5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal d'attribution de rôle */}
        {showAssignRoleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Attribuer un rôle
                </h3>
                <button
                  onClick={() => {
                    setShowAssignRoleModal(false);
                    setSelectedUserId(null);
                    setSelectedRoleId('');
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {selectedUserId ? (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Attribuer un rôle à: <span className="font-medium">
                      {adminUsers.find(u => u.id === selectedUserId)?.email}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Sélectionner un utilisateur
                  </label>
                  <select
                    value={selectedUserId || ''}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    {adminUsers.map((user) => {
                      // Only show users that the current user can manage
                      const userHighestLevel = user.roles?.reduce((max, role) => 
                        Math.max(max, role.role_level || 0), 0) || 0;
                      
                      if (currentUserLevel > userHighestLevel) {
                        return (
                          <option key={user.id} value={user.id}>
                            {user.email} ({user.profile?.first_name} {user.profile?.last_name})
                          </option>
                        );
                      }
                      return null;
                    })}
                  </select>
                </div>
              )}
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700">
                  Sélectionner un rôle
                </label>
                <div className="mt-1 grid grid-cols-1 gap-2">
                  {roles
                    .filter(role => currentUserLevel > role.level)
                    .map((role) => (
                      <div 
                        key={role.id} 
                        className={`p-3 border rounded-md cursor-pointer ${
                          selectedRoleId === role.id 
                            ? 'border-[#8B1F38] bg-[#8B1F38]/5' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => setSelectedRoleId(role.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Shield className={`h-5 w-5 mr-2 ${
                              selectedRoleId === role.id ? 'text-[#8B1F38]' : 'text-gray-500'
                            }`} />
                            <div>
                              <p className="font-medium">{getRoleNameByLevel(role.level)} ({role.level})</p>
                              <p className="text-xs text-gray-500">{role.description || role.name}</p>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <div className={`w-5 h-5 rounded-full border ${
                              selectedRoleId === role.id 
                                ? 'border-[#8B1F38] bg-[#8B1F38]' 
                                : 'border-gray-300'
                            } flex items-center justify-center`}>
                              {selectedRoleId === role.id && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignRoleModal(false);
                    setSelectedUserId(null);
                    setSelectedRoleId('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAssignRole}
                  disabled={!selectedUserId || !selectedRoleId || isAssigning}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAssigning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Attribution...
                    </>
                  ) : (
                    'Attribuer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation de suppression de rôle */}
        {showRemoveRoleConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmer le retrait
                </h3>
              </div>
              <p className="text-gray-500 mb-4">
                Êtes-vous sûr de vouloir retirer ce rôle de cet utilisateur ?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRemoveRoleConfirmation(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (showRemoveRoleConfirmation) {
                      handleRemoveRole(
                        showRemoveRoleConfirmation.userId,
                        showRemoveRoleConfirmation.roleId
                      );
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Retirer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}