import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js/dist/index.cjs';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://xptwcqxdqdsnkgkbsewd.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdHdjcXhkcWRzbmtna2JzZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTYzNTAsImV4cCI6MjA5NTE3MjM1MH0.xGSvKi9HzSvl0AFajLDDBOQg-igHJDEX4nw7fudY5Mk';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.');
}

const hasWindow = typeof window !== 'undefined';
const isWeb = Platform.OS === 'web';

const webStorageAdapter = {
  getItem: async (key: string) => {
    if (!hasWindow) return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (!hasWindow) return;
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (!hasWindow) return;
    window.localStorage.removeItem(key);
  },
};

const noopStorageAdapter = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

const storage = isWeb ? (hasWindow ? webStorageAdapter : noopStorageAdapter) : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: !isWeb || hasWindow,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
