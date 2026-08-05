'use client';
import { useState } from 'react';
import { CURVES, CURVE_OPTIONS, timeAt, motorThermalTime, fmt } from '../lib/curves';
import { TCCAmpsChart } from './Charts';

const COLORS = ['#F0A830', '#4FD4D8', '#4ADE80', '#EF5350', '#B388FF', '#FFD166', '#6FCF97', '#F2994A'];
let motorId = 3, upId = 1;

const initialMotors = [
  { id: 0, name: 'Cooling Tower Fan (CVF)', ith: 21, tau: 28, theta0Pct: 80, idIth: 4.5, td: 6, pickupN: 0.5, tN: 0.5, color: COLORS[0] },
  { id: 1, name: 'Forced Draft Fan (FDF)', ith: 25, tau: 25, theta0Pct: 70, idIth: 5.0, td: 8, pickupN: 0.5, tN: 0.5, color: COLORS[1] },
  { id: 2, name: 'Boiler Feed Pump (BFP)', ith: 32, tau: 32, theta0Pct: 75, idIth: 4.8, td: 7, pickupN: 0.5, tN: 0.5, color: COLORS[2] },
];
const initialUpstream = [
  { id: 0, name: 'Feeder MCC / Incoming', pickup: 100, curve: 'IEC-VI', dial: 0.88, color: COLORS[3] },
];

export default function MotorGrading() {
  const [motors, setMotors] = useState(initialMotors);
  const [upstream, setUpstream] = useState(initialUpstream);
  const [evalA, setEvalA] = useState(300);
  const [cti, setCti] = useState(0.3);
  const [result, setResult] = useState(null);

  function updMotor(id, f, v) {
    setMotors(prev => prev.map(m => m.id === id ? { ...m, [f]: ['name'].includes(f) ? v : parseFloat(v) } : m));
  }
  function addMotor() {
    setMotors(prev => [...prev, { id: motorId++, name: 'Motor baru', ith: 5, tau: 25, theta0Pct: 70, idIth: 5, td: 8, pickupN: 0.5, tN: 0.5, color: COLORS[prev.length % COLORS.length] }]);
  }
  function removeMotor(id) { setMotors(prev => prev.filter(m => m.id !== id)); }

  function updUp(id, f, v) {
    setUpstream(prev => prev.map(u => u.id === id ? { ...u, [f]: f === 'name' || f === 'curve' ? v : parseFloat(v) } : u));
  }
  function addUpstream() {
    setUpstream(prev => [...prev, { id: upId++, name: 'Upstream baru', pickup: 40, curve: 'IEC-VI', dial: 0.3, color: COLORS[(prev.length + motors.length) % COLORS.length] }]);
  }
  function removeUp(id) { setUpstream(prev => prev.filter(u => u.id !== id)); }

  function hitung() {
    const motorRes = motors.map(m => {
      const theta0 = m.theta0Pct / 100;
      const M = evalA / m.ith;
      const tThermal = motorThermalTime(M, theta0, m.tau);
      const pickupLR = m.idIth * m.ith;
      return { ...m, M, tThermal, pickupLR };
    });
    const upRes = upstream.map(u => {
      const M = evalA / u.pickup;
      const t = timeAt(u.curve, u.dial, M);
      return { ...u, M, t };
    });

    const combined = [
      ...motorRes.map(m => ({ name: `${m.name} (49 Thermal)`, t: m.tThermal })),
      ...upRes.map(u => ({ name: u.name, t: u.t })),
    ].sort((a, b) => a.t - b.t);
    const margins = [];
    for (let i = 1; i < combined.length; i++) {
      const mrg = combined[i].t - combined[i - 1].t;
      margins.push({ ok: mrg >= cti, a: combined[i - 1].name, b: combined[i].name, m: mrg });
    }

    const curves = [];
    motorRes.forEach(m => {
      const theta0 = m.theta0Pct / 100;
      curves.push({
        pickup: m.ith, color: m.color, label: `${m.name} — 49 Thermal (τ=${m.tau}mnt, θ0=${m.theta0Pct}%)`,
        timeFn: I => motorThermalTime(I / m.ith, theta0, m.tau),
      });
      curves.push({
        pickup: m.pickupLR, color: m.color, dashed: true, label: `${m.name} — 51LR (Id/Ith=${m.idIth}×, Td=${m.td}s)`,
        timeFn: I => I >= m.pickupLR ? m.td : Infinity,
      });
    });
    upRes.forEach(u => {
      curves.push({ pickup: u.pickup, curveKey: u.curve, dial: u.dial, color: u.color, label: `${u.name} (${CURVES[u.curve].name})` });
    });

    setResult({ motorRes, upRes, margins, curves });
  }

  return (
    <div>
      <div className="card">
        <h2>Grading TCC Proteksi Motor (49 Thermal / 51LR)</h2>
        <div className="desc">
          Overlay kurva thermal replica (IEC 60255-8) dan locked rotor beberapa motor sekaligus, opsional dibandingkan terhadap proteksi feeder/incoming MCC di atasnya.
        </div>
        <div className="result-note" style={{ marginBottom: 16 }}>
          <b style={{ color: 'var(--text)' }}>Penting:</b> Ith motor biasanya nilai sisi sekunder CT motor itu sendiri, sedangkan pickup feeder/incoming direferensikan ke CT-nya sendiri yang bisa beda rasio. Supaya arus evaluasi &amp; grading di bawah bermakna, pastikan semua nilai (Ith motor, pickup upstream, arus evaluasi) sudah direferensikan ke basis arus yang sama — misalnya arus primer/sisi sistem, bukan langsung dicampur dari sekunder CT yang rasionya beda.
        </div>

        <div className="coord-head-row" style={{ gridTemplateColumns: '1.3fr 0.7fr 0.7fr 0.7fr 0.7fr 0.6fr 34px' }}>
          <div className="coord-head">Motor</div>
          <div className="coord-head">Ith (A)</div>
          <div className="coord-head">τ (menit)</div>
          <div className="coord-head">θ0 (%)</div>
          <div className="coord-head">Id/Ith (51LR)</div>
          <div className="coord-head">Td 51LR (s)</div>
          <div></div>
        </div>
        {motors.map(m => (
          <div className="coord-row" style={{ gridTemplateColumns: '1.3fr 0.7fr 0.7fr 0.7fr 0.7fr 0.6fr 34px' }} key={m.id}>
            <input className="coord-input" type="text" value={m.name} onChange={e => updMotor(m.id, 'name', e.target.value)} />
            <input className="coord-input" type="number" step="0.1" value={m.ith} onChange={e => updMotor(m.id, 'ith', e.target.value)} />
            <input className="coord-input" type="number" step="1" value={m.tau} onChange={e => updMotor(m.id, 'tau', e.target.value)} />
            <input className="coord-input" type="number" step="1" value={m.theta0Pct} onChange={e => updMotor(m.id, 'theta0Pct', e.target.value)} />
            <input className="coord-input" type="number" step="0.1" value={m.idIth} onChange={e => updMotor(m.id, 'idIth', e.target.value)} />
            <input className="coord-input" type="number" step="0.5" value={m.td} onChange={e => updMotor(m.id, 'td', e.target.value)} />
            <button className="coord-remove" onClick={() => removeMotor(m.id)}>×</button>
          </div>
        ))}
        <button className="btn-secondary" onClick={addMotor} style={{ marginTop: 6 }}>+ Tambah Motor</button>

        <div className="result-note" style={{ margin: '16px 0' }}>
          Rumus thermal (IEC 60255-8): t = τ × ln[(M² − θ0)/(M² − 1)], dengan M = I/Ith. 51LR ditampilkan sebagai definite-time (garis putus-putus) mulai dari pickup Id/Ith × Ith.
        </div>

        <h2 style={{ marginTop: 4 }}>Upstream (Feeder / Incoming MCC) — opsional</h2>
        <div className="coord-head-row" style={{ gridTemplateColumns: '1.6fr 1fr 1.9fr 0.9fr 34px' }}>
          <div className="coord-head">Nama</div>
          <div className="coord-head">Pickup (A)</div>
          <div className="coord-head">Standar &amp; Kurva</div>
          <div className="coord-head">TMS/TD</div>
          <div></div>
        </div>
        {upstream.map(u => (
          <div className="coord-row" style={{ gridTemplateColumns: '1.6fr 1fr 1.9fr 0.9fr 34px' }} key={u.id}>
            <input className="coord-input" type="text" value={u.name} onChange={e => updUp(u.id, 'name', e.target.value)} />
            <input className="coord-input" type="number" step="1" value={u.pickup} onChange={e => updUp(u.id, 'pickup', e.target.value)} />
            <select className="coord-input" value={u.curve} onChange={e => updUp(u.id, 'curve', e.target.value)}>
              {CURVE_OPTIONS.map(o => <option value={o.value} key={o.value}>{o.label}</option>)}
            </select>
            <input className="coord-input" type="number" step="0.01" value={u.dial} onChange={e => updUp(u.id, 'dial', e.target.value)} />
            <button className="coord-remove" onClick={() => removeUp(u.id)}>×</button>
          </div>
        ))}
        <button className="btn-secondary" onClick={addUpstream} style={{ marginTop: 6 }}>+ Tambah Upstream</button>

        <div className="grid-inputs" style={{ marginTop: 16 }}>
          <div className="field"><label>Arus Evaluasi <span className="unit">(A)</span></label>
            <input type="number" step="0.1" value={evalA} onChange={e => setEvalA(parseFloat(e.target.value))} /></div>
          <div className="field"><label>CTI Minimum <span className="unit">(detik)</span></label>
            <input type="number" step="0.01" value={cti} onChange={e => setCti(parseFloat(e.target.value))} /></div>
        </div>
        <button className="btn-calc" onClick={hitung}>Hitung &amp; Plot Grading</button>
      </div>

      {result && (
        <>
          <div className="card">
            <h2>Waktu Trip @ Arus Evaluasi &amp; Cek Grading</h2>
            <div className="result-group">
              <div className="result-group-title">Thermal (49) — per Motor</div>
              {result.motorRes.map(m => (
                <div className="result-row" key={m.id}>
                  <div><div className="result-label">{m.name}</div>
                    <div className="result-formula">M = {fmt(m.M, 2)}× &nbsp;|&nbsp; Pickup 51LR = {fmt(m.pickupLR, 2)} A @ {fmt(m.td, 1)}s</div></div>
                  <div className="result-value">{fmt(m.tThermal, 2)}<span className="u">s</span></div>
                </div>
              ))}
            </div>
            {result.upRes.length > 0 && (
              <div className="result-group">
                <div className="result-group-title">Upstream</div>
                {result.upRes.map(u => (
                  <div className="result-row" key={u.id}>
                    <div><div className="result-label">{u.name}</div><div className="result-formula">M = {fmt(u.M, 2)}×</div></div>
                    <div className="result-value">{fmt(u.t, 2)}<span className="u">s</span></div>
                  </div>
                ))}
              </div>
            )}
            <div className="result-group">
              <div className="result-group-title">Cek Grading (urut tercepat → terlambat)</div>
              {result.margins.map((mg, i) => (
                <div key={i} className={mg.ok ? 'flag-ok' : 'flag-warn'}>
                  {mg.a} → {mg.b}: margin {fmt(mg.m, 3)}s {mg.ok ? '— memenuhi CTI.' : `— KURANG dari CTI minimum ${fmt(cti, 2)}s.`}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Overlay TCC — Thermal (49) + Locked Rotor (51LR) + Upstream</h2>
            <div className="chart-wrap"><TCCAmpsChart curves={result.curves} evalA={evalA} /></div>
            <div className="chart-legend">
              {result.curves.map((c, i) => (
                <div className="legend-item" key={i}><span className="swatch" style={{ background: c.color, opacity: c.dashed ? 0.7 : 1 }} />{c.label}</div>
              ))}
            </div>
            <div className="disclaimer">
              Model thermal ini mengasumsikan single time-constant (IEC 60255-8) tanpa memperhitungkan perbedaan konstanta panas-dingin (k-factor cooling saat motor berhenti) atau kompensasi suhu ambient/RTD — relay motor protection komersial (Schneider, ABB, SEL, dll.) sering punya model lebih detail. Gunakan hasil ini sebagai verifikasi awal, bandingkan dengan manual relay yang sesungguhnya dipakai.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
