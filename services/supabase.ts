import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://molbfpxzmsgkknupdbnp.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable__r4-4HJ0nrMQrBEQgyGI8A_IgD2IKuf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
