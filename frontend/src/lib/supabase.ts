import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials not found in environment variables. Auth and database queries will fail.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
