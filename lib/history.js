import { supabase, supabaseConfigured } from './supabaseClient';

export async function logCalculation(userId, { equipKey, equipLabel, summary, inputSnapshot }) {
  if (!supabaseConfigured || !userId) return;
  try {
    await supabase.from('calculation_history').insert({
      user_id: userId, equip_key: equipKey, equip_label: equipLabel,
      summary: summary || null, input_snapshot: inputSnapshot || null,
    });
  } catch (e) {
    // Diam-diam gagal — jangan ganggu pengalaman menghitung kalau logging bermasalah.
    console.error('Gagal menyimpan riwayat:', e);
  }
}

export async function fetchRecentHistory(userId, limit = 5) {
  if (!supabaseConfigured || !userId) return [];
  const { data, error } = await supabase
    .from('calculation_history')
    .select('id, equip_key, equip_label, summary, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function fetchHistoryCount(userId) {
  if (!supabaseConfigured || !userId) return 0;
  const { count, error } = await supabase
    .from('calculation_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) { console.error(error); return 0; }
  return count || 0;
}

export async function fetchFavorites(userId) {
  if (!supabaseConfigured || !userId) return [];
  const { data, error } = await supabase
    .from('favorites')
    .select('equip_key, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function toggleFavorite(userId, equipKey, isFavorite) {
  if (!supabaseConfigured || !userId) return;
  if (isFavorite) {
    await supabase.from('favorites').delete().eq('user_id', userId).eq('equip_key', equipKey);
  } else {
    await supabase.from('favorites').insert({ user_id: userId, equip_key: equipKey });
  }
}

export function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'kemarin';
  return `${day} hari lalu`;
}
