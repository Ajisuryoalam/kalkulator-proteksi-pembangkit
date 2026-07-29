'use client';
import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { fetchHistoryCount, fetchFavorites } from '../../lib/history';

export default function StatsCards() {
  const { user } = useAuth();
  const [totalCalc, setTotalCalc] = useState(null);
  const [favCount, setFavCount] = useState(null);

  useEffect(() => {
    if (!user) { setTotalCalc(null); setFavCount(null); return; }
    fetchHistoryCount(user.id).then(setTotalCalc);
    fetchFavorites(user.id).then(list => setFavCount(list.length));
  }, [user]);

  const stats = [
    {
      label: 'Total Perhitungan',
      value: user ? String(totalCalc ?? '…') : '0',
      sub: user ? 'Sepanjang waktu' : 'Masuk untuk mulai mencatat',
      icon: 'Calculator', bg: '#E8EEFE', fg: '#2451F5',
    },
    {
      label: 'Perhitungan Aman',
      value: '—',
      sub: 'Segera hadir',
      icon: 'ShieldCheck', bg: '#E4F7EA', fg: '#16A34A',
    },
    {
      label: 'Waktu Rata-rata',
      value: '—',
      sub: 'Segera hadir',
      icon: 'Clock', bg: '#F0E9FE', fg: '#7C3AED',
    },
    {
      label: 'Favorit',
      value: user ? String(favCount ?? '…') : '0',
      sub: user ? 'Kalkulator ditandai' : 'Masuk untuk menandai favorit',
      icon: 'Star', bg: '#FFF1E0', fg: '#EA580C',
    },
  ];

  return (
    <div className="e-stats">
      {stats.map(s => {
        const Icon = Icons[s.icon];
        return (
          <div className="e-stat-card" key={s.label}>
            <div className="e-stat-icon" style={{ background: s.bg }}>
              <Icon size={20} color={s.fg} />
            </div>
            <div>
              <div className="e-stat-label">{s.label}</div>
              <div className="e-stat-value">{s.value}</div>
              <div className="e-stat-sub">{s.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
