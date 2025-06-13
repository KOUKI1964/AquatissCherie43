import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Key, Copy, Check, AlertCircle, Save, Phone, MapPin, ShoppingCart, X, Globe, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { Address, COUNTRIES } from '../types/address';
import { AddressForm } from '../components/AddressForm';
import { AddressSelector } from '../components/AddressSelector';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().optional(),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  shareDiscountKey: z.boolean().optional(),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
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
  role?: string;
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shareDiscountKey: boolean;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    shareDiscountKey: false,
    street: '',
    postalCode: '',
    city: '',
    country: 'FR',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses'>('profile');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/connexion');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setForm({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || session.user.email || '',
          phone: data.phone || '',
          shareDiscountKey: data.share_discount_key || false,
          street: data.street || '',
          postalCode: data.postal_code || '',
          city: data.city || '',
          country: data.country || 'FR',
        });
      } else {
        // If no profile exists, just set the form with the session email
        setForm(prev => ({
          ...prev,
          email: session.user.email || '',
        }));
        setError('Profil non trouvé. Veuillez contacter le support.');
      }

      // Check if user is admin
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (adminData) {
        setIsAdmin(true);
        
        // Get user roles
        const { data: rolesData } = await supabase
          .from('admin_users_with_roles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (rolesData && rolesData.roles && rolesData.roles.length > 0) {
          // Get the highest level role
          const highestRole = rolesData.roles.reduce((prev, current) => 
            (prev.role_level > current.role_level) ? prev : current
          );
          setUserRole(highestRole.role_name);
        } else {
          setUserRole(adminData.role);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Erreur lors du chargement du profil');
    } finally {
      setIsLoading(false);
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
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: form.firstName,
          last_name: form.lastName || null,
          phone: form.phone || null,
          share_discount_key: form.shareDiscountKey,
          street: form.street || null,
          postal_code: form.postalCode || null,
          city: form.city || null,
          country: form.country || 'FR',
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.id);

      if (error) throw error;

      setSuccess('Profil mis à jour avec succès');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
      // Refresh profile data
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddressSubmit = async (address: Address) => {
    try {
      setError(null);
      setIsSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          street: address.street,
          postal_code: address.postalCode,
          city: address.city,
          country: address.country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.id);

      if (error) throw error;

      // Also add this as a default address in user_addresses if it doesn't exist
      const { data: existingAddresses } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', profile?.id);
      
      // If no addresses exist, add this as default
      if (!existingAddresses || existingAddresses.length === 0) {
        await supabase
          .from('user_addresses')
          .insert({
            user_id: profile?.id,
            street: address.street,
            postal_code: address.postalCode,
            city: address.city,
            country: address.country,
            is_default: true
          });
      }

      setSuccess('Adresse mise à jour avec succès');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
      setShowAddressForm(false);
      
      // Refresh profile data
      fetchProfile();
    } catch (error) {
      console.error('Error updating address:', error);
      setError('Erreur lors de la mise à jour de l\'adresse');
    } finally {
      setIsSaving(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* En-tête */}
          <div className="px-6 py-8 border-b border-gray-200">
            <h1 className="text-2xl font-serif font-bold text-gray-900">Mon Profil</h1>
            <p className="mt-1 text-sm text-gray-600">
              Gérez vos informations personnelles
            </p>
            {userRole && (
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Shield className="h-3.5 w-3.5 mr-1" />
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </div>
            )}
          </div>

          {/* Notifications */}
          {error && (
            <div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mx-6 mt-4 rounded-md bg-green-50 p-4">
              <div className="flex">
                <Check className="h-5 w-5 text-green-400" />
                <p className="ml-3 text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Informations personnelles
              </button>
              <button
                onClick={() => setActiveTab('addresses')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'addresses'
                    ? 'border-b-2 border-[#8B1F38] text-[#8B1F38]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mes adresses
              </button>
            </nav>
          </div>

          {/* Statistiques */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <ShoppingCart className="h-5 w-5 text-gray-400" />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Nombre d'achats effectués
                </span>
                <span className="ml-auto bg-[#8B1F38] text-white px-3 py-1 rounded-full text-sm font-medium">
                  {profile?.purchases_count || 0}
                </span>
              </div>
              
              {userRole && (
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Rôle utilisateur
                  </span>
                  <span className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Identifiant utilisateur */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Key className="h-5 w-5 text-gray-400" />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Identifiant utilisateur
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={profile?.user_identifier || ''}
                  className="px-2 py-1 bg-gray-100 rounded text-sm font-mono border-none focus:ring-0"
                />
                <button
                  onClick={handleCopyId}
                  className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                  title="Copier l'identifiant"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {activeTab === 'profile' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Prénom
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nom
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={form.email}
                      disabled
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed sm:text-sm"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    L'adresse email ne peut pas être modifiée
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Numéro de téléphone
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                      placeholder="Ex: 06 12 34 56 78"
                    />
                  </div>
                </div>

                {/* Adresse principale */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse principale</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                        Rue
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <textarea
                          id="street"
                          name="street"
                          rows={2}
                          value={form.street}
                          onChange={(e) => setForm({ ...form, street: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                          placeholder="Numéro et nom de rue, appartement, bâtiment, etc."
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                        Pays
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Globe className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          id="country"
                          name="country"
                          value={form.country}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm"
                        >
                          {COUNTRIES.map(country => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                          Code postal
                        </label>
                        <input
                          type="text"
                          id="postalCode"
                          name="postalCode"
                          value={form.postalCode}
                          onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                          placeholder={COUNTRIES.find(c => c.code === form.country)?.postalCodeExample || ''}
                        />
                      </div>

                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                          Ville
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
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

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] ${
                      isSaving ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-5">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Adresses de livraison</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Gérez vos adresses de livraison pour vos commandes.
                  </p>
                </div>

                {profile && (
                  <AddressSelector 
                    userId={profile.id}
                    onAddressSelected={() => {}}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}