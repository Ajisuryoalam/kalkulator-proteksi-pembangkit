'use client';
import * as Icons from 'lucide-react';

export default function RecentAndFavorites() {
  return (
    <div className="e-two-col">
      <div className="e-panel">
        <div className="e-section-head" style={{ marginBottom: 8 }}>
          <h2>Perhitungan Terakhir</h2>
          <span className="e-link-muted">Lihat Semua</span>
        </div>
        <div className="e-empty">
          <Icons.History size={26} />
          <div>Belum ada riwayat perhitungan.<br />Mulai dari salah satu kalkulator di atas.</div>
        </div>
      </div>

      <div className="e-panel">
        <div className="e-section-head" style={{ marginBottom: 8 }}>
          <h2>Kalkulator Favorit</h2>
          <span className="e-link-muted">Kelola</span>
        </div>
        <div className="e-empty">
          <Icons.Star size={26} />
          <div>Belum ada favorit.<br />Tandai kalkulator yang sering Anda pakai.</div>
        </div>
      </div>
    </div>
  );
}
