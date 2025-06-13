import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Gift,
  Key,
  Image,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu as MenuIcon,
  Move,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Layers,
  Truck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Database,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SidebarItemProps {
  icon: React.ReactNode;
  title: string;
  path: string;
  active: boolean;
  children?: { title: string; path: string }[];
  isCollapsed: boolean;
}

function SidebarItem({ icon, title, path, active, children, isCollapsed }: SidebarItemProps) {
  const [isOpen, setIsOpen] = useState(active);
  const hasChildren = children && children.length > 0;
  
  return (
    <div className="mb-1">
      {hasChildren ? (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-between w-full px-4 py-3 text-left rounded-md ${
              active
                ? 'bg-[#8B1F38]/10 text-[#8B1F38]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              {icon}
              {!isCollapsed && <span className="ml-3 font-medium">{title}</span>}
            </div>
            {!isCollapsed && (
              isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            )}
          </button>
          
          {isOpen && !isCollapsed && children && (
            <div className="ml-6 mt-1 space-y-1">
              {children.map((child, index) => (
                <Link
                  key={index}
                  to={child.path}
                  className={`block px-4 py-2 text-sm rounded-md ${
                    location.pathname === child.path
                      ? 'bg-[#8B1F38]/10 text-[#8B1F38]'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {child.title}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <Link
          to={path}
          className={`flex items-center px-4 py-3 rounded-md ${
            active
              ? 'bg-[#8B1F38]/10 text-[#8B1F38]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title={isCollapsed ? title : ""}
        >
          {icon}
          {!isCollapsed && <span className="ml-3 font-medium">{title}</span>}
        </Link>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Load collapsed state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);
  
  const menuItems = [
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      title: 'Tableau de bord',
      path: '/admin/dashboard',
      active: location.pathname === '/admin/dashboard',
    },
    {
      icon: <Package className="h-5 w-5" />,
      title: 'Catalogue',
      path: '/admin/products',
      active: location.pathname.includes('/admin/products') || 
              location.pathname.includes('/admin/categories') ||
              location.pathname.includes('/admin/menu-categories') ||
              location.pathname.includes('/admin/product-import'),
      children: [
        { title: 'Produits', path: '/admin/products' },
        { title: 'Catégories', path: '/admin/categories' },
        { title: 'Menus & Navigation', path: '/admin/menu-categories' },
        { title: 'Importation Produits', path: '/admin/product-import' },
      ],
    },
    {
      icon: <Truck className="h-5 w-5" />,
      title: 'Fournisseurs',
      path: '/admin/suppliers',
      active: location.pathname.includes('/admin/suppliers'),
    },
    {
      icon: <ShoppingCart className="h-5 w-5" />,
      title: 'Commandes',
      path: '/admin/orders',
      active: location.pathname.includes('/admin/orders'),
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'Clients',
      path: '/admin/users',
      active: location.pathname.includes('/admin/users'),
    },
    {
      icon: <Gift className="h-5 w-5" />,
      title: 'Chèques Cadeaux',
      path: '/admin/gift-cards',
      active: location.pathname.includes('/admin/gift-cards'),
      children: [
        { title: 'Chèques achetés', path: '/admin/gift-cards' },
        { title: 'Chèques reçus', path: '/admin/gift-cards/received' },
      ],
    },
    {
      icon: <Key className="h-5 w-5" />,
      title: 'Clés de réduction',
      path: '/admin/discount-keys',
      active: location.pathname.includes('/admin/discount-keys'),
    },
    {
      icon: <Image className="h-5 w-5" />,
      title: 'Médiathèque',
      path: '/admin/media',
      active: location.pathname.includes('/admin/media'),
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: 'Rapports',
      path: '/admin/reports',
      active: location.pathname.includes('/admin/reports'),
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: 'Rôles & Permissions',
      path: '/admin/roles',
      active: location.pathname.includes('/admin/roles'),
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: 'Paramètres',
      path: '/admin/settings',
      active: location.pathname.includes('/admin/settings'),
    },
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div 
      className={`bg-white h-screen shadow-sm flex-shrink-0 fixed left-0 top-0 overflow-y-auto transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-52'
      }`}
    >
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        {!isCollapsed && <h2 className="text-xl font-bold text-gray-900">Administration</h2>}
        <button 
          onClick={toggleSidebar}
          className={`p-1 rounded-full hover:bg-gray-100 ${isCollapsed ? 'mx-auto' : ''}`}
          aria-label={isCollapsed ? "Étendre le panneau" : "Réduire le panneau"}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>
      <div className="py-4 px-2">
        {menuItems.map((item, index) => (
          <SidebarItem
            key={index}
            icon={item.icon}
            title={item.title}
            path={item.path}
            active={item.active}
            children={item.children}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
    </div>
  );
}