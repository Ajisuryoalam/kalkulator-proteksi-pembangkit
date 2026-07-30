'use client';
import { useState } from 'react';
import { CURVES, CURVE_OPTIONS, timeAt, fmt } from '../lib/curves';
import { TCCAmpsChart } from './Charts';

const COORD_COLORS = ['#F0A830', '#4FD4D8', '#4ADE80', '#EF5350', '#B388FF', '#FFD166'];
let idCounter = 3;

const initialRows = [
  { id: 0, kind: 'incoming', name: 'Incoming (dari Trafo)', fla: 288.7, pickup51: 350, dial51: 0.87, dialN: 0.17, curve: 'IEC-VI', color: COORD_COLORS[0] },
  { id: 1, kind: 'outgoing', name: 'Outgoing Feeder 1', fla: 150, pickup51: 180, dial51: 0.10, dialN: 0.10, curve: 'IEC-VI', color: COORD_COLORS[1] },
  { id: 2, kind: 'outgoing', name: 'Outgoing Feeder 2', fla: 100, pickup51: 120, dial51: 0.10, dialN: 0.10, curve: 'IEC-VI', color: COORD_COLORS[2] },
];

export default function GarduInduk() {
  const [vSistemKv, setVSistemKv] = useState(20);
  const [sTrafoMva, setSTrafoMva] = useState(10);
  const [ngrAda, setNgrAda] = useState('Ada');
  const [ngrCurrentA, setNgrCurrentA] = useState(40);
  const [groundEvalManual, setGroundEvalManual] = useState(20);
  const [ifPhaseMaxKa, setIfPhaseMaxKa] = useState(12.5);
  const [pickupNDasar, setPickupNDasar] = useState(10);
  const [cti, setCti] = useState(0.3);
  const [rows, setRows] = useState(initialRows);
  const [result, setResult] = useState(null);

  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => r.id === id
      ? { ...r, [field]: ['fla', 'pickup51', 'dial51', 'dialN'].includes(field) ? parseFloat(value) : value }
      : r));
  }
  function addOutgoing() {
    setRows(prev => [...prev, {
      id: idCounter++, kind: 'outgoing', name: `Outgoing Feeder ${prev.filter(r => r.kind === 'outgoing').length + 1}`,
      fla: 100, pickup51: 120, dial51: 0.10, dialN: 0.10, curve: 'IEC-VI',
      color: COORD_COLORS[prev.length % COORD_COLORS.length]
    }]);
  }
  function removeRow(id) {
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function hitung() {
    const ngrOn = ngrAda === 'Ada';
    const groundEvalA = ngrOn ? ngrCurrentA : groundEvalManual;
    const rNgr = ngrOn ? (vSistemKv * 1000 / Math.sqrt(3)) / ngrCurrentA : null;

    const withTimes = rows.map(r => {
      const Mphase = (ifPhaseMaxKa * 1000) / r.pickup51;
      const tPhase = timeAt(r.curve, r.dial51, Mphase);
      const Mground = groundEvalA / pickupNDasar;
      const tGround = timeAt(r.curve, r.dialN, Mground);
      return { ...r, Mphase, tPhase, Mground, tGround };
    });

    const phaseSorted = [...withTimes].sort((a, b) => a.pickup51 - b.pickup51);
    const groundSorted = [...withTimes].sort((a, b) => a.tGround - b.tGround);

    const phaseMargins = [];
    for (let i = 1; i < phaseSorted.length; i++) {
      const m = phaseSorted[i].tPhase - phaseSorted[i - 1].tPhase;
      phaseMargins.push({ ok: m >= cti, a: phaseSorted[i - 1].name, b: phaseSorted[i].name, m });
    }
    const groundMargins = [];
    for (let i = 1; i < groundSorted.length; i++) {
      const m = groundSorted[i].tGround - groundSorted[i - 1].tGround;
      groundMargins.push({ ok: m >= cti, a: groundSorted[i - 1].name, b: groundSorted[i].name, m });
    }

    setResult({
      ngrOn, groundEvalA, rNgr, withTimes, phaseMargins, groundMargins,
      phaseCurves: withTimes.map(r => ({ pickup: r.pickup51, curveKey: r.curve, dial: r.dial51, color: r.color, label: `${r.name} (51)` })),
      groundCurves: withTimes.map(r => ({ pickup: pickupNDasar, curveKey: r.curve, dial: r.dialN, color: r.color, label: `${r.name} (51N)` })),
    });
  }

  return (
    <div>
      <div className="card">
        <h2>Proteksi Gardu Induk — Incoming &amp; Outgoing Kubikel</h2>
        <div className="desc">
          Koordinasi 51/50 (fasa) dan 51N/50N (gangguan tanah) antara kubikel incoming (dari trafo) dan seluruh kubikel outgoing (feeder), termasuk perhitungan NGR (Neutral Grounding Resistor) bila terpasang.
        </div>

        <div className="grid-inputs">
          <div className="field"><label>Tegangan Sistem <span className="unit">(kV)</span></label>
            <input type="number" step="0.1" value={vSistemKv} onChange={e => setVSistemKv(parseFloat(e.target.value))} /></div>
          <div className="field"><label>Daya Trafo Incoming <span className="unit">(MVA)</span></label>
            <input type="number" step="0.1" value={sTrafoMva} onChange={e => setSTrafoMva(parseFloat(e.target.value))} /></div>
          <div className="field"><label>NGR Terpasang?</label>
            <select value={ngrAda} onChange={e => setNgrAda(e.target.value)}>
              <option value="Ada">Ada</option>
              <option value="Tidak Ada">Tidak Ada</option>
            </select></div>
          {ngrAda === 'Ada' ? (
            <div className="field"><label>Arus Pembatas NGR <span className="unit">(A)</span></label>
              <input type="number" step="1" value={ngrCurrentA} onChange={e => setNgrCurrentA(parseFloat(e.target.value))} /></div>
          ) : (
            <div className="field"><label>Arus Evaluasi Gangguan Tanah <span className="unit">(A)</span></label>
              <input type="number" step="1" value={groundEvalManual} onChange={e => setGroundEvalManual(parseFloat(e.target.value))} /></div>
          )}
          <div className="field"><label>Arus Gangguan 3 Fasa Maks di Bus <span className="unit">(kA)</span></label>
            <input type="number" step="0.1" value={ifPhaseMaxKa} onChange={e => setIfPhaseMaxKa(parseFloat(e.target.value))} /></div>
          <div className="field"><label>Pickup 51N Dasar (semua kubikel) <span className="unit">(A)</span></label>
            <input type="number" step="0.1" value={pickupNDasar} onChange={e => setPickupNDasar(parseFloat(e.target.value))} /></div>
          <div className="field"><label>CTI Minimum <span className="unit">(detik)</span></label>
            <input type="number" step="0.01" value={cti} onChange={e => setCti(parseFloat(e.target.value))} /></div>
        </div>
        <div className="result-note" style={{ marginBottom: 16 }}>
          Pickup 51N sengaja dibuat sama untuk semua kubikel (praktik umum sistem ber-NGR) — selektivitas dicapai lewat pengaturan waktu (TMS), bukan pickup, karena seluruh kubikel melihat arus gangguan tanah yang sama besarnya.
        </div>

        <div className="coord-head-row" style={{ gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.7fr 0.7fr 1.3fr 34px' }}>
          <div className="coord-head">Kubikel</div>
          <div className="coord-head">FLA/Beban (A)</div>
          <div className="coord-head">Pickup 51 (A)</div>
          <div className="coord-head">TMS 51</div>
          <div className="coord-head">TMS 51N</div>
          <div className="coord-head">Standar &amp; Kurva</div>
          <div></div>
        </div>
        {rows.map(r => (
          <div className="coord-row" style={{ gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.7fr 0.7fr 1.3fr 34px' }} key={r.id}>
            <input className="coord-input" type="text" value={r.name} onChange={e => updateRow(r.id, 'name', e.target.value)} />
            <input className="coord-input" type="number" step="1" value={r.fla} onChange={e => updateRow(r.id, 'fla', e.target.value)} />
            <input className="coord-input" type="number" step="1" value={r.pickup51} onChange={e => updateRow(r.id, 'pickup51', e.target.value)} />
            <input className="coord-input" type="number" step="0.01" value={r.dial51} onChange={e => updateRow(r.id, 'dial51', e.target.value)} />
            <input className="coord-input" type="number" step="0.01" value={r.dialN} onChange={e => updateRow(r.id, 'dialN', e.target.value)} />
            <select className="coord-input" value={r.curve} onChange={e => updateRow(r.id, 'curve', e.target.value)}>
              {CURVE_OPTIONS.map(o => <option value={o.value} key={o.value}>{o.label}</option>)}
            </select>
            {r.kind === 'outgoing'
              ? <button className="coord-remove" onClick={() => removeRow(r.id)}>×</button>
              : <span />}
          </div>
        ))}
        <button className="btn-secondary" onClick={addOutgoing} style={{ marginTop: 6 }}>+ Tambah Outgoing</button>
        <div style={{ marginTop: 16 }}>
          <button className="btn-calc" onClick={hitung}>Hitung &amp; Plot Koordinasi</button>
        </div>
      </div>

      {result && (
        <>
          <div className="card">
            <h2>NGR &amp; Ringkasan Evaluasi</h2>
            <div className="result-group">
              <div className="result-group-title">Neutral Grounding Resistor</div>
              {result.ngrOn ? (
                <>
                  <div className="result-row"><div><div className="result-label">Arus pembatas NGR</div></div>
                    <div className="result-value">{fmt(ngrCurrentA, 0)}<span className="u">A</span></div></div>
                  <div className="result-row"><div><div className="result-label">Nilai resistansi NGR</div><div className="result-formula">(V_sistem / √3) / I_NGR</div></div>
                    <div className="result-value">{fmt(result.rNgr, 1)}<span className="u">Ω</span></div>
                    <div className="result-note">Verifikasi rating waktu singkat (short-time rating, umumnya 10 detik) NGR ke pabrikan agar sesuai dengan waktu trip 51N terlama yang dihasilkan di bawah.</div>
                  </div>
                </>
              ) : (
                <div className="flag-warn">Tidak ada NGR — sistem kemungkinan solid grounded atau ungrounded/resistance tinggi. Arus evaluasi gangguan tanah memakai nilai manual yang Anda masukkan ({fmt(result.groundEvalA, 0)} A); pastikan nilai ini merepresentasikan estimasi arus gangguan tanah riil sistem Anda.</div>
              )}
            </div>

            <div className="result-group">
              <div className="result-group-title">Waktu Trip @ Arus Evaluasi</div>
              {result.withTimes.map(r => (
                <div className="result-row" key={r.id}>
                  <div>
                    <div className="result-label">{r.name}</div>
                    <div className="result-formula">51: M={fmt(r.Mphase, 2)}× → {fmt(r.tPhase, 3)}s &nbsp;|&nbsp; 51N: M={fmt(r.Mground, 2)}× → {fmt(r.tGround, 3)}s</div>
                  </div>
                  <div className="result-value">{fmt(r.tPhase, 3)}<span className="u">s (51)</span></div>
                </div>
              ))}
            </div>

            <div className="result-group">
              <div className="result-group-title">Cek Grading — Fasa (51/50)</div>
              {result.phaseMargins.map((m, i) => (
                <div key={i} className={m.ok ? 'flag-ok' : 'flag-warn'}>
                  {m.a} → {m.b}: margin {fmt(m.m, 3)}s {m.ok ? '— memenuhi CTI.' : `— KURANG dari CTI minimum ${fmt(cti, 2)}s.`}
                </div>
              ))}
            </div>
            <div className="result-group">
              <div className="result-group-title">Cek Grading — Gangguan Tanah (51N/50N)</div>
              {result.groundMargins.map((m, i) => (
                <div key={i} className={m.ok ? 'flag-ok' : 'flag-warn'}>
                  {m.a} → {m.b}: margin {fmt(m.m, 3)}s {m.ok ? '— memenuhi CTI.' : `— KURANG dari CTI minimum ${fmt(cti, 2)}s.`}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Overlay TCC — Fasa (51/50)</h2>
            <div className="chart-wrap"><TCCAmpsChart curves={result.phaseCurves} evalA={ifPhaseMaxKa * 1000} /></div>
            <div className="chart-legend">
              {result.phaseCurves.map((c, i) => <div className="legend-item" key={i}><span className="swatch" style={{ background: c.color }} />{c.label}</div>)}
            </div>
          </div>

          <div className="card">
            <h2>Overlay TCC — Gangguan Tanah (51N/50N)</h2>
            <div className="chart-wrap"><TCCAmpsChart curves={result.groundCurves} evalA={result.groundEvalA} /></div>
            <div className="chart-legend">
              {result.groundCurves.map((c, i) => <div className="legend-item" key={i}><span className="swatch" style={{ background: c.color }} />{c.label}</div>)}
            </div>
            <div className="disclaimer">Karena pickup 51N sama di semua kubikel, kurva-kurva ini hanya berbeda posisi vertikal (waktu) sesuai TMS masing-masing pada kelipatan arus (M) yang sama.</div>
          </div>
        </>
      )}
    </div>
  );
}
