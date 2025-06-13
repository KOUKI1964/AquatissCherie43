import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  Calendar,
  Clock,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Save,
  FileImage,
  Layout,
  MapPin,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminSidebar } from '../../components/AdminSidebar';
import { z } from 'zod';

interface Banner {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  location: string;
  type: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

const bannerSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  content: z.string().optional().nullable(),
  image_url: z.string().url('URL d\'image invalide').optional().nullable(),
  link_url: z.string().url('URL de lien invalide').optional().nullable(),
  location: z.string().min(1, 'L\'emplacement est requis'),
  type: z.string().min(1, 'Le type est requis'),
  is_active: z.boolean(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  priority: z.number().int().min(0, 'La priorité doit être un nombre positif')
});

const BANNER_LOCATIONS = [
  { value: 'home_hero', label: 'Accueil - Héro principal' },
  { value: 'home_secondary', label: 'Accueil - Bannière secondaire' },
  { value: 'category_page', label: 'Page de catégorie' },
  { value: 'product_page', label: 'Page produit' },
  { value: 'cart_page', label: 'Page panier' },
  { value: 'checkout_page', label: 'Page de paiement' },
  { value: 'global', label: 'Global (toutes les pages)' }
];

const BANNER_TYPES = [
  { value: 'full_width', label: 'Pleine largeur' },
  { value: 'card', label: 'Carte' },
  { value: 'notification', label: 'Notification' },
  { value: 'popup', label: 'Popup' },
  { value: 'sidebar', label: 'Barre latérale' }
];

export function BannersPage() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    type: '',
    isActive: '',
    search: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'priority',
    direction: 'desc'
  });
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    image_url: '',
    link_url: '',
    location: 'home_hero',
    type: 'full_width',
    is_active: true,
    start_date: '',
    end_date: '',
    priority: 0
  });

  useEffect(() => {
    checkAdminAccess();
    fetchBanners();
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

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('site_banners')
        .select('*')
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      // Apply filters
      if (filters.location) {
        query = query.eq('location', filters.location);
      }
      
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters.isActive === 'active') {
        query = query.eq('is_active', true);
      } else if (filters.isActive === 'inactive') {
        query = query.eq('is_active', false);
      }
      
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBanners(data || []);
    } catch (error: any) {
      console.error('Error fetching banners:', error);
      setError('Erreur lors du chargement des bannières');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    fetchBanners();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    fetchBanners();
  };

  const resetFilters = () => {
    setFilters({
      location: '',
      type: '',
      isActive: '',
      search: ''
    });
    fetchBanners();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Validate form data
      bannerSchema.parse(form);

      if (editingBanner) {
        // Update existing banner
        const { error } = await supabase
          .from('site_banners')
          .update({
            title: form.title,
            content: form.content || null,
            image_url: form.image_url || null,
            link_url: form.link_url || null,
            location: form.location,
            type: form.type,
            is_active: form.is_active,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            priority: form.priority
          })
          .eq('id', editingBanner.id);

        if (error) throw error;
        setSuccess('Bannière mise à jour avec succès');
      } else {
        // Create new banner
        const { error } = await supabase
          .from('site_banners')
          .insert({
            title: form.title,
            content: form.content || null,
            image_url: form.image_url || null,
            link_url: form.link_url || null,
            location: form.location,
            type: form.type,
            is_active: form.is_active,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            priority: form.priority
          });

        if (error) throw error;
        setSuccess('Bannière créée avec succès');
      }

      // Reset form and fetch updated banners
      resetForm();
      fetchBanners();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else {
        console.error('Error saving banner:', error);
        setError(error.message || 'Une erreur est survenue');
      }
    }
  };

  const handleDelete = async (bannerId: string) => {
    try {
      const { error } = await supabase
        .from('site_banners')
        .delete()
        .eq('id', bannerId);

      if (error) throw error;

      setSuccess('Bannière supprimée avec succès');
      setDeleteConfirmation(null);
      fetchBanners();
    } catch (error: any) {
      console.error('Error deleting banner:', error);
      setError(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('site_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;

      setSuccess(`Bannière ${banner.is_active ? 'désactivée' : 'activée'} avec succès`);
      fetchBanners();
    } catch (error: any) {
      console.error('Error toggling banner status:', error);
      setError(error.message || 'Erreur lors de la modification du statut');
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      image_url: '',
      link_url: '',
      location: 'home_hero',
      type: 'full_width',
      is_active: true,
      start_date: '',
      end_date: '',
      priority: 0
    });
    setEditingBanner(null);
    setShowBannerForm(false);
  };

  const startEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      content: banner.content || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      location: banner.location,
      type: banner.type,
      is_active: banner.is_active,
      start_date: banner.start_date ? new Date(banner.start_date).toISOString().split('T')[0] : '',
      end_date: banner.end_date ? new Date(banner.end_date).toISOString().split('T')[0] : '',
      priority: banner.priority
    });
    setShowBannerForm(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLocationLabel = (locationValue: string) => {
    const location = BANNER_LOCATIONS.find(loc => loc.value === locationValue);
    return location ? location.label : locationValue;
  };

  const getTypeLabel = (typeValue: string) => {
    const type = BANNER_TYPES.find(t => t.value === typeValue);
    return type ? type.label : typeValue;
  };

  const getBannerStatus = (banner: Banner) => {
    if (!banner.is_active) {
      return { status: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    }

    const now = new Date();
    const startDate = banner.start_date ? new Date(banner.start_date) : null;
    const endDate = banner.end_date ? new Date(banner.end_date) : null;

    if (startDate && startDate > now) {
      return { status: 'scheduled', label: 'Programmée', color: 'bg-blue-100 text-blue-800' };
    }

    if (endDate && endDate < now) {
      return { status: 'expired', label: 'Expirée', color: 'bg-red-100 text-red-800' };
    }

    return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-800' };
  };

  if (isLoading && banners.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 p-8 pl-64">
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
                  <h1 className="text-2xl font-bold text-gray-900">Gestion des bannières</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Gérez les bannières affichées sur le site
                </p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowBannerForm(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouvelle bannière
              </button>
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
                    placeholder="Rechercher par titre..."
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
                        Emplacement
                      </label>
                      <select
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous les emplacements</option>
                        {BANNER_LOCATIONS.map((location) => (
                          <option key={location.value} value={location.value}>
                            {location.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous les types</option>
                        {BANNER_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Statut
                      </label>
                      <select
                        value={filters.isActive}
                        onChange={(e) => handleFilterChange('isActive', e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      >
                        <option value="">Tous les statuts</option>
                        <option value="active">Actives</option>
                        <option value="inactive">Inactives</option>
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
          </div>

          {/* Banner Form */}
          {showBannerForm && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  {editingBanner ? 'Modifier la bannière' : 'Nouvelle bannière'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Titre
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                      Contenu
                    </label>
                    <textarea
                      id="content"
                      rows={3}
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
                      URL de l'image
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <div className="relative flex items-stretch flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="url"
                          id="image_url"
                          value={form.image_url}
                          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                          className="focus:ring-[#8B1F38] focus:border-[#8B1F38] block w-full rounded-md pl-10 sm:text-sm border-gray-300"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </div>
                    {form.image_url && (
                      <div className="mt-2">
                        <img 
                          src={form.image_url} 
                          alt="Aperçu" 
                          className="h-20 w-auto object-cover rounded-md"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/300x150?text=Image+non+disponible';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="link_url" className="block text-sm font-medium text-gray-700">
                      URL du lien
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <div className="relative flex items-stretch flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LinkIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="url"
                          id="link_url"
                          value={form.link_url}
                          onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                          className="focus:ring-[#8B1F38] focus:border-[#8B1F38] block w-full rounded-md pl-10 sm:text-sm border-gray-300"
                          placeholder="https://example.com/page"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      Emplacement
                    </label>
                    <select
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      required
                    >
                      {BANNER_LOCATIONS.map((location) => (
                        <option key={location.value} value={location.value}>
                          {location.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <select
                      id="type"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#8B1F38] focus:border-[#8B1F38] sm:text-sm rounded-md"
                      required
                    >
                      {BANNER_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                      Date de début
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <div className="relative flex items-stretch flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          id="start_date"
                          value={form.start_date}
                          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                          className="focus:ring-[#8B1F38] focus:border-[#8B1F38] block w-full rounded-md pl-10 sm:text-sm border-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                      Date de fin
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <div className="relative flex items-stretch flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          id="end_date"
                          value={form.end_date}
                          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                          className="focus:ring-[#8B1F38] focus:border-[#8B1F38] block w-full rounded-md pl-10 sm:text-sm border-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                      Priorité
                    </label>
                    <input
                      type="number"
                      id="priority"
                      min="0"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B1F38] focus:ring-[#8B1F38] sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Les bannières avec une priorité plus élevée s'affichent en premier.
                    </p>
                  </div>

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
                      Bannière active
                    </label>
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
                    {editingBanner ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Banners List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Titre
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('location')}
                  >
                    <div className="flex items-center">
                      Emplacement
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Période
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center">
                      Priorité
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
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {banners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Aucune bannière trouvée
                    </td>
                  </tr>
                ) : (
                  banners.map((banner) => {
                    const status = getBannerStatus(banner);
                    return (
                      <tr key={banner.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {banner.image_url ? (
                              <img
                                src={banner.image_url}
                                alt={banner.title}
                                className="h-10 w-16 object-cover rounded mr-3"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/160x100?text=Image+non+disponible';
                                }}
                              />
                            ) : (
                              <div className="h-10 w-16 bg-gray-200 rounded flex items-center justify-center mr-3">
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{banner.title}</div>
                              {banner.link_url && (
                                <div className="text-sm text-gray-500 flex items-center">
                                  <LinkIcon className="h-3 w-3 mr-1" />
                                  <span className="truncate max-w-xs">{banner.link_url}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{getLocationLabel(banner.location)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Layout className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{getTypeLabel(banner.type)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {banner.start_date ? (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                                <span>Du {formatDate(banner.start_date)}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                            {banner.end_date && (
                              <div className="flex items-center mt-1">
                                <ArrowRight className="h-4 w-4 text-gray-400 mr-1" />
                                <span>Au {formatDate(banner.end_date)}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {banner.priority}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleToggleActive(banner)}
                              className={`p-1 rounded-full ${
                                banner.is_active
                                  ? 'text-green-600 hover:text-green-900 hover:bg-green-100'
                                  : 'text-red-600 hover:text-red-900 hover:bg-red-100'
                              }`}
                              title={banner.is_active ? 'Désactiver' : 'Activer'}
                            >
                              {banner.is_active ? (
                                <Eye className="h-5 w-5" />
                              ) : (
                                <EyeOff className="h-5 w-5" />
                              )}
                            </button>
                            <button
                              onClick={() => startEdit(banner)}
                              className="p-1 rounded-full text-blue-600 hover:text-blue-900 hover:bg-blue-100"
                              title="Modifier"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            {deleteConfirmation === banner.id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleDelete(banner.id)}
                                  className="p-1 rounded-full text-green-600 hover:text-green-900 hover:bg-green-100"
                                  title="Confirmer la suppression"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmation(null)}
                                  className="p-1 rounded-full text-red-600 hover:text-red-900 hover:bg-red-100"
                                  title="Annuler"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmation(banner.id)}
                                className="p-1 rounded-full text-red-600 hover:text-red-900 hover:bg-red-100"
                                title="Supprimer"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                            {banner.link_url && (
                              <a
                                href={banner.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                title="Ouvrir le lien"
                              >
                                <ExternalLink className="h-5 w-5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}