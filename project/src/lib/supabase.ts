import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'defined' : 'missing',
    key: supabaseAnonKey ? 'defined' : 'missing'
  });
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'supabase.auth.token'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.39.7'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
   },
  functions: {
    url: 'https://hxtgwezcgwrvjdxiumpv.functions.supabase.co'
  }
});

// Configure default error handler
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear any stored auth data
    localStorage.removeItem('supabase.auth.token');
  }
});

// Add a simple health check function
const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('Supabase connection check failed:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase connection check exception:', err);
    return false;
  }
};

// Run a connection check on startup
checkSupabaseConnection().then(isConnected => {
  if (!isConnected) {
    console.warn('Initial Supabase connection check failed. Some features may not work correctly.');
  }
});