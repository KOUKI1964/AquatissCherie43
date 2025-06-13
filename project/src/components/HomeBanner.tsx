import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowRight } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  location: string;
  type: string;
  is_active: boolean;
  priority: number;
}

export function HomeBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBanner();
  }, []);

  const fetchBanner = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('site_banners')
        .select('id, title, content, image_url, link_url, location, type, is_active, priority')
        .eq('location', 'home_hero')
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
          .select('id, title, content, image_url, link_url, location, type, is_active, priority')
          .eq('location', 'home_hero')
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
    } catch (error: any) {
      console.error('Error fetching banner:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="relative h-[600px] bg-gray-200 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#8B1F38] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !banner) {
    // Fallback banner
    return (
      <div className="relative">
        <div className="absolute inset-0">
          <img
            className="w-full h-[600px] object-cover"
            src="https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
            alt="Collection de mode"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-serif font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Collection Printemps 2025
          </h1>
          <p className="mt-6 text-xl text-white max-w-3xl">
            Découvrez notre nouvelle collection d'accessoires élégants pour sublimer votre style
          </p>
          <div className="mt-10">
            <Link
              to="/nouveautes"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50"
            >
              Découvrir la collection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute inset-0">
        <img
          className="w-full h-[600px] object-cover"
          src={banner.image_url || "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"}
          alt={banner.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80";
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>
      <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {banner.title}
        </h1>
        {banner.content && (
          <p className="mt-6 text-xl text-white max-w-3xl">
            {banner.content}
          </p>
        )}
        {banner.link_url && (
          <div className="mt-10">
            <Link
              to={banner.link_url}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50"
            >
              Découvrir <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}