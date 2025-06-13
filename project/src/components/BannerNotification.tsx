import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  content: string | null;
  link_url: string | null;
  type: string;
}

interface BannerNotificationProps {
  location: string;
}

export function BannerNotification({ location }: BannerNotificationProps) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBanner();
  }, [location]);

  const fetchBanner = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('site_banners')
        .select('id, title, content, link_url, type')
        .eq('location', location)
        .eq('type', 'notification')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // If no banner with date constraints, try to get one without date constraints
      if (!data) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('site_banners')
          .select('id, title, content, link_url, type')
          .eq('location', location)
          .eq('type', 'notification')
          .eq('is_active', true)
          .is('start_date', null)
          .is('end_date', null)
          .order('priority', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (fallbackError) throw fallbackError;
        setBanner(fallbackData);
      } else {
        setBanner(data);
      }

      // Check if this banner was dismissed before
      const dismissedBanners = JSON.parse(localStorage.getItem('dismissedBanners') || '[]');
      if (data && dismissedBanners.includes(data.id)) {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error fetching banner:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    if (banner) {
      // Save dismissed banner ID to localStorage
      const dismissedBanners = JSON.parse(localStorage.getItem('dismissedBanners') || '[]');
      dismissedBanners.push(banner.id);
      localStorage.setItem('dismissedBanners', JSON.stringify(dismissedBanners));
    }
    setIsVisible(false);
  };

  if (isLoading || !banner || !isVisible) {
    return null;
  }

  return (
    <div className="bg-[#8B1F38] text-white">
      <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-[#7A1B31]">
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </span>
            <p className="ml-3 font-medium truncate">
              <span className="md:hidden">{banner.title}</span>
              <span className="hidden md:inline">{banner.title}{banner.content ? ` - ${banner.content}` : ''}</span>
            </p>
          </div>
          {banner.link_url && (
            <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
              <a
                href={banner.link_url}
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-[#8B1F38] bg-white hover:bg-gray-50"
              >
                En savoir plus
              </a>
            </div>
          )}
          <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="-mr-1 flex p-2 rounded-md hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-white sm:-mr-2"
            >
              <span className="sr-only">Fermer</span>
              <X className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}