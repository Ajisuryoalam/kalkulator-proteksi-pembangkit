'use client';
import { useState } from 'react';
import { CURVES, CURVE_OPTIONS, timeAt, fmt } from '../lib/curves';
import { TCCAmpsChart } from './Charts';

const COORD_COLORS = ['#F0A830', '#4FD4D8', '#4ADE80', '#EF5350', '#B388FF', '#FFD166', '#6FCF97', '#F2994A'];
let idCounter = 4;

const initialRows = [
  { id: 1, name: 'Motor 51/49 (Feeder Motor)', pickup: 130, curve: 'IEC-SI', dial: 0.10, color: COORD_COLORS[0] },
  { id: 2, name: 'Relay Feeder Bus 6.3kV', pickup: 400, curve: 'IEC-VI', dial: 0.72, color: COORD_COLORS[1] },
  { id: 3, name: 'Relay Incomer Bus / UAT-LV', pickup: 1200, curve: 'IEC-VI', dial: 0.40, color: COORD_COLORS[2] },
];

export default function Coordination() {
  const [rows, setRows] = useState(initialRows);
  const [evalKA, setEvalKA] = useState(8);
  const [cti, setCti] = useState(0.3);
  const [result, setResult] = useState(null);

  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: (field === 'pickup' || field === 'dial') ? parseFloat(value) : value } : r));
  }
  function addRow() {
    setRows(prev => [...prev, { id: idCounter++, name: 'Perangkat baru', pickup: 200, curve: 'IEC-SI', dial: 0.10, color: COORD_COLORS[prev.length % COORD_COLORS.length] }]);
  }
  function removeRow(id) {
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function runCoordination() {
    if (rows.length < 2) {
      setResult({ warnOnly: 'Tambahkan minimal 2 perangkat untuk mengecek grading antar tingkat.' });
      return;
    }
    const evalA = evalKA * 1000;
    const withTimes = rows.map(r => ({ ...r, t: timeAt(r.curve, r.dial, evalA / r.pickup) })).sort((a, b) => a.pickup - b.pickup);
    const items = withTimes.map(r => ({
      label: `${r.name} — pickup ${fmt(r.pickup, 0)} A (${CURVES[r.curve].name})`,
      formula: `M = I_evaluasi/Is = ${fmt(evalA / r.pickup, 2)}×, TMS/TD = ${fmt(r.dial, 3)}`,
      value: r.t, unit: 'detik'
    }));
    const marginItems = [];
    for (let i = 1; i < withTimes.length; i++) {
      const margin = withTimes[i].t - withTimes[i - 1].t;
      const ok = margin >= cti;
      marginItems.push({
        flag: ok ? 'ok' : 'warn',
        note: `${withTimes[i - 1].name} → ${withTimes[i].name}: margin ${fmt(margin, 3)} detik ${ok ? '— memenuhi CTI minimum.' : `— KURANG dari CTI minimum ${fmt(cti, 2)}s. Naikkan TMS perangkat hulu atau turunkan TMS perangkat hilir.`}`
      });
    }
    const curvesForChart = withTimes.map(r => ({ pickup: r.pickup, curveKey: r.curve, dial: r.dial, color: r.color, label: `${r.name} (${CURVES[r.curve].name})` }));
    setResult({
      items, marginItems, evalA,
      desc: `Overlay ${withTimes.length} kurva, dievaluasi pada arus gangguan ${fmt(evalA / 1000, 2)} kA (garis putus-putus). Titik bulat menandai waktu trip tiap perangkat.`,
      curvesForChart
    });
  }

  return (
    <div>
      <div className="card">
        <h2>Koordinasi Multi-Level (Overlay TCC)</h2>
        <div className="desc">Susun rantai radial dari titik proteksi paling hilir (mis. motor) hingga paling hulu (mis. incomer bus/trafo unit). Semua pickup harus dalam Ampere pada level tegangan yang sama.</div>

        <div style={{ marginBottom: 8 }}>
          <div className="coord-head-row">
            <div className="coord-head">Nama Perangkat</div>
            <div className="coord-head">Pickup (A)</div>
            <div className="coord-head">Standar &amp; Kurva</div>
            <div className="coord-head">TMS/TD</div>
            <div></div>
          </div>
          {rows.map(r => (
            <div className="coord-row" key={r.id}>
              <input className="coord-input" type="text" value={r.name} onChange={e => updateRow(r.id, 'name', e.target.value)} />
              <input className="coord-input" type="number" step="0.1" value={r.pickup} onChange={e => updateRow(r.id, 'pickup', e.target.value)} />
              <select className="coord-input" value={r.curve} onChange={e => updateRow(r.id, 'curve', e.target.value)}>
                {CURVE_OPTIONS.map(o => <option value={o.value} key={o.value}>{o.label}</option>)}
              </select>
              <input className="coord-input" type="number" step="0.001" value={r.dial} onChange={e => updateRow(r.id, 'dial', e.target.value)} />
              <button className="coord-remove" onClick={() => removeRow(r.id)}>×</button>
            </div>
          ))}
        </div>
        <button className="btn-secondary" onClick={addRow}>+ Tambah Perangkat</button>

        <div className="grid-inputs" style={{ marginTop: 16 }}>
          <div className="field">
            <label>Arus Gangguan Evaluasi <span className="unit">(kA)</span></label>
            <input type="number" step="0.01" value={evalKA} onChange={e => setEvalKA(parseFloat(e.target.value))} />
          </div>
          <div className="field">
            <label>CTI Minimum antar Tingkat <span className="unit">(detik)</span></label>
            <input type="number" step="0.01" value={cti} onChange={e => setCti(parseFloat(e.target.value))} />
          </div>
        </div>
        <button className="btn-calc" onClick={runCoordination}>Plot Koordinasi</button>
      </div>

      {result && result.warnOnly && (
        <div className="card"><div className="flag-warn">{result.warnOnly}</div></div>
      )}

      {result && !result.warnOnly && (
        <>
          <div className="card">
            <h2>Waktu Trip &amp; Cek Grading (CTI)</h2>
            <div className="result-group">
              <div className="result-group-title">Waktu Trip Tiap Perangkat @ Arus Evaluasi</div>
              {result.items.map((it, i) => (
                <div className="result-row" key={i}>
                  <div>
                    <div className="result-label">{it.label}</div>
                    <div className="result-formula">{it.formula}</div>
                  </div>
                  <div className="result-value">{fmt(it.value, 3)}<span className="u">{it.unit}</span></div>
                </div>
              ))}
            </div>
            <div className="result-group">
              <div className="result-group-title">Cek Grading Time (CTI) Antar Tingkat</div>
              {result.marginItems.map((it, i) => (
                <div key={i} className={it.flag === 'warn' ? 'flag-warn' : 'flag-ok'}>{it.note}</div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2>Overlay Kurva TCC</h2>
            <div className="desc">{result.desc}</div>
            <div className="chart-wrap"><TCCAmpsChart curves={result.curvesForChart} evalA={result.evalA} /></div>
            <div className="chart-legend">
              {result.curvesForChart.map((c, i) => (
                <div className="legend-item" key={i}><span className="swatch" style={{ background: c.color }} />{c.label}</div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
