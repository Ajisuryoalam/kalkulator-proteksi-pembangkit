'use client';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { CATEGORIES } from '../../lib/categories';
import { EQUIP } from '../../lib/equipment';

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

export default function CategoryGrid() {
  return (
    <div id="kategori">
      <div className="e-section-head">
        <h2>Pilih Kategori Kalkulator</h2>
      </div>
      <div className="e-cat-grid">
        {CATEGORIES.map(cat => {
          const Icon = Icons[cat.icon] || Icons.Folder;
          const c = COLOR_MAP[cat.color];
          const hasCalc = cat.equipKeys.length > 0;
          const firstKey = cat.equipKeys[0];
          const inner = (
            <>
              <div className="e-cat-icon" style={{ background: c.bg }}>
                <Icon size={22} color={c.fg} />
              </div>
              <h3>{cat.label}</h3>
              <p>{cat.desc}</p>
              <div className="e-cat-foot">
                {hasCalc ? (
                  <>
                    <span className="e-cat-count" style={{ color: c.fg }}>{cat.equipKeys.length} Kalkulator</span>
                    <Icons.ArrowRight size={16} color={c.fg} />
                  </>
                ) : (
                  <span className="e-cat-soon">Segera Hadir</span>
                )}
              </div>
            </>
          );
          return hasCalc ? (
            <Link href={`/kalkulator/${firstKey}`} className="e-cat-card" style={{ '--e-cat-accent': c.fg }} key={cat.key} id={cat.key}>
              {inner}
            </Link>
          ) : (
            <div className="e-cat-card" style={{ opacity: 0.72, cursor: 'default' }} key={cat.key} id={cat.key}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
