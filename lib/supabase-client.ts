import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from '@/lib/supabase-config';

const { url: supabaseUrl, publishableKey: supabaseKey } = getSupabasePublicConfig();

if (!supabaseUrl || !supabaseKey) {
	throw new Error('Supabase environment variables are not set!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
