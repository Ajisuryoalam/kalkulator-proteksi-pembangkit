'use client';
import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../AuthProvider';
import { fetchRecentHistory, fetchFavorites, relativeTime } from '../../lib/history';
import { EQUIP } from '../../lib/equipment';

export default function RecentAndFavorites() {
  const { user } = useAuth();
  const [recent, setRecent] = useState([]);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!user) { setRecent([]); setFavorites([]); return; }
    fetchRecentHistory(user.id, 5).then(setRecent);
    fetchFavorites(user.id).then(setFavorites);
  }, [user]);

  return (
    <div className="e-two-col">
      <div className="e-panel">
        <div className="e-section-head" style={{ marginBottom: 8 }}>
          <h2>Perhitungan Terakhir</h2>
        </div>
        {!user ? (
          <div className="e-empty">
            <Icons.History size={26} />
            <div><Link href="/masuk" style={{ color: 'var(--e-blue)', fontWeight: 600 }}>Masuk</Link> untuk mulai menyimpan riwayat perhitungan Anda.</div>
          </div>
        ) : recent.length === 0 ? (
          <div className="e-empty">
            <Icons.History size={26} />
            <div>Belum ada riwayat perhitungan.<br />Mulai dari salah satu kalkulator di atas.</div>
          </div>
        ) : (
          recent.map(r => (
            <div className="e-list-row" key={r.id}>
              <div className="e-list-icon" style={{ background: '#E8EEFE' }}><Icons.Calculator size={16} color="#2451F5" /></div>
              <div>
                <div className="e-list-title">{r.equip_label}</div>
                {r.summary && <div className="e-list-sub">{r.summary}</div>}
              </div>
              <div className="e-list-time">{relativeTime(r.created_at)}</div>
            </div>
          ))
        )}
      </div>

      <div className="e-panel">
        <div className="e-section-head" style={{ marginBottom: 8 }}>
          <h2>Kalkulator Favorit</h2>
        </div>
        {!user ? (
          <div className="e-empty">
            <Icons.Star size={26} />
            <div><Link href="/masuk" style={{ color: 'var(--e-blue)', fontWeight: 600 }}>Masuk</Link> untuk menandai kalkulator favorit Anda.</div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="e-empty">
            <Icons.Star size={26} />
            <div>Belum ada favorit.<br />Tandai kalkulator yang sering Anda pakai.</div>
          </div>
        ) : (
          favorites.map(f => {
            const equip = EQUIP[f.equip_key];
            if (!equip) return null;
            return (
              <Link href={`/kalkulator/${f.equip_key}`} className="e-list-row" key={f.equip_key} style={{ cursor: 'pointer' }}>
                <div className="e-list-icon" style={{ background: '#FFF1E0' }}><Icons.Star size={16} color="#EA580C" /></div>
                <div className="e-list-title">{equip.label}</div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
