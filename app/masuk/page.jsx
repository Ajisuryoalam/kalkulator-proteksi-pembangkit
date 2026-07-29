'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, supabaseConfigured } from '../../lib/supabaseClient';
import '../dashboard.css';

export default function MasukPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!supabaseConfigured) { setError('Supabase belum dikonfigurasi.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="enginova" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="e-panel" style={{ width: 380 }}>
        <h2 style={{ marginBottom: 4 }}>Masuk ke Enginova</h2>
        <p style={{ fontSize: 12.5, color: 'var(--e-text-muted)', marginBottom: 18 }}>Masuk untuk menyimpan riwayat dan favorit perhitungan Anda.</p>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--e-text-muted)', display: 'block', marginBottom: 5 }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--e-border)', borderRadius: 8 }} />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--e-text-muted)', display: 'block', marginBottom: 5 }}>Kata Sandi</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--e-border)', borderRadius: 8 }} />
          </div>
          {error && <div style={{ color: '#DC2626', fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,var(--e-brand-a),var(--e-brand-b))', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        <p style={{ fontSize: 12.5, color: 'var(--e-text-muted)', marginTop: 16, textAlign: 'center' }}>
          Belum punya akun? <Link href="/daftar" style={{ color: 'var(--e-blue)', fontWeight: 600 }}>Daftar</Link>
        </p>
      </div>
    </div>
  );
}
