'use client';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../AuthProvider';
import { supabaseConfigured } from '../../lib/supabaseClient';

export default function DashboardTopbar() {
  const { user, loading, signOut } = useAuth();

  return (
    <div className="e-topbar">
      <div className="e-search">
        <Icons.Search size={16} />
        <span>Cari perhitungan, alat, atau standar...</span>
        <kbd>Ctrl+K</kbd>
      </div>
      <div className="e-topbar-actions">
        <Icons.Bell size={18} color="#5B6472" />
        {!supabaseConfigured || loading ? (
          <div className="e-avatar"><Icons.User size={17} /></div>
        ) : user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12.5, color: 'var(--e-text-muted)' }}>{user.user_metadata?.full_name || user.email}</span>
            <button onClick={signOut} title="Keluar"
              style={{ background: 'none', border: '1px solid var(--e-border)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: 'var(--e-text-muted)' }}>
              <Icons.LogOut size={15} />
            </button>
          </div>
        ) : (
          <Link href="/masuk" style={{ background: 'linear-gradient(135deg,var(--e-brand-a),var(--e-brand-b))', color: '#fff', fontSize: 12.5, fontWeight: 600, padding: '8px 16px', borderRadius: 8 }}>
            Masuk
          </Link>
        )}
      </div>
    </div>
  );
}
