import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// supabase bernilai null kalau env var belum diisi, supaya halaman tetap jalan
// (menampilkan status kosong) sebelum kredensial Supabase disambungkan.
export const supabase = supabaseConfigured ? createClient(url, anonKey) : null;
