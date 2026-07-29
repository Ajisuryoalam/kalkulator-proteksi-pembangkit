'use client';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { CATEGORIES } from '../../lib/categories';
import { EQUIP } from '../../lib/equipment';

export default function DashboardSidebar() {
  const totalCalc = CATEGORIES.reduce((n, c) => n + c.equipKeys.length, 0);
  return (
    <aside className="e-sidebar">
      <div className="e-brand">
        <div className="e-brand-mark"><Icons.Zap size={18} color="#fff" strokeWidth={2.4} /></div>
        <div>
          <div className="e-brand-name">ENGINOVA</div>
          <div className="e-brand-tag">Engineering · Innovation · Power</div>
        </div>
      </div>

      <div>
        <Link href="/dashboard" className="e-navlink active">
          <Icons.LayoutDashboard size={16} /> Dashboard
        </Link>
      </div>

      <div>
        <div className="e-navgroup-label">Kategori</div>
        {CATEGORIES.map(cat => {
          const Icon = Icons[cat.icon] || Icons.Folder;
          return (
            <Link href={`/kategori/${cat.key}`} className="e-navlink" key={cat.key}>
              <Icon size={16} /> {cat.label}
            </Link>
          );
        })}
      </div>

      <div>
        <div className="e-navgroup-label">Lainnya</div>
        <div className="e-navlink"><Icons.Star size={16} /> Favorit</div>
        <div className="e-navlink"><Icons.History size={16} /> Riwayat</div>
        <div className="e-navlink"><Icons.Settings size={16} /> Pengaturan</div>
        <div className="e-navlink"><Icons.Info size={16} /> Tentang Enginova</div>
      </div>

      <div className="e-sidebar-footer">
        <b>Powering Smarter Decisions</b>
        for a Safer Tomorrow
      </div>
      <div className="e-sidebar-version">© {new Date().getFullYear()} Enginova · {totalCalc} kalkulator aktif</div>
    </aside>
  );
}
