'use client';
import { useState, useEffect } from 'react';
import ResultsPanel from './ResultsPanel';
import { TCCChart, DiffChart } from './Charts';
import { EQUIP } from '../lib/equipment';
import { useAuth } from './AuthProvider';
import { logCalculation, fetchFavorites, toggleFavorite } from '../lib/history';
import { Star } from 'lucide-react';

function defaultValues(fields) {
  const v = {};
  fields.forEach(f => {
    if (f.type === 'select') v[f.id] = (typeof f.options[0] === 'object') ? f.options[0].value : f.options[0];
    else v[f.id] = f.def;
  });
  return v;
}

function buildSummary(fields, values) {
  return fields.slice(0, 2).map(f => `${f.label.split('—')[0].trim()}=${values[f.id]}${f.unit ? f.unit : ''}`).join(', ');
}

export default function EquipmentCalculator({ equipKey }) {
  const equip = EQUIP[equipKey];
  const { user } = useAuth();
  const [values, setValues] = useState(() => defaultValues(equip.fields));
  const [output, setOutput] = useState(null);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!user) { setIsFav(false); return; }
    fetchFavorites(user.id).then(list => setIsFav(list.some(f => f.equip_key === equipKey)));
  }, [user, equipKey]);

  function setField(id, raw, isNumber) {
    setValues(prev => ({ ...prev, [id]: isNumber ? parseFloat(raw) : raw }));
  }

  function handleCalc() {
    const out = equip.calc(values);
    setOutput(out);
    if (user) {
      logCalculation(user.id, {
        equipKey, equipLabel: equip.title, summary: buildSummary(equip.fields, values), inputSnapshot: values,
      });
    }
  }

  async function handleToggleFav() {
    if (!user) return;
    await toggleFavorite(user.id, equipKey, isFav);
    setIsFav(!isFav);
  }

  const groups = output ? (Array.isArray(output) ? output : output.groups) : null;
  const tcc = output && !Array.isArray(output) ? output.tcc : null;
  const diff = output && !Array.isArray(output) ? output.diff : null;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2>{equip.title}</h2>
          {user && (
            <button onClick={handleToggleFav} title={isFav ? 'Hapus dari favorit' : 'Tandai favorit'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Star size={20} color={isFav ? '#F0A830' : '#4C575D'} fill={isFav ? '#F0A830' : 'none'} />
            </button>
          )}
        </div>
        <div className="desc">{equip.desc}</div>
        <div className="grid-inputs">
          {equip.fields.map(f => (
            <div className="field" key={f.id}>
              <label>{f.label} {f.unit ? <span className="unit">({f.unit})</span> : null}</label>
              {f.type === 'select' ? (
                <select value={values[f.id]} onChange={e => setField(f.id, e.target.value, false)}>
                  {f.options.map(o => {
                    const val = typeof o === 'object' ? o.value : o;
                    const lbl = typeof o === 'object' ? o.label : o;
                    return <option value={val} key={val}>{lbl}</option>;
                  })}
                </select>
              ) : f.type === 'text' ? (
                <input type="text" value={values[f.id]} onChange={e => setField(f.id, e.target.value, false)} />
              ) : (
                <input type="number" step={f.step ?? 1} value={values[f.id]} onChange={e => setField(f.id, e.target.value, true)} />
              )}
            </div>
          ))}
        </div>
        <button className="btn-calc" onClick={handleCalc}>Hitung Setting</button>
      </div>

      {groups && (
        <div className="card">
          <h2>Rekomendasi Setting</h2>
          <ResultsPanel groups={groups} />
          <div className="disclaimer">
            <b>Catatan:</b> Nilai di atas adalah estimasi berbasis rule-of-thumb standar industri (IEEE C37.91/C37.96/C37.102, IEC 60255/60287).
            Setting akhir wajib diverifikasi melalui studi koordinasi proteksi dan disesuaikan dengan kurva relay aktual serta filosofi proteksi PLN yang berlaku.
          </div>
        </div>
      )}

      {tcc && (
        <div className="card">
          <h2>Kurva TCC (Time-Current Characteristic)</h2>
          <div className="desc">{tcc.desc}</div>
          <div className="chart-wrap"><TCCChart curves={tcc.curves} coord={tcc.coord} /></div>
          <div className="chart-legend">
            {tcc.curves.filter(c => c.dial && !isNaN(c.dial)).map((c, i) => (
              <div className="legend-item" key={i}><span className="swatch" style={{ background: c.color }} />{c.label}</div>
            ))}
          </div>
        </div>
      )}

      {diff && (
        <div className="card">
          <h2>Kurva Slope Differential (87T) — Dual-Slope Restraint</h2>
          <div className="desc">{diff.desc}</div>
          <div className="chart-wrap"><DiffChart curves={diff.curves} xMax={diff.xMax} /></div>
          <div className="chart-legend">
            {diff.curves.map((c, i) => (
              <div className="legend-item" key={i}><span className="swatch" style={{ background: c.color, opacity: c.primary ? 1 : 0.7 }} />{c.label}</div>
            ))}
          </div>
          <div className="disclaimer">
            Kurva IEEE dan IEC adalah nilai tipikal/representatif — bukan persamaan tunggal yang dibakukan ketat seperti kurva IDMT.
            Breakpoint dan slope aktual tetap mengikuti kurva bias relay yang sesungguhnya dipakai (manual pabrikan relay).
          </div>
        </div>
      )}
    </div>
  );
}
