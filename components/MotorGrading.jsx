'use client';

import { useState } from 'react';
import {
  CURVES,
  CURVE_OPTIONS,
  SEL749M_METHOD_OPTIONS,
  SEL749M_STATE_OPTIONS,
  fmt,
  scanCoordinationMargin,
  sel749mThermalResult,
  sel749mThermalTime,
  timeAt,
  validateSel749mMotor,
} from '../lib/curves';
import { TCCAmpsChart } from './Charts';

const COLORS = ['#F0A830', '#4FD4D8', '#4ADE80', '#EF5350', '#B388FF', '#FFD166', '#6FCF97', '#F2994A'];
let motorId = 3;
let upId = 1;

const initialMotors = [
  {
    id: 0,
    name: 'Cooling Tower Fan (CVF)',
    upstreamId: 0,
    fla: 21,
    sf: 1.15,
    method: 'rating',
    lra: 4.5,
    lrthot: 6,
    td: 1,
    rtcMode: 'auto',
    rtc: 28,
    curve: 5,
    initialState: 'hot',
    color: COLORS[0],
  },
  {
    id: 1,
    name: 'Forced Draft Fan (FDF)',
    upstreamId: 0,
    fla: 25,
    sf: 1.15,
    method: 'rating',
    lra: 5,
    lrthot: 8,
    td: 1,
    rtcMode: 'auto',
    rtc: 25,
    curve: 7,
    initialState: 'hot',
    color: COLORS[1],
  },
  {
    id: 2,
    name: 'Boiler Feed Pump (BFP)',
    upstreamId: 0,
    fla: 32,
    sf: 1.15,
    method: 'rating',
    lra: 4.8,
    lrthot: 7,
    td: 1,
    rtcMode: 'auto',
    rtc: 32,
    curve: 6,
    initialState: 'hot',
    color: COLORS[2],
  },
];

const initialUpstream = [
  { id: 0, name: 'Feeder MCC / Incoming', pickup: 100, curve: 'IEC-VI', dial: 0.88, color: COLORS[3] },
];

const TEXT_FIELDS = new Set(['name', 'method', 'rtcMode', 'initialState']);

function numberOrBlank(value) {
  return value === '' ? '' : Number(value);
}

function regionLabel(region) {
  const labels = {
    'below-pickup': 'Di bawah pickup thermal (I ≤ SF)',
    running: 'RUNNING model (SF < I < 2,5 × FLA)',
    starting: 'STARTING model (2,5–12 × FLA)',
    'outside-published-range': 'Di luar rentang persamaan publik (>12 × FLA)',
    invalid: 'Input tidak valid',
  };
  return labels[region] || region;
}

function timeLabel(time) {
  if (time === Infinity) return 'Tidak pickup';
  if (!Number.isFinite(time)) return 'Di luar model';
  return `${fmt(time, 2)} s`;
}

function methodLabel(motor) {
  if (motor.method === 'curve') return `Curve Method, Curve ${motor.curve}`;
  const rtc = motor.rtcMode === 'auto' ? 'RTC Auto' : `RTC ${fmt(motor.rtc, 1)} menit`;
  return `Rating Method, LRA ${fmt(motor.lra, 2)} × FLA, LRTHOT ${fmt(motor.lrthot, 1)} s, TD ${fmt(motor.td, 2)}, ${rtc}`;
}

export default function MotorGrading() {
  const [motors, setMotors] = useState(initialMotors);
  const [upstream, setUpstream] = useState(initialUpstream);
  const [evalA, setEvalA] = useState(200);
  const [cti, setCti] = useState(0.3);
  const [gradingMinA, setGradingMinA] = useState(50);
  const [gradingMaxA, setGradingMaxA] = useState(500);
  const [result, setResult] = useState(null);

  function updMotor(id, field, value) {
    setMotors(prev => prev.map(motor => {
      if (motor.id !== id) return motor;
      if (field === 'upstreamId') return { ...motor, upstreamId: value === '' ? null : Number(value) };
      if (TEXT_FIELDS.has(field)) return { ...motor, [field]: value };
      return { ...motor, [field]: numberOrBlank(value) };
    }));
  }

  function addMotor() {
    const selectedUpstream = upstream[0]?.id ?? null;
    setMotors(prev => [
      ...prev,
      {
        id: motorId++,
        name: 'Motor baru',
        upstreamId: selectedUpstream,
        fla: 10,
        sf: 1.15,
        method: 'rating',
        lra: 6,
        lrthot: 10,
        td: 1,
        rtcMode: 'auto',
        rtc: 30,
        curve: 5,
        initialState: 'hot',
        color: COLORS[prev.length % COLORS.length],
      },
    ]);
  }

  function removeMotor(id) {
    setMotors(prev => prev.filter(motor => motor.id !== id));
  }

  function updUp(id, field, value) {
    setUpstream(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (field === 'name' || field === 'curve') return { ...item, [field]: value };
      return { ...item, [field]: numberOrBlank(value) };
    }));
  }

  function addUpstream() {
    const newId = upId++;
    setUpstream(prev => [
      ...prev,
      {
        id: newId,
        name: 'Upstream baru',
        pickup: 100,
        curve: 'IEC-VI',
        dial: 0.5,
        color: COLORS[(prev.length + motors.length) % COLORS.length],
      },
    ]);
  }

  function removeUp(id) {
    setUpstream(prev => {
      const next = prev.filter(item => item.id !== id);
      const fallbackId = next[0]?.id ?? null;
      setMotors(current => current.map(motor => (
        motor.upstreamId === id ? { ...motor, upstreamId: fallbackId } : motor
      )));
      return next;
    });
  }

  function hitung() {
    const minA = Number(gradingMinA);
    const maxA = Number(gradingMaxA);
    const evaluationCurrent = Number(evalA);
    const minimumCti = Number(cti);
    const validationErrors = [];

    if (!motors.length) validationErrors.push('Tambahkan sekurang-kurangnya satu motor.');
    if (!(evaluationCurrent > 0)) validationErrors.push('Arus evaluasi harus lebih besar dari nol.');
    if (!(minimumCti >= 0)) validationErrors.push('CTI minimum tidak boleh negatif.');
    if (!(minA > 0 && maxA > minA)) validationErrors.push('Rentang arus grading harus memenuhi I maksimum > I minimum > 0.');

    const upstreamResults = upstream.map(item => {
      const errors = [];
      if (!(item.pickup > 0)) errors.push('Pickup harus lebih besar dari nol.');
      if (!(item.dial > 0)) errors.push('TMS/TD harus lebih besar dari nol.');
      if (!CURVES[item.curve]) errors.push('Kurva upstream tidak valid.');
      const M = evaluationCurrent / item.pickup;
      return { ...item, errors, M, time: timeAt(item.curve, item.dial, M) };
    });
    const upResultById = new Map(upstreamResults.map(item => [item.id, item]));

    const motorResults = motors.map(motor => {
      const errors = validateSel749mMotor(motor);
      const thermal = sel749mThermalResult(evaluationCurrent, motor);
      const assignedUpstream = upResultById.get(motor.upstreamId) || null;
      let grading = null;
      let pointMargin = null;

      if (!errors.length && assignedUpstream && !assignedUpstream.errors.length && minA > 0 && maxA > minA) {
        grading = scanCoordinationMargin({
          downstreamFn: currentA => sel749mThermalTime(currentA, motor),
          upstreamFn: currentA => timeAt(
            assignedUpstream.curve,
            assignedUpstream.dial,
            currentA / assignedUpstream.pickup,
          ),
          minA,
          maxA,
          breakpoints: [
            motor.sf * motor.fla,
            2.5 * motor.fla,
            12 * motor.fla,
            assignedUpstream.pickup,
          ],
        });

        const tDown = thermal.time;
        const tUp = assignedUpstream.time;
        if (Number.isFinite(tDown) && Number.isFinite(tUp)) {
          pointMargin = tUp - tDown;
        }
      }

      return {
        ...motor,
        errors,
        thermal,
        assignedUpstream,
        grading,
        pointMargin,
      };
    });

    const curves = [];
    motorResults.forEach(motor => {
      if (motor.errors.length) return;
      const state = motor.initialState === 'cold' ? 'cold' : 'hot';
      const method = motor.method === 'curve' ? `Curve ${motor.curve}` : 'Rating';
      curves.push({
        pickup: motor.sf * motor.fla,
        maxCurrent: 12 * motor.fla,
        color: motor.color,
        label: `${motor.name} — SEL-749M 49T (${method}, ${state})`,
        timeFn: currentA => sel749mThermalTime(currentA, motor),
      });
      curves.push({
        kind: 'vertical',
        at: 2.5 * motor.fla,
        pickup: 2.5 * motor.fla,
        maxCurrent: 12 * motor.fla,
        color: motor.color,
        dashed: true,
        label: `${motor.name} — 50S pickup 2,5 × FLA (dropout 2,4 × FLA)`,
      });
    });
    upstreamResults.forEach(item => {
      if (item.errors.length) return;
      curves.push({
        pickup: item.pickup,
        maxCurrent: item.pickup * 15,
        curveKey: item.curve,
        dial: item.dial,
        color: item.color,
        label: `${item.name} (${CURVES[item.curve].name})`,
      });
    });

    setResult({
      validationErrors,
      motorResults,
      upstreamResults,
      curves,
      minA,
      maxA,
      evaluationCurrent,
      minimumCti,
    });
  }

  return (
    <div>
      <div className="card">
        <h2>Grading TCC Proteksi Motor — SEL-749M</h2>
        <div className="desc">
          Perhitungan 49T menggunakan persamaan trip-time SEL-749M Appendix F (F.10–F.17). Elemen 50S ditampilkan sebagai batas pickup model STARTING pada 2,5 × FLA (dropout relay 2,4 × FLA), bukan sebagai kurva definite-time 51LR terpisah.
        </div>

        <div className="result-note emphasis-note" style={{ marginBottom: 16 }}>
          <b>Basis arus wajib sama:</b> FLA motor, pickup upstream, arus evaluasi, dan rentang grading harus semuanya dinyatakan pada sisi primer/sisi sistem yang sama. Jangan mencampur nilai sekunder CT dengan rasio berbeda.
        </div>

        <div className="section-title-row">
          <div>
            <h3>Data motor dan setting thermal</h3>
            <div className="section-help">Rentang input mengikuti SEL-749M Settings Sheets.</div>
          </div>
          <button className="btn-secondary" onClick={addMotor}>+ Tambah Motor</button>
        </div>

        {motors.map((motor, index) => (
          <div className="config-card" key={motor.id}>
            <div className="config-card-head">
              <div className="config-card-title">
                <span className="config-color" style={{ background: motor.color }} />
                Motor {index + 1}
              </div>
              <button className="coord-remove compact-remove" onClick={() => removeMotor(motor.id)} aria-label={`Hapus ${motor.name}`}>×</button>
            </div>

            <div className="grid-inputs motor-grid">
              <div className="field field-wide">
                <label>Nama motor</label>
                <input type="text" value={motor.name} onChange={e => updMotor(motor.id, 'name', e.target.value)} />
              </div>
              <div className="field">
                <label>Upstream terkait</label>
                <select value={motor.upstreamId ?? ''} onChange={e => updMotor(motor.id, 'upstreamId', e.target.value)}>
                  <option value="">— Belum dipilih —</option>
                  {upstream.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>FLA <span className="unit">(A primer)</span></label>
                <input type="number" min="0.2" max="5000" step="0.1" value={motor.fla} onChange={e => updMotor(motor.id, 'fla', e.target.value)} />
              </div>
              <div className="field">
                <label>Service Factor</label>
                <input type="number" min="1.01" max="1.5" step="0.01" value={motor.sf} onChange={e => updMotor(motor.id, 'sf', e.target.value)} />
              </div>
              <div className="field">
                <label>Thermal Method</label>
                <select value={motor.method} onChange={e => updMotor(motor.id, 'method', e.target.value)}>
                  {SEL749M_METHOD_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Kondisi awal</label>
                <select value={motor.initialState} onChange={e => updMotor(motor.id, 'initialState', e.target.value)}>
                  {SEL749M_STATE_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
                </select>
              </div>

              {motor.method === 'rating' ? (
                <>
                  <div className="field">
                    <label>LRA <span className="unit">(× FLA)</span></label>
                    <input type="number" min="2.5" max="12" step="0.1" value={motor.lra} onChange={e => updMotor(motor.id, 'lra', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>LRTHOT <span className="unit">(detik)</span></label>
                    <input type="number" min="1" max="600" step="0.5" value={motor.lrthot} onChange={e => updMotor(motor.id, 'lrthot', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Acceleration Factor TD</label>
                    <input type="number" min="0.1" max="1.5" step="0.05" value={motor.td} onChange={e => updMotor(motor.id, 'td', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>RTC mode</label>
                    <select value={motor.rtcMode} onChange={e => updMotor(motor.id, 'rtcMode', e.target.value)}>
                      <option value="auto">Auto</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  {motor.rtcMode === 'manual' && (
                    <div className="field">
                      <label>RTC <span className="unit">(menit)</span></label>
                      <input type="number" min="1" max="2000" step="1" value={motor.rtc} onChange={e => updMotor(motor.id, 'rtc', e.target.value)} />
                    </div>
                  )}
                </>
              ) : (
                <div className="field">
                  <label>Curve Number <span className="unit">(1–45)</span></label>
                  <input type="number" min="1" max="45" step="1" value={motor.curve} onChange={e => updMotor(motor.id, 'curve', e.target.value)} />
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="section-title-row" style={{ marginTop: 22 }}>
          <div>
            <h3>Perangkat upstream</h3>
            <div className="section-help">Setiap motor memilih perangkat upstream yang benar-benar berada pada jalur serinya.</div>
          </div>
          <button className="btn-secondary" onClick={addUpstream}>+ Tambah Upstream</button>
        </div>

        {upstream.map((item, index) => (
          <div className="config-card upstream-card" key={item.id}>
            <div className="config-card-head">
              <div className="config-card-title">
                <span className="config-color" style={{ background: item.color }} />
                Upstream {index + 1}
              </div>
              <button className="coord-remove compact-remove" onClick={() => removeUp(item.id)} aria-label={`Hapus ${item.name}`}>×</button>
            </div>
            <div className="grid-inputs upstream-grid">
              <div className="field field-wide">
                <label>Nama perangkat</label>
                <input type="text" value={item.name} onChange={e => updUp(item.id, 'name', e.target.value)} />
              </div>
              <div className="field">
                <label>Pickup <span className="unit">(A primer)</span></label>
                <input type="number" min="0.01" step="0.1" value={item.pickup} onChange={e => updUp(item.id, 'pickup', e.target.value)} />
              </div>
              <div className="field field-wide">
                <label>Standar dan kurva</label>
                <select value={item.curve} onChange={e => updUp(item.id, 'curve', e.target.value)}>
                  {CURVE_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>TMS / Time Dial</label>
                <input type="number" min="0.001" step="0.01" value={item.dial} onChange={e => updUp(item.id, 'dial', e.target.value)} />
              </div>
            </div>
          </div>
        ))}

        <div className="grid-inputs grading-grid" style={{ marginTop: 20 }}>
          <div className="field">
            <label>Arus evaluasi <span className="unit">(A)</span></label>
            <input type="number" min="0.01" step="0.1" value={evalA} onChange={e => setEvalA(numberOrBlank(e.target.value))} />
          </div>
          <div className="field">
            <label>CTI minimum <span className="unit">(detik)</span></label>
            <input type="number" min="0" step="0.01" value={cti} onChange={e => setCti(numberOrBlank(e.target.value))} />
          </div>
          <div className="field">
            <label>Arus grading minimum <span className="unit">(A)</span></label>
            <input type="number" min="0.01" step="0.1" value={gradingMinA} onChange={e => setGradingMinA(numberOrBlank(e.target.value))} />
          </div>
          <div className="field">
            <label>Arus grading maksimum <span className="unit">(A)</span></label>
            <input type="number" min="0.01" step="0.1" value={gradingMaxA} onChange={e => setGradingMaxA(numberOrBlank(e.target.value))} />
          </div>
        </div>

        <button className="btn-calc" onClick={hitung}>Hitung dan Plot Grading SEL-749M</button>
      </div>

      {result && (
        <>
          {result.validationErrors.length > 0 && (
            <div className="card">
              <h2>Validasi input</h2>
              {result.validationErrors.map((error, index) => <div className="flag-warn" key={index}>{error}</div>)}
            </div>
          )}

          <div className="card">
            <h2>Waktu Trip 49T pada Arus Evaluasi</h2>
            <div className="desc">Arus evaluasi: {fmt(result.evaluationCurrent, 2)} A.</div>

            {result.motorResults.map(motor => (
              <div className="result-group" key={motor.id}>
                <div className="result-group-title">{motor.name}</div>
                {motor.errors.length ? (
                  motor.errors.map((error, index) => <div className="flag-warn" key={index}>{error}</div>)
                ) : (
                  <>
                    <div className="result-row">
                      <div>
                        <div className="result-label">SEL-749M Thermal 49T</div>
                        <div className="result-formula">
                          I = {fmt(motor.thermal.I, 3)} × FLA · {regionLabel(motor.thermal.region)}
                        </div>
                      </div>
                      <div className="result-value">{timeLabel(motor.thermal.time)}</div>
                    </div>
                    <div className="result-note">
                      {methodLabel(motor)}. RTC yang dipakai: {fmt(motor.thermal.rtcMinutes, 2)} menit.
                    </div>
                  </>
                )}
              </div>
            ))}

            {result.upstreamResults.length > 0 && (
              <div className="result-group">
                <div className="result-group-title">Upstream</div>
                {result.upstreamResults.map(item => (
                  <div key={item.id}>
                    {item.errors.length ? (
                      item.errors.map((error, index) => <div className="flag-warn" key={index}>{item.name}: {error}</div>)
                    ) : (
                      <div className="result-row">
                        <div>
                          <div className="result-label">{item.name}</div>
                          <div className="result-formula">{CURVES[item.curve].name} · M = {fmt(item.M, 3)} × pickup</div>
                        </div>
                        <div className="result-value">{timeLabel(item.time)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Cek Grading per Jalur Motor → Upstream</h2>
            <div className="desc">
              Margin minimum dicari pada seluruh rentang {fmt(result.minA, 2)}–{fmt(result.maxA, 2)} A. Motor paralel tidak dibandingkan satu sama lain.
            </div>

            {result.motorResults.map(motor => {
              if (motor.errors.length) {
                return <div className="flag-warn" key={motor.id}>{motor.name}: perbaiki setting motor sebelum grading.</div>;
              }
              if (!motor.assignedUpstream) {
                return <div className="flag-warn" key={motor.id}>{motor.name}: perangkat upstream belum dipilih.</div>;
              }
              if (motor.assignedUpstream.errors.length) {
                return <div className="flag-warn" key={motor.id}>{motor.name}: setting {motor.assignedUpstream.name} tidak valid.</div>;
              }
              if (!motor.grading?.valid) {
                return (
                  <div className="flag-warn" key={motor.id}>
                    {motor.name} → {motor.assignedUpstream.name}: {motor.grading?.reason || 'Grading tidak dapat dihitung.'}
                  </div>
                );
              }

              const ok = motor.grading.margin >= result.minimumCti;
              return (
                <div className={ok ? 'grading-result grading-ok' : 'grading-result grading-fail'} key={motor.id}>
                  <div className="grading-result-head">
                    <b>{motor.name} → {motor.assignedUpstream.name}</b>
                    <span>{ok ? 'MEMENUHI' : 'TIDAK MEMENUHI'}</span>
                  </div>
                  <div className="grading-metrics">
                    <div><small>Margin minimum</small><strong>{fmt(motor.grading.margin, 3)} s</strong></div>
                    <div><small>Terjadi pada arus</small><strong>{fmt(motor.grading.currentA, 2)} A</strong></div>
                    <div><small>Waktu motor</small><strong>{fmt(motor.grading.downstreamTime, 3)} s</strong></div>
                    <div><small>Waktu upstream</small><strong>{fmt(motor.grading.upstreamTime, 3)} s</strong></div>
                  </div>
                  <div className="result-note">
                    Margin pada arus evaluasi: {motor.pointMargin === null ? 'tidak dapat dihitung karena salah satu elemen tidak pickup/di luar model' : `${fmt(motor.pointMargin, 3)} s`}. CTI minimum: {fmt(result.minimumCti, 3)} s.
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h2>Overlay TCC — SEL-749M 49T + Batas 50S + Upstream</h2>
            <div className="chart-wrap"><TCCAmpsChart curves={result.curves} evalA={result.evaluationCurrent} /></div>
            <div className="chart-legend">
              {result.curves.map((curve, index) => (
                <div className="legend-item" key={`${curve.label}-${index}`}>
                  <span
                    className="swatch"
                    style={{
                      background: curve.color,
                      opacity: curve.dashed || curve.kind === 'vertical' ? 0.7 : 1,
                      borderTop: curve.dashed || curve.kind === 'vertical' ? `1px dashed ${curve.color}` : undefined,
                    }}
                  />
                  {curve.label}
                </div>
              ))}
            </div>
            <div className="disclaimer">
              <b>Batas penggunaan:</b> grafik memakai persamaan trip-time yang dipublikasikan pada Appendix F SEL-749M, bukan emulasi firmware lengkap. Ramping adaptive trip threshold saat transisi start-to-run, kondisi %TCU aktual, RTD bias, cooling saat motor berhenti, toleransi relay/CT, waktu pemutus, dan elemen 50P harus diverifikasi terpisah sebelum setting diterapkan atau dikomisioningkan. Kurva 49T dihentikan di 12 × FLA karena persamaan publik F.10–F.17 dinyatakan untuk I ≤ 12 × FLA.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
