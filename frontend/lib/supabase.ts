import { createClient, SupabaseClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const rawKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

const supabaseUrl = rawUrl.trim();
const supabaseAnonKey = rawKey.trim();

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === "string" &&
    supabaseUrl.length > 0 &&
    !supabaseUrl.includes("your-project") &&
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.length > 0 &&
    !supabaseAnonKey.includes("your-anon-key")
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
