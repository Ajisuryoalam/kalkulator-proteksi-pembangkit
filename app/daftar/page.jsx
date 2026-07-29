'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, supabaseConfigured } from '../../lib/supabaseClient';
import '../dashboard.css';

export default function DaftarPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!supabaseConfigured) { setError('Supabase belum dikonfigurasi.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name } }
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="enginova" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="e-panel" style={{ width: 380, textAlign: 'center' }}>
          <h2>Cek email Anda</h2>
          <p style={{ fontSize: 13, color: 'var(--e-text-muted)' }}>Kami sudah kirim tautan konfirmasi ke <b>{email}</b>. Klik tautan itu untuk mengaktifkan akun, lalu kembali ke halaman <Link href="/masuk" style={{ color: 'var(--e-blue)' }}>Masuk</Link>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enginova" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="e-panel" style={{ width: 380 }}>
        <h2 style={{ marginBottom: 4 }}>Daftar Akun Enginova</h2>
        <p style={{ fontSize: 12.5, color: 'var(--e-text-muted)', marginBottom: 18 }}>Gratis — untuk menyimpan riwayat dan favorit perhitungan Anda.</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--e-text-muted)', display: 'block', marginBottom: 5 }}>Nama</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--e-border)', borderRadius: 8 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--e-text-muted)', display: 'block', marginBottom: 5 }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--e-border)', borderRadius: 8 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--e-text-muted)', display: 'block', marginBottom: 5 }}>Kata Sandi</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--e-border)', borderRadius: 8 }} />
          </div>
          {error && <div style={{ color: '#DC2626', fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,var(--e-brand-a),var(--e-brand-b))', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>
        <p style={{ fontSize: 12.5, color: 'var(--e-text-muted)', marginTop: 16, textAlign: 'center' }}>
          Sudah punya akun? <Link href="/masuk" style={{ color: 'var(--e-blue)', fontWeight: 600 }}>Masuk</Link>
        </p>
      </div>
    </div>
  );
}
