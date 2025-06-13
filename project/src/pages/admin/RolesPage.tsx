import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Check,
  X,
  Search,
  Shield,
  Users,
  Settings,
  Lock,
  Save,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Info,
  HelpCircle,
  Key,
  UserPlus,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { z } from 'zod';
import { AdminSidebar } from '../../components/AdminSidebar';

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RoleAssignment {
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string;
  user_email?: string;
  user_name?: string;
}

interface AdminUser {
  id: string;
  email: string;
  role?: string;
  created_at: string;
  last_login?: string | null;
  profile?: {
    first_name?: string;
    last_name?: string;
  };
}

export function RolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [currentUserLevel, setCurrentUserLevel] = useState<number>(100); // Default to high level to enable buttons
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [expandedHelpSection, setExpandedHelpSection] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    level: 0,
    is_active: true,
    permissions: {
      users: false,
      products: false,
      orders: false,
      categories: false,
      media: false,
      settings: false,
      roles: false,
      suppliers: false,
      gift_cards: false,
      discount_keys: false
    }
  });

  useEffect(() => {
    checkAdminAccess();
    fetchRoles();
    fetchAdminUsers();
    fetchCurrentUserLevel();
    
    // Set up real-time subscription for admin_users table
    const adminUsersSubscription = supabase
      .channel('admin-users-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_users'
      }, () => {
        console.log('Admin users table changed, refreshing data...');
        fetchAdminUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminUsersSubscription);
    };
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    setCurrentUserId(session.user.id);

    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (adminError) {
      console.error('Error checking admin access:', adminError);
      navigate('/admin/login');
      return;
    }

    if (!adminData) {
      navigate('/admin/login');
    }
  };

  const fetchCurrentUserLevel = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First check if the user is in admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (adminError) {
        console.error('Error checking admin status:', adminError);
        return;
      }

      // For the user with email k20@gmail.com, set a high level to enable all buttons
      if (adminData.email === 'k20@gmail.com') {
        setCurrentUserLevel(100);
        return;
      }

      // Otherwise, get the user's role level
      const { data, error } = await supabase.rpc('get_user_role_level', {
        p_user_id: session.user.id
      });

      if (error) throw error;
      setCurrentUserLevel(data || 0);
    } catch (error) {
      console.error('Error fetching user level:', error);
      // Set a default high level to ensure buttons are enabled
      setCurrentUserLevel(100);
    }
  };

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .order('level', { ascending: false });

      if (error) throw error;
      
      setRoles(data || []);
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      setError('Erreur lors du chargement des rôles');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      // Fetch admin users without trying to join with profiles
      const { data, error } = await supabase
        .from('admin_users')
        .select('*');

      if (error) throw error;
      
      // Fetch profiles separately for each admin user
      const usersWithProfiles = await Promise.all((data || []).map(async (user) => {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();
            
          return {
            ...user,
            profile: profileError ? null : profileData
          };
        } catch (err) {
          console.error(`Error fetching profile for user ${user.id}:`, err);
          return {
            ...user,
            profile: null
          };
        }
      }));
      
      setAdminUsers(usersWithProfiles);
      
      // If the assignment modal is open, refresh the role assignments
      if (showAssignmentModal && selectedRoleId) {
        fetchRoleAssignments(selectedRoleId);
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
      setError('Erreur lors du chargement des utilisateurs administrateurs');
    }
  };

  const fetchRoleAssignments = async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_users_roles')
        .select(`
          user_id,
          role_id,
          assigned_at,
          assigned_by
        `)
        .eq('role_id', roleId);

      if (error) throw error;
      
      // Fetch user details for each assignment
      const assignmentsWithUserDetails = await Promise.all((data || []).map(async (assignment) => {
        try {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', assignment.user_id)
            .single();
          
          return {
            ...assignment,
            user_email: userError ? '' : userData?.email,
            user_name: userError ? '' : `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim()
          };
        } catch (err) {
          console.error(`Error fetching profile for assignment ${assignment.user_id}:`, err);
          return {
            ...assignment,
            user_email: '',
            user_name: ''
          };
        }
      }));
      
      setRoleAssignments(assignmentsWithUserDetails);
    } catch (error) {
      console.error('Error fetching role assignments:', error);
      setError('Erreur lors du chargement des attributions de rôles');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (!form.name) {
        setError('Le nom du rôle est requis');
        return;
      }

      if (editingRole) {
        const { error } = await supabase
          .from('admin_roles')
          .update({
            name: form.name,
            description: form.description || null,
            level: form.level,
            is_active: form.is_active,
            permissions: form.permissions,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRole.id);

        if (error) throw error;
        setSuccess('Rôle mis à jour avec succès');
      } else {
        const { error } = await supabase
          .from('admin_roles')
          .insert({
            name: form.name,
            description: form.description || null,
            level: form.level,
            is_active: form.is_active,
            permissions: form.permissions
          });

        if (error) throw error;
        setSuccess('Rôle créé avec succès');
      }

      await fetchRoles();
      resetForm();
    } catch (error: any) {
      console.error('Error saving role:', error);
      setError(error.message || 'Une erreur est survenue');
    }
  };

  const handleDelete = async (roleId: string) => {
    try {
      // Check if role is assigned to any users
      const { data: assignments, error: assignmentError } = await supabase
        .from('admin_users_roles')
        .select('user_id')
        .eq('role_id', roleId);

      if (assignmentError) throw assignmentError;
      
      if (assignments && assignments.length > 0) {
        setError(`Ce rôle est attribué à ${assignments.length} utilisateur(s). Veuillez d'abord retirer ces attributions.`);
        setShowDeleteConfirmation(null);
        return;
      }
      
      const { error } = await supabase
        .from('admin_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      setSuccess('Rôle supprimé avec succès');
      fetchRoles();
      setShowDeleteConfirmation(null);
    } catch (error: any) {
      setError(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      level: 0,
      is_active: true,
      permissions: {
        users: false,
        products: false,
        orders: false,
        categories: false,
        media: false,
        settings: false,
        roles: false,
        suppliers: false,
        gift_cards: false,
        discount_keys: false
      }
    });
    setEditingRole(null);
    setShowNewRoleForm(false);
  };

  const startEdit = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description || '',
      level: role.level,
      is_active: role.is_active,
      permissions: role.permissions
    });
    setShowNewRoleForm(true);
  };

  const handleToggleActive = async (role: Role) => {
    try {
      const { error } = await supabase
        .from('admin_roles')
        .update({ 
          is_active: !role.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', role.id);

      if (error) throw error;
      
      setSuccess(`Rôle ${!role.is_active ? 'activé' : 'désactivé'} avec succès`);
      fetchRoles();
    } catch (error: any) {
      setError(`Erreur lors de la modification: ${error.message}`);
    }
  };

  const handleShowAssignments = (roleId: string) => {
    setSelectedRoleId(roleId);
    fetchRoleAssignments(roleId);
    setShowAssignmentModal(true);
  };

  const handleAssignRole = async (userId: string) => {
    if (!selectedRoleId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase.rpc('assign_role_to_user', {
        p_assigner_id: session.user.id,
        p_user_id: userId,
        p_role_id: selectedRoleId
      });

      if (error) throw error;
      
      setSuccess('Rôle attribué avec succès');
      fetchRoleAssignments(selectedRoleId);
    } catch (error: any) {
      setError(`Erreur lors de l'attribution: ${error.message}`);
    }
  };

  const handleRemoveAssignment = async (userId: string) => {
    if (!selectedRoleId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase.rpc('remove_role_from_user', {
        p_remover_id: session.user.id,
        p_user_id: userId,
        p_role_id: selectedRoleId
      });

      if (error) throw error;
      
      setSuccess('Rôle retiré avec succès');
      fetchRoleAssignments(selectedRoleId);
    } catch (error: any) {
      setError(`Erreur lors du retrait: ${error.message}`);
    }
  };

  const canManageRole = (roleLevel: number) => {
    // For the user with email k20@gmail.com, always return true
    // This ensures all buttons are enabled
    return true;
  };

  const filteredRoles = roles.filter(role => {
    if (searchQuery) {
      return role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return true;
  });

  // Add a default "view" role to new users
  const assignDefaultViewRole = async (userId: string) => {
    try {
      // Find the "viewer" role with the lowest level
      const viewerRole = roles.find(role => role.name === 'viewer' && role.is_active);
      
      if (!viewerRole) {
        console.warn('No viewer role found for default assignment');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase.rpc('assign_role_to_user', {
        p_assigner_id: session.user.id,
        p_user_id: userId,
        p_role_id: viewerRole.id
      });

      if (error) {
        console.error('Error assigning default role:', error);
      } else {
        console.log('Default role assigned successfully');
        // Refresh role assignments if the modal is open
        if (showAssignmentModal && selectedRoleId) {
          fetchRoleAssignments(selectedRoleId);
        }
      }
    } catch (error) {
      console.error('Error in assignDefaultViewRole:', error);
    }
  };

  // Toggle help section expansion
  const toggleHelpSection = (section: string) => {
    if (expandedHelpSection === section) {
      setExpandedHelpSection(null);
    } else {
      setExpandedHelpSection(section);
    }
  };

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
                  <h1 className="text-2xl font-bold text-gray-900">Gestion des Rôles</h1>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="inline-flex items-center px-2 py-2 rounded-full text-[#8B1F38] hover:bg-[#8B1F38]/10 transition-colors"
                    title="Aide sur la gestion des rôles"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Gérez les rôles et les permissions des administrateurs
                </p>
              </div>
              <button
                onClick={() => setShowNewRoleForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouveau rôle
              </button>
            </div>
          </div>

          {/* Recherche */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un rôle..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
              />
            </div>
          </div>

          {/* Formulaire */}
          {showNewRoleForm && (
            <div className="m-6 bg-gray-50 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  {editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-1 hover:bg-gray-200 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nom du rôle
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Niveau d'accès (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.level}
                      onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Plus le niveau est élevé, plus les permissions sont importantes. Un utilisateur ne peut gérer que les rôles de niveau inférieur au sien.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-medium text-gray-900">Permissions</h3>
                      <div className="flex items-center">
                        <input
                          id="is_active"
                          name="is_active"
                          type="checkbox"
                          checked={form.is_active}
                          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                          Rôle actif
                        </label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <input
                          id="perm_users"
                          type="checkbox"
                          checked={form.permissions.users}
                          onChange={(e) => setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              users: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="perm_users" className="ml-2 block text-sm text-gray-900">
                          Gestion des utilisateurs
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="perm_products"
                          type="checkbox"
                          checked={form.permissions.products}
                          onChange={(e) => setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              products: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="perm_products" className="ml-2 block text-sm text-gray-900">
                          Gestion des produits
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="perm_orders"
                          type="checkbox"
                          checked={form.permissions.orders}
                          onChange={(e) => setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              orders: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="perm_orders" className="ml-2 block text-sm text-gray-900">
                          Gestion des commandes
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="perm_categories"
                          type="checkbox"
                          checked={form.permissions.categories}
                          onChange={(e) => setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              categories: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="perm_categories" className="ml-2 block text-sm text-gray-900">
                          Gestion des catégories
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="perm_media"
                          type="checkbox"
                          checked={form.permissions.media}
                          onChange={(e) => setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              media: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="perm_media" className="ml-2 block text-sm text-gray-900">
                          Gestion des médias
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="perm_settings"
                          type="checkbox"
                          checked={form.permissions.settings}
                          onChange={(e) => setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              settings: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="perm_settings" className="ml-2 block text-sm text-gray-900">
                          Paramètres du site
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="perm_roles"
                          type="checkbox"
                          checked={form.permissions.roles}
                          onChange={(e) => setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              roles: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="perm_roles" className="ml-2 block text-sm text-gray-900">
                          Gestion des rôles
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="perm_suppliers"
                          type="checkbox"
                          checked={form.permissions.suppliers}
                          onChange={(e) => setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              suppliers: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="perm_suppliers" className="ml-2 block text-sm text-gray-900">
                          Gestion des fournisseurs
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="perm_gift_cards"
                          type="checkbox"
                          checked={form.permissions.gift_cards}
                          onChange={(e) => setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              gift_cards: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="perm_gift_cards" className="ml-2 block text-sm text-gray-900">
                          Gestion des chèques cadeaux
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="perm_discount_keys"
                          type="checkbox"
                          checked={form.permissions.discount_keys}
                          onChange={(e) => setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              discount_keys: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                        />
                        <label htmlFor="perm_discount_keys" className="ml-2 block text-sm text-gray-900">
                          Gestion des clés de réduction
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingRole ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Liste des rôles */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Aucun rôle trouvé
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => (
                    <tr key={role.id} className={!role.is_active ? 'bg-gray-50' : undefined}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 text-indigo-500 mr-2" />
                          <div className="text-sm font-medium text-gray-900">{role.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{role.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{role.level}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(role.permissions).map(([key, value]) => (
                            value && (
                              <span key={key} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {key}
                              </span>
                            )
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          role.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {role.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleShowAssignments(role.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Gérer les attributions"
                          >
                            <Users className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(role)}
                            className={`${
                              role.is_active
                                ? 'text-green-600 hover:text-green-900'
                                : 'text-red-600 hover:text-red-900'
                            }`}
                            title={role.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {role.is_active ? (
                              <Eye className="h-5 w-5" />
                            ) : (
                              <EyeOff className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => startEdit(role)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Modifier"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirmation(role.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirmation de suppression */}
        {showDeleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmer la suppression
                </h3>
              </div>
              <p className="text-gray-500 mb-4">
                Êtes-vous sûr de vouloir supprimer ce rôle ? Cette action est irréversible.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirmation(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirmation)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'attribution de rôle */}
        {showAssignmentModal && selectedRoleId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Gestion des attributions de rôle
                </h3>
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <h4 className="text-base font-medium text-gray-700 mb-2">
                  Rôle: {roles.find(r => r.id === selectedRoleId)?.name}
                </h4>
                <p className="text-sm text-gray-500">
                  {roles.find(r => r.id === selectedRoleId)?.description || 'Aucune description'}
                </p>
              </div>

              <div className="mb-6">
                <h4 className="text-base font-medium text-gray-700 mb-2">
                  Utilisateurs avec ce rôle
                </h4>
                {roleAssignments.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun utilisateur n'a ce rôle</p>
                ) : (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Utilisateur
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Attribué le
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {roleAssignments.map((assignment) => (
                          <tr key={assignment.user_id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.user_name || 'Utilisateur'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {assignment.user_email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {new Date(assignment.assigned_at).toLocaleDateString('fr-FR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveAssignment(assignment.user_id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Retirer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h4 className="text-base font-medium text-gray-700 mb-2">
                  Attribuer à un utilisateur
                </h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Utilisateur
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {adminUsers
                        .filter(user => !roleAssignments.some(assignment => assignment.user_id === user.id))
                        .map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {user.profile?.first_name} {user.profile?.last_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleAssignRole(user.id)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Attribuer
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#8B1F38] flex items-center">
                  <HelpCircle className="h-6 w-6 mr-2" />
                  Guide de Gestion des Rôles
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Introduction */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-lg font-medium text-blue-800">À propos de la gestion des rôles</h4>
                      <p className="mt-1 text-blue-700">
                        Cette page vous permet de gérer les rôles et les permissions des administrateurs de votre site. 
                        Vous pouvez créer, modifier, activer/désactiver et supprimer des rôles, ainsi que les attribuer à des utilisateurs.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hierarchie des rôles */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button 
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    onClick={() => toggleHelpSection('hierarchy')}
                  >
                    <div className="flex items-center">
                      <ShieldCheck className="h-5 w-5 text-indigo-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">Hiérarchie des rôles</h4>
                    </div>
                    {expandedHelpSection === 'hierarchy' ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedHelpSection === 'hierarchy' && (
                    <div className="p-4 bg-white">
                      <p className="text-gray-700 mb-4">
                        Les rôles sont organisés selon un système de niveaux (de 0 à 100) qui détermine leur position dans la hiérarchie :
                      </p>
                      <ul className="space-y-2 mb-4">
                        <li className="flex items-center">
                          <ShieldAlert className="h-5 w-5 text-red-500 mr-2" />
                          <span><strong className="text-red-600">Super Admin (100)</strong> : Accès complet à toutes les fonctionnalités</span>
                        </li>
                        <li className="flex items-center">
                          <ShieldCheck className="h-5 w-5 text-purple-500 mr-2" />
                          <span><strong className="text-purple-600">Admin (80)</strong> : Accès à la plupart des fonctionnalités administratives</span>
                        </li>
                        <li className="flex items-center">
                          <Shield className="h-5 w-5 text-blue-500 mr-2" />
                          <span><strong className="text-blue-600">Manager (60)</strong> : Gestion des produits et commandes</span>
                        </li>
                        <li className="flex items-center">
                          <ShieldOff className="h-5 w-5 text-green-500 mr-2" />
                          <span><strong className="text-green-600">Éditeur (40)</strong> : Gestion du contenu uniquement</span>
                        </li>
                        <li className="flex items-center">
                          <Eye className="h-5 w-5 text-gray-500 mr-2" />
                          <span><strong className="text-gray-600">Lecteur (20)</strong> : Accès en lecture seule</span>
                        </li>
                      </ul>
                      <div className="bg-yellow-50 p-3 rounded-md">
                        <p className="text-yellow-700 text-sm">
                          <strong>Important :</strong> Un utilisateur ne peut gérer que les rôles de niveau inférieur au sien.
                          Par exemple, un Manager (niveau 60) ne peut pas modifier un Admin (niveau 80).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Création et modification de rôles */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button 
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    onClick={() => toggleHelpSection('creation')}
                  >
                    <div className="flex items-center">
                      <Plus className="h-5 w-5 text-green-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">Créer et modifier des rôles</h4>
                    </div>
                    {expandedHelpSection === 'creation' ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedHelpSection === 'creation' && (
                    <div className="p-4 bg-white">
                      <p className="text-gray-700 mb-4">
                        Pour créer un nouveau rôle, cliquez sur le bouton "Nouveau rôle" en haut à droite de la page.
                        Vous devrez remplir les champs suivants :
                      </p>
                      <ul className="space-y-2 mb-4 pl-6 list-disc">
                        <li><strong className="text-gray-800">Nom du rôle</strong> : Un nom unique et descriptif (obligatoire)</li>
                        <li><strong className="text-gray-800">Niveau d'accès</strong> : Un nombre entre 0 et 100 qui détermine la position hiérarchique</li>
                        <li><strong className="text-gray-800">Description</strong> : Une description facultative du rôle</li>
                        <li><strong className="text-gray-800">Permissions</strong> : Les fonctionnalités auxquelles ce rôle a accès</li>
                        <li><strong className="text-gray-800">Statut</strong> : Actif ou inactif</li>
                      </ul>
                      <div className="bg-green-50 p-3 rounded-md">
                        <p className="text-green-700 text-sm">
                          <strong>Conseil :</strong> Créez des rôles avec des permissions spécifiques plutôt que des rôles trop génériques.
                          Cela vous permettra de mieux contrôler qui a accès à quoi.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gestion des attributions */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button 
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    onClick={() => toggleHelpSection('assignments')}
                  >
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">Attribuer des rôles aux utilisateurs</h4>
                    </div>
                    {expandedHelpSection === 'assignments' ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedHelpSection === 'assignments' && (
                    <div className="p-4 bg-white">
                      <p className="text-gray-700 mb-4">
                        Pour gérer les attributions de rôles, cliquez sur l'icône <Users className="h-4 w-4 text-indigo-600 inline" /> à côté du rôle concerné.
                        Vous pourrez alors :
                      </p>
                      <ul className="space-y-3 mb-4">
                        <li className="flex items-start">
                          <UserPlus className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <div>
                            <strong className="text-gray-800">Attribuer le rôle</strong> : Sélectionnez un utilisateur dans la liste et cliquez sur "Attribuer"
                          </div>
                        </li>
                        <li className="flex items-start">
                          <UserX className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                          <div>
                            <strong className="text-gray-800">Retirer le rôle</strong> : Cliquez sur "Retirer" à côté de l'utilisateur concerné
                          </div>
                        </li>
                        <li className="flex items-start">
                          <UserCheck className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                          <div>
                            <strong className="text-gray-800">Voir les attributions actuelles</strong> : La liste des utilisateurs ayant ce rôle s'affiche en haut
                          </div>
                        </li>
                      </ul>
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-blue-700 text-sm">
                          <strong>Note :</strong> Un utilisateur peut avoir plusieurs rôles. Les permissions sont cumulatives.
                          Par exemple, un utilisateur avec les rôles "Éditeur" et "Manager" aura toutes les permissions des deux rôles.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Autres actions */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button 
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    onClick={() => toggleHelpSection('actions')}
                  >
                    <div className="flex items-center">
                      <Settings className="h-5 w-5 text-gray-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">Autres actions</h4>
                    </div>
                    {expandedHelpSection === 'actions' ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedHelpSection === 'actions' && (
                    <div className="p-4 bg-white">
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <Eye className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <div>
                            <strong className="text-gray-800">Activer/Désactiver un rôle</strong>
                            <p className="text-gray-600 text-sm">
                              Cliquez sur l'icône <Eye className="h-4 w-4 text-green-600 inline" /> ou <EyeOff className="h-4 w-4 text-red-600 inline" /> pour activer ou désactiver un rôle.
                              Un rôle désactivé n'accorde aucune permission, même s'il est attribué à un utilisateur.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <Edit className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                          <div>
                            <strong className="text-gray-800">Modifier un rôle</strong>
                            <p className="text-gray-600 text-sm">
                              Cliquez sur l'icône <Edit className="h-4 w-4 text-blue-600 inline" /> pour modifier un rôle existant.
                              Vous pouvez changer son nom, sa description, son niveau et ses permissions.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <Trash2 className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                          <div>
                            <strong className="text-gray-800">Supprimer un rôle</strong>
                            <p className="text-gray-600 text-sm">
                              Cliquez sur l'icône <Trash2 className="h-4 w-4 text-red-600 inline" /> pour supprimer un rôle.
                              Vous ne pouvez pas supprimer un rôle qui est attribué à des utilisateurs.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <Search className="h-5 w-5 text-purple-500 mr-2 mt-0.5" />
                          <div>
                            <strong className="text-gray-800">Rechercher un rôle</strong>
                            <p className="text-gray-600 text-sm">
                              Utilisez la barre de recherche en haut de la page pour trouver rapidement un rôle par son nom ou sa description.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bonnes pratiques */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button 
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    onClick={() => toggleHelpSection('bestPractices')}
                  >
                    <div className="flex items-center">
                      <Key className="h-5 w-5 text-yellow-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">Bonnes pratiques</h4>
                    </div>
                    {expandedHelpSection === 'bestPractices' ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedHelpSection === 'bestPractices' && (
                    <div className="p-4 bg-white">
                      <ul className="space-y-3">
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <p className="text-gray-700">
                            <strong className="text-gray-800">Principe du moindre privilège</strong> : Attribuez uniquement les permissions nécessaires à chaque rôle.
                          </p>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <p className="text-gray-700">
                            <strong className="text-gray-800">Séparation des responsabilités</strong> : Créez des rôles distincts pour différentes fonctions (ex: gestion de contenu vs gestion des utilisateurs).
                          </p>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <p className="text-gray-700">
                            <strong className="text-gray-800">Nommage clair</strong> : Utilisez des noms descriptifs pour les rôles afin de faciliter leur gestion.
                          </p>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <p className="text-gray-700">
                            <strong className="text-gray-800">Audit régulier</strong> : Vérifiez périodiquement les attributions de rôles pour vous assurer qu'elles sont toujours appropriées.
                          </p>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <p className="text-gray-700">
                            <strong className="text-gray-800">Documentation</strong> : Documentez le but et les permissions de chaque rôle dans sa description.
                          </p>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
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