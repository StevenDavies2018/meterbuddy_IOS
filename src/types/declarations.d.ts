declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '@/global.css';

declare const process: {
  env: {
    EXPO_OS?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?: string;
  };
};
