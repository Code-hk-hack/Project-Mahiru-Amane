import { createClient } from '@supabase/supabase-js';

// Hardcoded fallbacks for the hackathon deployment
const HACKATHON_SUPABASE_URL = 'https://wbngduousdonvxzlogbx.supabase.co';
const HACKATHON_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndibmdkdW91c2RvbnZ4emxvZ2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDA3MTMsImV4cCI6MjA5OTYxNjcxM30.3Yj8fDr4NsxeA6YeAQFkDmyBy2eBP4E1gIAp2gQUaSY';

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}
if (!supabaseUrl) {
  supabaseUrl = HACKATHON_SUPABASE_URL;
}

const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim() || HACKATHON_SUPABASE_ANON_KEY;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials not found in environment variables. Auth and database queries will fail.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
