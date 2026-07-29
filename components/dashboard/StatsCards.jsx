'use client';
import * as Icons from 'lucide-react';

const STATS = [
  { label: 'Total Perhitungan', value: '0', sub: 'Mulai hitung untuk melihat statistik', icon: 'Calculator', bg: '#E8EEFE', fg: '#2451F5' },
  { label: 'Perhitungan Aman', value: '0', sub: 'Belum ada data', icon: 'ShieldCheck', bg: '#E4F7EA', fg: '#16A34A' },
  { label: 'Waktu Rata-rata', value: '—', sub: 'Belum ada data', icon: 'Clock', bg: '#F0E9FE', fg: '#7C3AED' },
  { label: 'Favorit', value: '0', sub: 'Tandai kalkulator favorit Anda', icon: 'Star', bg: '#FFF1E0', fg: '#EA580C' },
];

export default function StatsCards() {
  return (
    <div className="e-stats">
      {STATS.map(s => {
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
