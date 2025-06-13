import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  User,
  Mail,
  Key,
  Copy,
  Check,
  Phone,
  MapPin,
  ShoppingCart,
  Calendar,
  Clock,
  Ban,
  X,
  Info,
  Gift,
  Globe,
  Shield,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { z } from 'zod';
import { COUNTRIES } from '../../types/address';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().optional(),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  shareDiscountKey: z.boolean().optional(),
});

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  user_identifier: string;
  phone: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  purchases_count: number;
  share_discount_key: boolean;
  created_at: string;
  last_login: string | null;
  login_attempts: number;
  blocked_until: string | null;
  is_active: boolean;
  deleted_at: string | null;
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  shareDiscountKey: boolean;
}

interface GiftCardStats {
  receivedCount: number;
  purchasedCount: number;
  totalAmountReceived: number;
  totalAmountPurchased: number;
}

interface UserRole {
  role_id: string;
  role_name: string;
  role_level: number;
  permissions: Record<string, boolean>;
  assigned_at: string;
  assigned_by: string;
}

export function EditUserPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    postalCode: '',
    city: '',
    country: 'FR',
    shareDiscountKey: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [blockConfirmation, setBlockConfirmation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [giftCardStats, setGiftCardStats] = useState<GiftCardStats>({
    receivedCount: 0,
    purchasedCount: 0,
    totalAmountReceived: 0,
    totalAmountPurchased: 0
  });
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchProfile();
    fetchGiftCardStats();
    fetchUserRoles();
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

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setProfile(data);
      setForm({
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email,
        phone: data.phone || '',
        street: data.street || '',
        postalCode: data.postal_code || '',
        city: data.city || '',
        country: data.country || 'FR',
        shareDiscountKey: data.share_discount_key || false
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError('Erreur lors du chargement du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGiftCardStats = async () => {
    try {
      // Fetch received gift cards
      const { data: receivedCards, error: receivedError } = await supabase
        .from('gift_cards')
        .select('amount')
        .eq('recipient_email', profile?.email);

      if (receivedError) throw receivedError;

      // Fetch purchased gift cards
      const { data: purchasedCards, error: purchasedError } = await supabase
        .from('gift_cards')
        .select('amount')
        .eq('sender_id', id);

      if (purchasedError) throw purchasedError;

      setGiftCardStats({
        receivedCount: receivedCards?.length || 0,
        purchasedCount: purchasedCards?.length || 0,
        totalAmountReceived: receivedCards?.reduce((sum, card) => sum + Number(card.amount), 0) || 0,
        totalAmountPurchased: purchasedCards?.reduce((sum, card) => sum + Number(card.amount), 0) || 0
      });
    } catch (error) {
      console.error('Error fetching gift card stats:', error);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users_with_roles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.roles) {
        setUserRoles(data.roles);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      profileSchema.parse(form);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsSaving(true);

    try {
      // First check if email is already taken by another user
      if (form.email !== profile?.email) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', form.email)
          .neq('id', id)
          .single();

        if (existingUser) {
          throw new Error('Cette adresse email est déjà utilisée');
        }

        // Update email in auth.users table
        const { error: authError } = await supabase.auth.admin.updateUserById(
          id!,
          { email: form.email }
        );

        if (authError) throw authError;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: form.email,
          first_name: form.firstName,
          last_name: form.lastName || null,
          phone: form.phone || null,
          street: form.street || null,
          postal_code: form.postalCode || null,
          city: form.city || null,
          country: form.country || 'FR',
          share_discount_key: form.shareDiscountKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (profileError) throw profileError;

      // Update user_addresses if needed
      const { data: existingAddresses, error: addressError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', id)
        .eq('is_default', true);

      if (addressError) throw addressError;

      // If there's a default address, update it
      if (existingAddresses && existingAddresses.length > 0) {
        const defaultAddress = existingAddresses[0];
        
        // Only update if the address has changed
        if (defaultAddress.street !== form.street ||
            defaultAddress.postal_code !== form.postalCode ||
            defaultAddress.city !== form.city ||
            defaultAddress.country !== form.country) {
          
          await supabase
            .from('user_addresses')
            .update({
              street: form.street || '',
              postal_code: form.postalCode || '',
              city: form.city || '',
              country: form.country || 'FR',
              updated_at: new Date().toISOString()
            })
            .eq('id', defaultAddress.id);
        }
      } 
      // If there's no default address but we have address data, create one
      else if (form.street && form.postalCode && form.city) {
        await supabase
          .from('user_addresses')
          .insert({
            user_id: id,
            street: form.street,
            postal_code: form.postalCode,
            city: form.city,
            country: form.country || 'FR',
            is_default: true
          });
      }

      setSuccess('Profil mis à jour avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh profile data
      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.admin.updateUserById(
        id!,
        { password: newPassword }
      );

      if (error) throw error;

      setSuccess('Mot de passe réinitialisé avec succès');
      setShowResetPassword(false);
      setNewPassword('');
    } catch (error: any) {
      setError('Erreur lors de la réinitialisation du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          blocked_until: profile.blocked_until 
            ? null 
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          login_attempts: 0
        })
        .eq('id', id);

      if (error) throw error;

      setSuccess(profile.blocked_until ? 'Utilisateur débloqué' : 'Utilisateur bloqué');
      setBlockConfirmation(false);
      fetchProfile();
    } catch (error: any) {
      setError('Erreur lors de la modification du statut');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: !profile.is_active,
          deleted_at: !profile.is_active ? null : new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setSuccess(profile.is_active ? 'Utilisateur désactivé' : 'Utilisateur réactivé');
      fetchProfile();
    } catch (error: any) {
      setError('Erreur lors de la modification du statut');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      // Check if user is admin
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      // Delete from admin_users if exists
      if (adminData) {
        await supabase
          .from('admin_users')
          .delete()
          .eq('id', id);
      }

      // Delete from admin_users_roles
      await supabase
        .from('admin_users_roles')
        .delete()
        .eq('user_id', id);

      // Delete from profiles
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Delete from auth.users
      await supabase.auth.admin.deleteUser(id!);

      setSuccess('Utilisateur supprimé avec succès');
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
    } catch (error: any) {
      setError('Erreur lors de la suppression: ' + error.message);
    } finally {
      setIsLoading(false);
      setDeleteConfirmation(false);
    }
  };

  const handleCopyId = async () => {
    if (profile?.user_identifier) {
      try {
        await navigator.clipboard.writeText(profile.user_identifier);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900">Utilisateur non trouvé</h2>
            <p className="mt-2 text-gray-500">
              L'utilisateur que vous recherchez n'existe pas ou a été supprimé.
            </p>
            <Link
              to="/admin/users"
              className="mt-4 inline-flex items-center text-[#8B1F38] hover:text-[#7A1B31]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste des utilisateurs
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
              to="/admin/users"
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Modifier l'utilisateur
            </h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] disabled:opacity-50"
          >
            <Save className="h-5 w-5 mr-2" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informations principales */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Informations de l'utilisateur
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Prénom
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={form.firstName}
                          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={form.lastName}
                          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="mt-1 relative">
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
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Ex: 06 12 34 56 78"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Adresse */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Rue
                        </label>
                        <div className="mt-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <textarea
                            rows={3}
                            value={form.street}
                            onChange={(e) => setForm({ ...form, street: e.target.value })}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                            placeholder="Adresse complète"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Pays
                        </label>
                        <div className="mt-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Globe className="h-5 w-5 text-gray-400" />
                          </div>
                          <select
                            value={form.country}
                            onChange={(e) => setForm({ ...form, country: e.target.value })}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          >
                            {COUNTRIES.map(country => (
                              <option key={country.code} value={country.code}>
                                {country.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Code postal
                          </label>
                          <input
                            type="text"
                            value={form.postalCode}
                            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                            placeholder={COUNTRIES.find(c => c.code === form.country)?.postalCodeExample || ''}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Ville
                          </label>
                          <input
                            type="text"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                            placeholder="Ville"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Case à cocher pour le partage des clés de réduction */}
                  <div className="sm:col-span-2">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="shareDiscountKey"
                            name="shareDiscountKey"
                            type="checkbox"
                            checked={form.shareDiscountKey}
                            onChange={(e) => setForm({ ...form, shareDiscountKey: e.target.checked })}
                            className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3">
                          <label htmlFor="shareDiscountKey" className="font-medium text-gray-700">
                            Partage Clés de réduction
                          </label>
                          <p className="text-gray-500 text-sm">
                            En cochant la case J'autorise l'utilisation des 4 derniers chiffres de mon identifiant.
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            (Vous pouvez modifier cette option à tout moment.)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Sécurité */}
            <div className="bg-white shadow rounded-lg mt-8">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Sécurité
                </h2>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Key className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">
                          Identifiant unique
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-mono text-gray-500">
                          {profile.user_identifier}
                        </span>
                        <button 
                          onClick={handleCopyId}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                          title="Copier l'identifiant"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Ban className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">
                          Statut du compte
                        </span>
                      </div>
                      {blockConfirmation ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleBlockUser}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setBlockConfirmation(false)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setBlockConfirmation(true)}
                          className={`text-sm font-medium ${
                            profile.blocked_until
                              ? 'text-green-600 hover:text-green-700'
                              : 'text-red-600 hover:text-red-700'
                          }`}
                        >
                          {profile.blocked_until ? 'Débloquer' : 'Bloquer'}
                        </button>
                      )}
                    </div>
                    {profile.blocked_until && (
                      <p className="mt-2 text-sm text-red-600">
                        Compte bloqué jusqu'au {formatDate(profile.blocked_until)}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Eye className={`h-5 w-5 ${profile.is_active ? 'text-green-500' : 'text-red-500'} mr-2`} />
                        <span className="text-sm font-medium text-gray-700">
                          Activation du compte
                        </span>
                      </div>
                      <button
                        onClick={handleToggleActive}
                        className={`text-sm font-medium ${
                          profile.is_active
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {profile.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                    {!profile.is_active && (
                      <p className="mt-2 text-sm text-red-600">
                        Compte désactivé {profile.deleted_at ? `le ${formatDate(profile.deleted_at)}` : ''}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Trash2 className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-sm font-medium text-gray-700">
                          Suppression définitive
                        </span>
                      </div>
                      {deleteConfirmation ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleDeleteUser}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmation(false)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmation(true)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Supprimer définitivement
                        </button>
                      )}
                    </div>
                    {deleteConfirmation && (
                      <div className="mt-2 p-3 bg-red-50 rounded-md">
                        <p className="text-sm text-red-700">
                          Cette action est irréversible. Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Rôles */}
            <div className="bg-white shadow rounded-lg mt-8">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <Shield className="h-5 w-5 text-blue-500 mr-2" />
                  Rôles et permissions
                </h2>

                <div className="space-y-4">
                  {userRoles.length > 0 ? (
                    <div className="space-y-2">
                      {userRoles.map((role, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                          <div className="flex items-center">
                            <Shield className="h-5 w-5 text-blue-500 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-blue-800">
                                {role.role_name.charAt(0).toUpperCase() + role.role_name.slice(1)}
                              </p>
                              <p className="text-xs text-blue-600">
                                Niveau: {role.role_level}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-blue-600">
                            Assigné le {new Date(role.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-500">Aucun rôle assigné</p>
                      <Link
                        to="/admin/roles"
                        className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Gérer les rôles
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques et activité */}
          <div>
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Statistiques
                </h2>

                <div className="space-y-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Date d'inscription
                      </p>
                      <p className="text-lg font-medium text-gray-900">
                        {formatDate(profile.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Dernière connexion
                      </p>
                      <p className="text-lg font-medium text-gray-900">
                        {formatDate(profile.last_login)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <ShoppingCart className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Nombre d'achats
                      </p>
                      <p className="text-lg font-medium text-gray-900">
                        {profile.purchases_count}
                      </p>
                    </div>
                  </div>

                  {/* Gift Cards Received */}
                  <div className="flex items-center">
                    <Gift className="h-8 w-8 text-pink-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Chèques cadeaux reçus
                      </p>
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          {giftCardStats.receivedCount}
                        </p>
                        <p className="text-sm text-gray-500">
                          Total : {giftCardStats.totalAmountReceived.toFixed(2)} €
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Gift Cards Purchased */}
                  <div className="flex items-center">
                    <Gift className="h-8 w-8 text-indigo-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Chèques cadeaux achetés
                      </p>
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          {giftCardStats.purchasedCount}
                        </p>
                        <p className="text-sm text-gray-500">
                          Total : {giftCardStats.totalAmountPurchased.toFixed(2)} €
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Key className="h-8 w-8 text-yellow-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Tentatives de connexion
                      </p>
                      <p className="text-lg font-medium text-gray-900">
                        {profile.login_attempts}
                      </p>
                    </div>
                  </div>

                  {userRoles.length > 0 && (
                    <div className="flex items-center">
                      <Shield className="h-8 w-8 text-blue-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">
                          Rôle principal
                        </p>
                        <p className="text-lg font-medium text-gray-900">
                          {userRoles.sort((a, b) => b.role_level - a.role_level)[0].role_name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}