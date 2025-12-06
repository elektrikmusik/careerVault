import { createClient } from '@supabase/supabase-js';

// Helper to get config from Env or LocalStorage
const getSupabaseConfig = () => {
  const envUrl = process.env.SUPABASE_URL;
  const envKey = process.env.SUPABASE_KEY;
  
  // Environment variables take precedence
  if (envUrl && envKey) {
    return { url: envUrl, key: envKey, source: 'env' };
  }

  // Fallback to local storage (user entered)
  const localUrl = window.localStorage.getItem('careerflow_sb_url');
  const localKey = window.localStorage.getItem('careerflow_sb_key');

  return { url: localUrl, key: localKey, source: 'local' };
};

const config = getSupabaseConfig();

export const supabase = (config.url && config.key) 
  ? createClient(config.url, config.key) 
  : null;

export const isSupabaseConfigured = () => !!supabase;
export const isSupabaseFromEnv = () => config.source === 'env';

export const updateSupabaseConfig = (url: string, key: string) => {
  window.localStorage.setItem('careerflow_sb_url', url);
  window.localStorage.setItem('careerflow_sb_key', key);
  window.location.reload(); // Reload to re-initialize client
};

export const clearSupabaseConfig = () => {
  window.localStorage.removeItem('careerflow_sb_url');
  window.localStorage.removeItem('careerflow_sb_key');
  window.location.reload();
};