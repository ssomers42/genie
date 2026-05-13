import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const url = (
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  extra.supabaseUrl ||
  ""
)
  .trim()
  .replace(/\/+$/, "");
const anon = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.supabaseAnonKey ||
  ""
).trim();

if (!url || !anon) {
  console.warn(
    "Missing Supabase URL or anon key. Set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (or VITE_* in .env.local via app.config.js).",
  );
} else if (__DEV__) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") {
      console.warn(
        `Supabase URL should use https (got ${u.protocol}). Requests may fail on device.`,
      );
    }
  } catch {
    console.warn(
      `EXPO_PUBLIC_SUPABASE_URL is not a valid URL: ${JSON.stringify(url)}`,
    );
  }
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function getSupabaseConfig() {
  return { url, anon };
}
