import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SiteSetting {
  id: string;
  key: string;
  value: any;
  label: string;
  description: string | null;
  type: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface SettingsContextType {
  settings: Record<string, any>;
  isLoading: boolean;
  error: Error | null;
  updateSetting: (key: string, value: any) => Promise<void>;
  refreshSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  isLoading: false,
  error: null,
  updateSetting: async () => {},
  refreshSettings: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  // Fetch settings from Supabase
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('is_public', true);
        
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Transform settings array to key-value object
  const transformedSettings = data?.reduce((acc, setting) => {
    try {
      // Handle different value types based on the setting type
      if (setting.type === 'json' && typeof setting.value === 'string') {
        // Only parse if it's explicitly a JSON type
        acc[setting.key] = JSON.parse(setting.value);
      } else if (typeof setting.value === 'object') {
        // If it's already an object, use it as is
        acc[setting.key] = setting.value;
      } else {
        // For all other types, use the value directly
        acc[setting.key] = setting.value;
      }
    } catch (err) {
      console.error(`Error parsing setting ${setting.key}:`, err);
      // Fallback to raw value if parsing fails
      acc[setting.key] = setting.value;
    }
    return acc;
  }, {} as Record<string, any>) || {};
  
  // Setup real-time subscription for settings changes
  useEffect(() => {
    const settingsSubscription = supabase
      .channel('site-settings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'site_settings'
      }, () => {
        console.log('Settings changed, refreshing data...');
        queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(settingsSubscription);
    };
  }, [queryClient]);
  
  // Update a setting
  const updateSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ value })
        .eq('key', key);
        
      if (error) throw error;
      
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (err) {
      console.error('Error updating setting:', err);
      throw err;
    }
  };
  
  return (
    <SettingsContext.Provider
      value={{
        settings: transformedSettings,
        isLoading,
        error,
        updateSetting,
        refreshSettings: () => refetch(),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}