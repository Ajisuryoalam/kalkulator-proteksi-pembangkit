import Link from 'next/link';
import * as Icons from 'lucide-react';
import { notFound } from 'next/navigation';
import '../../dashboard.css';
import { CATEGORIES } from '../../../lib/categories';
import { EQUIP } from '../../../lib/equipment';
import DashboardSidebar from '../../../components/dashboard/DashboardSidebar';
import DashboardTopbar from '../../../components/dashboard/DashboardTopbar';

export function generateStaticParams() {
  return CATEGORIES.map(c => ({ key: c.key }));
}

const COLOR_MAP = {
  blue: { bg: '#E8EEFE', fg: '#2451F5' },
  green: { bg: '#E4F7EA', fg: '#16A34A' },
  purple: { bg: '#F0E9FE', fg: '#7C3AED' },
  orange: { bg: '#FFF1E0', fg: '#EA580C' },
  teal: { bg: '#DEF5F1', fg: '#0D9488' },
  sky: { bg: '#E1F2FC', fg: '#0284C7' },
  slate: { bg: '#EAEDF1', fg: '#475569' },
  gray: { bg: '#EEF0F2', fg: '#6B7280' },
};

export default function KategoriPage({ params }) {
  const cat = CATEGORIES.find(c => c.key === params.key);
  if (!cat) return notFound();
  const c = COLOR_MAP[cat.color];
  const Icon = Icons[cat.icon] || Icons.Folder;
  const calculators = cat.equipKeys.map(k => ({ key: k, equip: EQUIP[k] })).filter(c => c.equip);

  return (
    <div className="enginova">
      <div className="e-shell">
        <DashboardSidebar />
        <div>
          <DashboardTopbar />
          <div className="e-main">
            <Link href="/dashboard" className="e-link-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Icons.ArrowLeft size={14} /> Kembali ke Dashboard
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              <div className="e-cat-icon" style={{ background: c.bg, marginBottom: 0 }}>
                <Icon size={24} color={c.fg} />
              </div>
              <div>
                <h1 style={{ fontFamily: 'IBM Plex Sans Condensed', fontSize: 22, fontWeight: 700, margin: 0 }}>{cat.label}</h1>
                <p style={{ color: 'var(--e-text-muted)', fontSize: 13, margin: '2px 0 0' }}>{cat.desc}</p>
              </div>
            </div>

            {calculators.length === 0 ? (
              <div className="e-panel">
                <div className="e-empty">
                  <Icons.Hourglass size={26} />
                  <div>Kalkulator untuk kategori ini <b>segera hadir</b>.<br />Sementara ini, coba kategori lain di sidebar.</div>
                </div>
              </div>
            ) : (
              <div className="e-cat-grid">
                {calculators.map(({ key, equip }) => (
                  <Link href={`/kalkulator/${key}`} className="e-cat-card" style={{ '--e-cat-accent': c.fg }} key={key}>
                    <div className="e-cat-icon" style={{ background: c.bg }}>
                      <Icons.Calculator size={20} color={c.fg} />
                    </div>
                    <h3>{equip.title || equip.label}</h3>
                    <p>{equip.desc || equip.dev}</p>
                    <div className="e-cat-foot">
                      <span className="e-cat-count" style={{ color: c.fg }}>{equip.dev}</span>
                      <Icons.ArrowRight size={16} color={c.fg} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
