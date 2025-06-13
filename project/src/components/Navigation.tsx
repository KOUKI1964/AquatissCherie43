import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Heart, 
  Search, 
  User, 
  Menu, 
  ChevronDown, 
  LogOut, 
  Circle, 
  Settings, 
  X,
  Gift,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

// Main menu structure
const mainMenuItems = [
  {
    name: 'Vêtement',
    slug: 'vetements',
    categories: [
      {
        name: 'Prêt à porter',
        slug: 'pret-a-porter',
        subcategories: [
          { name: 'Robes', slug: 'robes' },
          { name: 'Tops et tee-shirts', slug: 'tops-tee-shirts' },
          { name: 'Chemises', slug: 'chemises' },
          { name: 'Pantalons', slug: 'pantalons' },
          { name: 'Pulls, gilets et sweatshirts', slug: 'pulls-gilets-sweatshirts' },
          { name: 'Jeans', slug: 'jeans' }
        ]
      },
      {
        name: 'Inspirations',
        slug: 'inspirations',
        subcategories: [
          { name: 'Nouvelles collections', slug: 'nouvelles-collections' },
          { name: 'Les tendances femme', slug: 'tendances-femme' },
          { name: 'La marque Aquatiss chérie', slug: 'marque-aquatiss-cherie' },
          { name: 'Bons plans', slug: 'bons-plans' },
          { name: 'La galerie des cadeaux', slug: 'galerie-cadeaux' },
          { name: 'Carte cadeau', slug: 'carte-cadeau' }
        ]
      }
    ]
  },
  {
    name: 'Sacs & bagages',
    slug: 'sacs-bagages',
    categories: [
      {
        name: 'Maroquinerie',
        slug: 'maroquinerie',
        subcategories: [
          { name: 'Sacs à main', slug: 'sacs-a-main' },
          { name: 'Sacs à bandoulière', slug: 'sacs-bandouliere' },
          { name: 'Sacs cabas', slug: 'sacs-cabas' },
          { name: 'Sacs à dos', slug: 'sacs-a-dos' },
          { name: 'Sacs seau', slug: 'sacs-seau' },
          { name: 'Sacs banane', slug: 'sacs-banane' },
          { name: 'Mini sacs', slug: 'mini-sacs' },
          { name: 'Tote bags', slug: 'tote-bags' },
          { name: 'Sacs de plage', slug: 'sacs-de-plage' },
          { name: 'Sacs d\'ordinateur', slug: 'sacs-ordinateur' }
        ]
      },
      {
        name: 'Petite Maroquinerie',
        slug: 'petite-maroquinerie',
        subcategories: [
          { name: 'Portefeuilles', slug: 'portefeuilles' },
          { name: 'Porte-monnaie', slug: 'porte-monnaie' },
          { name: 'Porte-cartes', slug: 'porte-cartes' },
          { name: 'Pochettes et trousses', slug: 'pochettes-trousses' },
          { name: 'Bandoulières', slug: 'bandoulieres' },
          { name: 'Porte-clés et charmes', slug: 'porte-cles-charmes' }
        ]
      }
    ]
  },
  {
    name: 'Bijoux et Montres',
    slug: 'bijoux-montres',
    categories: [
      {
        name: 'Bijoux',
        slug: 'bijoux',
        subcategories: [
          { name: 'Bracelets', slug: 'bracelets' },
          { name: 'Boucles d\'oreilles', slug: 'boucles-oreilles' },
          { name: 'Colliers', slug: 'colliers' },
          { name: 'Bagues', slug: 'bagues' },
          { name: 'Pendentifs', slug: 'pendentifs' },
          { name: 'Broches', slug: 'broches' }
        ]
      },
      {
        name: 'Montres',
        slug: 'montres',
        subcategories: [
          { name: 'Montres bracelet acier', slug: 'montres-bracelet-acier' },
          { name: 'Montres connectées', slug: 'montres-connectees' },
          { name: 'Montres bracelet silicone', slug: 'montres-bracelet-silicone' },
          { name: 'Montres bracelet cuir', slug: 'montres-bracelet-cuir' },
          { name: 'Montres bracelet tissu', slug: 'montres-bracelet-tissu' }
        ]
      }
    ]
  },
  {
    name: 'Chaussures',
    slug: 'chaussures',
    categories: [
      {
        name: 'Chaussures femme',
        slug: 'chaussures-femme',
        subcategories: [
          { name: 'Sandales à talons', slug: 'sandales-talons' },
          { name: 'Sandales plates', slug: 'sandales-plates' },
          { name: 'Mules et sabots', slug: 'mules-sabots' },
          { name: 'Escarpins', slug: 'escarpins' },
          { name: 'Ballerines et babies', slug: 'ballerines-babies' },
          { name: 'Mocassins', slug: 'mocassins' },
          { name: 'Chaussures d\'été', slug: 'chaussures-ete' },
          { name: 'Chaussures de ville', slug: 'chaussures-ville' },
          { name: 'Accessoires pour chaussures', slug: 'accessoires-chaussures' }
        ]
      },
      {
        name: 'Baskets',
        slug: 'baskets',
        subcategories: [
          { name: 'Sneakers', slug: 'sneakers' },
          { name: 'Baskets montantes', slug: 'baskets-montantes' },
          { name: 'Baskets basses', slug: 'baskets-basses' },
          { name: 'Baskets à scratch', slug: 'baskets-scratch' },
          { name: 'Chaussures de sport', slug: 'chaussures-sport' }
        ]
      }
    ]
  },
  {
    name: 'Accessoires',
    slug: 'accessoires',
    categories: [
      {
        name: 'Accessoires de luxe',
        slug: 'accessoires-luxe',
        subcategories: [
          { name: 'Lunettes de soleil', slug: 'lunettes-soleil' },
          { name: 'Foulards et écharpes', slug: 'foulards-echarpes' },
          { name: 'Casquettes', slug: 'casquettes' },
          { name: 'Ceintures', slug: 'ceintures' },
          { name: 'Accessoires pour cheveux', slug: 'accessoires-cheveux' },
          { name: 'Accessoires de téléphone', slug: 'accessoires-telephone' }
        ]
      }
    ]
  },
  {
    name: 'Beauté',
    slug: 'beaute',
    categories: [
      {
        name: 'Parfums',
        slug: 'parfums',
        subcategories: [
          { name: 'Parfums d\'exception', slug: 'parfums-exception' },
          { name: 'Parfums femme', slug: 'parfums-femme' },
          { name: 'Coffrets parfum femme', slug: 'coffrets-parfum-femme' },
          { name: 'Eaux de parfum', slug: 'eaux-de-parfum' },
          { name: 'Eaux de toilette', slug: 'eaux-de-toilette' },
          { name: 'Eaux de Cologne', slug: 'eaux-de-cologne' }
        ]
      },
      {
        name: 'Bougies et parfums d\'intérieur',
        slug: 'bougies-parfums-interieur',
        subcategories: [
          { name: 'Parfums d\'intérieur', slug: 'parfums-interieur' },
          { name: 'Bougies parfumées', slug: 'bougies-parfumees' }
        ]
      },
      {
        name: 'Maquillage',
        slug: 'maquillage',
        subcategories: [
          { name: 'Teint', slug: 'teint' },
          { name: 'Yeux', slug: 'yeux' },
          { name: 'Sourcils', slug: 'sourcils' },
          { name: 'Lèvres', slug: 'levres' },
          { name: 'Manucure et ongles', slug: 'manucure-ongles' }
        ]
      },
      {
        name: 'Soins visage',
        slug: 'soins-visage',
        subcategories: [
          { name: 'Crèmes et soins d\'exception', slug: 'cremes-soins-exception' },
          { name: 'Crèmes', slug: 'cremes' },
          { name: 'Soins ciblés', slug: 'soins-cibles' },
          { name: 'Démaquillants', slug: 'demaquillants' },
          { name: 'Nettoyants', slug: 'nettoyants' },
          { name: 'Compléments alimentaires pour le visage', slug: 'complements-visage' }
        ]
      },
      {
        name: 'Corps et bain',
        slug: 'corps-bain',
        subcategories: [
          { name: 'Crèmes et laits corps', slug: 'cremes-laits-corps' },
          { name: 'Soins ciblés corps', slug: 'soins-cibles-corps' },
          { name: 'Gommages et exfoliants', slug: 'gommages-exfoliants' },
          { name: 'Coffrets corps', slug: 'coffrets-corps' },
          { name: 'Déodorants', slug: 'deodorants' },
          { name: 'Bain et douche', slug: 'bain-douche' },
          { name: 'Épilation et rasage', slug: 'epilation-rasage' },
          { name: 'Compléments alimentaires corps', slug: 'complements-corps' }
        ]
      },
      {
        name: 'Soins solaires',
        slug: 'soins-solaires',
        subcategories: [
          { name: 'Crèmes solaires', slug: 'cremes-solaires' },
          { name: 'Après soleil', slug: 'apres-soleil' },
          { name: 'Auto-bronzants', slug: 'auto-bronzants' },
          { name: 'Coffrets solaires', slug: 'coffrets-solaires' }
        ]
      },
      {
        name: 'Cheveux',
        slug: 'cheveux',
        subcategories: [
          { name: 'Shampoings', slug: 'shampoings' },
          { name: 'Après-shampoings', slug: 'apres-shampoings' },
          { name: 'Soins sans rinçage', slug: 'soins-sans-rincage' },
          { name: 'Masques cheveux', slug: 'masques-cheveux' },
          { name: 'Produits coiffants', slug: 'produits-coiffants' },
          { name: 'Colorations', slug: 'colorations' }
        ]
      },
      {
        name: 'Accessoires cheveux',
        slug: 'accessoires-cheveux',
        subcategories: [
          { name: 'Lisseurs', slug: 'lisseurs' },
          { name: 'Brosses et peignes', slug: 'brosses-peignes' },
          { name: 'Sèche-cheveux', slug: 'seche-cheveux' },
          { name: 'Boucler', slug: 'boucler' },
          { name: 'Accessoires coiffure', slug: 'accessoires-coiffure' }
        ]
      }
    ]
  }
];

export function Navigation() {
  const [activeMainMenu, setActiveMainMenu] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userStatus, setUserStatus] = useState<'online' | 'busy' | 'offline'>('offline');
  const [menuItems, setMenuItems] = useState(mainMenuItems);
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useCart();

  useEffect(() => {
    // Try to load categories from database
    fetchCategories();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
        checkIfAdmin(session.user.id);
        setUserStatus('online');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
        checkIfAdmin(session.user.id);
        setUserStatus('online');
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setUserStatus('offline');
      }
    });

    // Setup real-time subscription for category changes
    const categoriesSubscription = supabase
      .channel('public:product_categories')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_categories'
      }, () => {
        console.log('Categories changed, refreshing menu...');
        // Clear cache and fetch fresh data
        localStorage.removeItem('frontendCategories');
        localStorage.removeItem('frontendCategoriesLastFetched');
        fetchCategories();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(categoriesSubscription);
    };
  }, []);

  const fetchCategories = async () => {
    try {
      // Check if we have cached categories and they're not too old
      const cachedCategories = localStorage.getItem('frontendCategories');
      const lastFetched = localStorage.getItem('frontendCategoriesLastFetched');
      
      // Use cache if it exists and is less than 5 minutes old
      if (cachedCategories && lastFetched) {
        const cacheAge = Date.now() - new Date(lastFetched).getTime();
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          const parsedCategories = JSON.parse(cachedCategories);
          if (parsedCategories && parsedCategories.length > 0) {
            console.log('Using cached categories');
            buildMenuFromCategories(parsedCategories);
            return;
          }
        }
      }
      
      setIsMenuLoading(true);
      
      // Fetch categories from database
      const { data: categoriesData, error } = await supabase
        .from('category_hierarchy_view')
        .select('*')
        .eq('is_active', true)
        .order('path_name');
        
      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }
      
      // Cache the categories
      localStorage.setItem('frontendCategories', JSON.stringify(categoriesData));
      localStorage.setItem('frontendCategoriesLastFetched', new Date().toISOString());
      
      // Build menu structure from categories
      buildMenuFromCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsMenuLoading(false);
    }
  };

  const buildMenuFromCategories = (categoriesData: any[]) => {
    if (!categoriesData || categoriesData.length === 0) {
      return;
    }
    
    try {
      // Group by level
      const level1 = categoriesData.filter(c => c.level === 1);
      const level2 = categoriesData.filter(c => c.level === 2);
      const level3 = categoriesData.filter(c => c.level === 3);
      
      // Build menu structure
      const newMenuItems = level1.map(mainItem => {
        const categories = level2
          .filter(cat => cat.parent_id === mainItem.id)
          .map(category => {
            const subcategories = level3
              .filter(sub => sub.parent_id === category.id)
              .map(sub => ({
                name: sub.name,
                slug: sub.slug
              }));
              
            return {
              name: category.name,
              slug: category.slug,
              subcategories
            };
          });
          
        return {
          name: mainItem.name,
          slug: mainItem.slug,
          categories
        };
      });
      
      // Only update if there are actual changes
      if (JSON.stringify(newMenuItems) !== JSON.stringify(menuItems) && newMenuItems.length > 0) {
        setMenuItems(newMenuItems);
      }
    } catch (error) {
      console.error('Error building menu from categories:', error);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
    } else {
      setUserProfile(data);
    }
  };

  const checkIfAdmin = async (userId: string) => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/connexion');
  };

  const toggleUserStatus = () => {
    setUserStatus(current => current === 'online' ? 'busy' : 'online');
  };

  const handleMainMenuClick = (slug: string) => {
    if (activeMainMenu === slug) {
      setActiveMainMenu(null);
      setActiveCategory(null);
    } else {
      setActiveMainMenu(slug);
      setActiveCategory(null);
    }
  };

  const handleCategoryClick = (slug: string) => {
    setActiveCategory(activeCategory === slug ? null : slug);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setActiveMainMenu(null);
        setActiveCategory(null);
      }

      if (
        userMenuRef.current &&
        userButtonRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        !userButtonRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
      
      if (
        isSearchOpen &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

  // Close menus when route changes
  useEffect(() => {
    setActiveMainMenu(null);
    setActiveCategory(null);
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  const getStatusColor = () => {
    switch (userStatus) {
      case 'online':
        return 'text-green-500';
      case 'busy':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  const getMainMenuItem = (slug: string) => {
    return menuItems.find(item => item.slug === slug);
  };

  const getCategory = (mainMenuSlug: string, categorySlug: string) => {
    const mainMenu = getMainMenuItem(mainMenuSlug);
    return mainMenu?.categories.find(category => category.slug === categorySlug);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <nav className="bg-white shadow-sm relative z-50">
      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-white z-50 flex items-center justify-center"
          >
            <div className="w-full max-w-3xl px-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher des produits, des catégories..."
                  className="w-full py-4 pl-12 pr-10 border-b-2 border-gray-300 focus:border-[#8B1F38] focus:outline-none text-lg"
                  autoFocus
                />
                <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                <p className="text-sm text-gray-500 mr-2">Recherches populaires:</p>
                <button 
                  onClick={() => {
                    setSearchQuery('robes');
                    navigate('/categorie/robes');
                    setIsSearchOpen(false);
                  }}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200"
                >
                  Robes
                </button>
                <button 
                  onClick={() => {
                    setSearchQuery('sacs');
                    navigate('/categorie/sacs-a-main');
                    setIsSearchOpen(false);
                  }}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200"
                >
                  Sacs à main
                </button>
                <button 
                  onClick={() => {
                    setSearchQuery('bijoux');
                    navigate('/categorie/bijoux');
                    setIsSearchOpen(false);
                  }}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200"
                >
                  Bijoux
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo centered at the top */}
        <div className="flex justify-center py-4">
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="Aquatiss Chérie"
              className="h-16 w-auto"
              style={{ 
                maxWidth: '200px',
                objectFit: 'contain'
              }}
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/200x64?text=Aquatiss+Chérie';
              }}
            />
          </Link>
        </div>
        
        {/* Navigation menu below the logo */}
        <div className="flex justify-between items-center py-4 border-t border-gray-100">
          {/* Mobile menu button */}
          <button 
            className="md:hidden flex items-center"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-center space-x-8 flex-1" ref={menuRef}>
            {/* Nouveautés Link */}
            <Link 
              to="/nouveautes" 
              className="flex items-center font-bold text-[#8B1F38] hover:text-[#7A1B31] whitespace-nowrap"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Nouveautés
            </Link>
            
            {isMenuLoading ? (
              // Show loading placeholders
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </>
            ) : (
              // Show actual menu items
              menuItems.map((item) => (
                <div key={item.slug} className="relative">
                  <button
                    className={`flex items-center font-bold text-gray-600 hover:text-gray-900 whitespace-nowrap ${
                      activeMainMenu === item.slug ? 'text-[#8B1F38]' : ''
                    }`}
                    onClick={() => handleMainMenuClick(item.slug)}
                    aria-expanded={activeMainMenu === item.slug}
                  >
                    {item.name}
                    <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${
                      activeMainMenu === item.slug ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  <AnimatePresence>
                    {activeMainMenu === item.slug && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-50 flex"
                        style={{ minWidth: '200px' }}
                      >
                        {/* Categories (Level 2) */}
                        <div className="py-2 border-r border-gray-200 min-w-[200px]">
                          {item.categories.map((category) => (
                            <button
                              key={category.slug}
                              onClick={() => handleCategoryClick(category.slug)}
                              className={`block w-full text-left px-4 py-2 text-sm ${
                                activeCategory === category.slug
                                  ? 'bg-gray-100 text-gray-900 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                        
                        {/* Subcategories (Level 3) */}
                        <AnimatePresence>
                          {activeCategory && (
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                              className="py-2 px-4 min-w-[250px]"
                            >
                              <h3 className="text-sm font-medium text-gray-900 mb-2 border-b border-gray-200 pb-2">
                                {getCategory(item.slug, activeCategory)?.name}
                              </h3>
                              <div className="grid grid-cols-1 gap-1">
                                {getCategory(item.slug, activeCategory)?.subcategories.map((subcategory) => (
                                  <Link
                                    key={subcategory.slug}
                                    to={`/categorie/${subcategory.slug}`}
                                    className="text-sm text-gray-700 hover:text-[#8B1F38] py-1 whitespace-nowrap"
                                  >
                                    {subcategory.name}
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
            
            <Link 
              to="/cheque-cadeau" 
              className="flex items-center text-[#8B1F38] hover:text-[#7A1B31] font-medium"
            >
              <Gift className="h-5 w-5 mr-1" />
              Chèque Cadeau
            </Link>
          </div>
          
          {/* Right side icons */}
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
              aria-label="Rechercher"
            >
              <Search className="h-5 w-5" />
            </button>
            <div className="relative">
              <button
                ref={userButtonRef}
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                aria-expanded={isUserMenuOpen}
                aria-label="Menu utilisateur"
              >
                {user ? (
                  <>
                    <div className="flex items-center">
                      <div className="relative">
                        <User className="h-5 w-5" />
                        <Circle className={`h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 ${getStatusColor()}`} fill="currentColor" />
                      </div>
                      {userProfile && (
                        <span className="ml-2 text-sm font-medium hidden sm:block">
                          {userProfile.first_name || 'Utilisateur'}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <User className="h-5 w-5" />
                )}
              </button>
              {isUserMenuOpen && (
                <div
                  ref={userMenuRef}
                  className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-2 z-50"
                >
                  {user ? (
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {userProfile?.first_name} {userProfile?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <button
                        onClick={toggleUserStatus}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center"
                      >
                        <Circle className={`h-3 w-3 mr-2 ${getStatusColor()}`} fill="currentColor" />
                        {userStatus === 'online' ? 'En ligne' : 'Occupé(e)'}
                      </button>
                      <Link
                        to="/profil"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      >
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Mon Profil
                        </div>
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        >
                          <div className="flex items-center">
                            <Settings className="h-4 w-4 mr-2" />
                            Administration
                          </div>
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 hover:text-red-700 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Se déconnecter
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/connexion"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      >
                        Se connecter
                      </Link>
                      <Link
                        to="/inscription"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      >
                        Créer un compte
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <Link to="/favoris" className="relative text-gray-600 hover:text-gray-900">
              <Heart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 bg-[#8B1F38] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                0
              </span>
            </Link>
            <Link to="/panier" className="relative text-gray-600 hover:text-gray-900">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#8B1F38] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-200"
          >
            <div className="px-4 py-2 space-y-1">
              {/* Nouveautés Link for Mobile */}
              <Link 
                to="/nouveautes" 
                className="flex items-center py-2 text-[#8B1F38] font-medium"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Nouveautés
              </Link>
              
              {menuItems.map((item) => (
                <div key={item.slug} className="py-2">
                  <button
                    className={`flex items-center justify-between w-full text-left font-bold ${
                      activeMainMenu === item.slug ? 'text-[#8B1F38]' : 'text-gray-700'
                    }`}
                    onClick={() => handleMainMenuClick(item.slug)}
                  >
                    {item.name}
                    <ChevronDown className={`h-4 w-4 transition-transform ${
                      activeMainMenu === item.slug ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  <AnimatePresence>
                    {activeMainMenu === item.slug && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-4 mt-2 space-y-2"
                      >
                        {item.categories.map((category) => (
                          <div key={category.slug} className="py-1">
                            <button
                              className={`flex items-center justify-between w-full text-left ${
                                activeCategory === category.slug ? 'text-[#8B1F38] font-medium' : 'text-gray-600'
                              }`}
                              onClick={() => handleCategoryClick(category.slug)}
                            >
                              {category.name}
                              <ChevronDown className={`h-4 w-4 transition-transform ${
                                activeCategory === category.slug ? 'rotate-180' : ''
                              }`} />
                            </button>
                            
                            <AnimatePresence>
                              {activeCategory === category.slug && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="pl-4 mt-1 space-y-1"
                                >
                                  {category.subcategories.map((subcategory) => (
                                    <Link
                                      key={subcategory.slug}
                                      to={`/categorie/${subcategory.slug}`}
                                      className="block py-1 text-sm text-gray-500 hover:text-[#8B1F38]"
                                    >
                                      {subcategory.name}
                                    </Link>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              
              <Link 
                to="/cheque-cadeau" 
                className="flex items-center py-2 text-[#8B1F38] font-medium"
              >
                <Gift className="h-5 w-5 mr-2" />
                Chèque Cadeau
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}