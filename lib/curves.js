// Kurva IDMT (standar TMS): IEC 60255-151 & IEEE C37.112
export const CURVES = {
  'IEC-SI':  { std: 'IEC 60255-151', name: 'Standard Inverse (SI)',   label: 'IEC 60255-151 — Standard Inverse (SI)',   type: 'iec',  K: 0.14, a: 0.02 },
  'IEC-VI':  { std: 'IEC 60255-151', name: 'Very Inverse (VI)',       label: 'IEC 60255-151 — Very Inverse (VI)',       type: 'iec',  K: 13.5, a: 1 },
  'IEC-EI':  { std: 'IEC 60255-151', name: 'Extremely Inverse (EI)',  label: 'IEC 60255-151 — Extremely Inverse (EI)',  type: 'iec',  K: 80,   a: 2 },
  'IEEE-MI': { std: 'IEEE C37.112',  name: 'Moderately Inverse (MI)', label: 'IEEE C37.112 — Moderately Inverse (MI)',  type: 'ieee', A: 0.0515, B: 0.1140, p: 0.02 },
  'IEEE-VI': { std: 'IEEE C37.112',  name: 'Very Inverse (VI)',       label: 'IEEE C37.112 — Very Inverse (VI)',        type: 'ieee', A: 19.61,  B: 0.491,  p: 2 },
  'IEEE-EI': { std: 'IEEE C37.112',  name: 'Extremely Inverse (EI)',  label: 'IEEE C37.112 — Extremely Inverse (EI)',  type: 'ieee', A: 28.2,   B: 0.1217, p: 2 },
};
export const CURVE_OPTIONS = Object.keys(CURVES).map(k => ({ value: k, label: CURVES[k].label }));

export function tccFormulaStr(curveKey) {
  const c = CURVES[curveKey];
  return c.type === 'iec'
    ? `t = TMS × ${c.K} / (M^${c.a} − 1)`
    : `t = TD × (${c.A}/(M^${c.p} − 1) + ${c.B})`;
}

export function timeAt(curveKey, dial, M) {
  const c = CURVES[curveKey];
  if (!c || !Number.isFinite(dial) || M <= 1.001) return Infinity;
  return c.type === 'iec'
    ? dial * c.K / (Math.pow(M, c.a) - 1)
    : dial * (c.A / (Math.pow(M, c.p) - 1) + c.B);
}

export function solveDial(curveKey, targetT, M) {
  const c = CURVES[curveKey];
  if (!c || M <= 1.001) return NaN;
  return c.type === 'iec'
    ? targetT * (Math.pow(M, c.a) - 1) / c.K
    : targetT / (c.A / (Math.pow(M, c.p) - 1) + c.B);
}

// Karakteristik slope differential 87T (dual-slope)
export function diffThreshold(is, s1, bp1, s2, Ir) {
  const atKnee = Math.max(is, s1 * Ir);
  if (Ir <= bp1) return atKnee;
  const valAtBp1 = Math.max(is, s1 * bp1);
  return valAtBp1 + s2 * (Ir - bp1);
}

export function niceTicks(min, max) {
  const ticks = [];
  const startExp = Math.floor(Math.log10(min));
  const endExp = Math.ceil(Math.log10(max));
  for (let e = startExp; e <= endExp; e++) {
    [1, 2, 5].forEach(m => {
      const v = m * Math.pow(10, e);
      if (v >= min * 0.95 && v <= max * 1.05) ticks.push(v);
    });
  }
  return ticks;
}

export const fmt = (n, d = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (n === Infinity) return '∞';
  if (n === -Infinity) return '−∞';
  return Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
};

// -----------------------------------------------------------------------------
// SEL-749M MOTOR THERMAL ELEMENT
// Implementasi persamaan trip-time publik pada Instruction Manual SEL-749M,
// Appendix F, Equation F.10 sampai F.17 (Date Code 20080918).
//
// Catatan penting:
// - I dinyatakan dalam per-unit FLA motor.
// - Persamaan running berlaku untuk SF < I < 2.5.
// - Persamaan starting berlaku untuk 2.5 <= I <= 12.
// - Di atas 12 x FLA, fungsi mengembalikan NaN karena berada di luar rentang
//   persamaan publik Appendix F; koordinasi arus tinggi harus memakai elemen 50P.
// -----------------------------------------------------------------------------

export const SEL749M_METHOD_OPTIONS = [
  { value: 'rating', label: 'Rating Method' },
  { value: 'curve', label: 'Curve Method (1–45)' },
];

export const SEL749M_STATE_OPTIONS = [
  { value: 'hot', label: 'Hot / operating temperature' },
  { value: 'cold', label: 'Cold / ambient temperature' },
];

function safeLogRatio(numerator, denominator) {
  if (!(numerator > 0) || !(denominator > 0)) return NaN;
  const ratio = numerator / denominator;
  if (!(ratio > 1)) return NaN;
  return Math.log(ratio);
}

/**
 * Menghitung RTC otomatis dalam menit.
 * Rating Method diturunkan dari Equation F.13.
 * Curve Method diturunkan dari Equation F.17.
 */
export function sel749mAutoRtcMinutes({ method, sf, lra, lrthot, td, curve }) {
  if (!(sf > 1)) return NaN;
  const i0Hot = 0.9 * sf;

  if (method === 'curve') {
    if (!(curve >= 1 && curve <= 45)) return NaN;
    const denominator = safeLogRatio(36 - i0Hot ** 2, 36 - sf ** 2);
    if (!Number.isFinite(denominator) || denominator <= 0) return NaN;
    // Equation F.17: 60*RTC = 2.5*CURVE / ln(...)
    return (2.5 * curve) / (60 * denominator);
  }

  if (!(lra >= 2.5 && lra <= 12) || !(lrthot > 0) || !(td > 0)) return NaN;
  const denominator = safeLogRatio(lra ** 2 - i0Hot ** 2, lra ** 2 - sf ** 2);
  if (!Number.isFinite(denominator) || denominator <= 0) return NaN;
  // Equation F.13: 60*RTC = To*(TD+0.2) / ln(...)
  return (lrthot * (td + 0.2)) / (60 * denominator);
}

/**
 * Mengembalikan region model SEL-749M untuk arus tertentu.
 */
export function sel749mRegion(currentA, motor) {
  if (!(motor?.fla > 0) || !(currentA > 0)) return 'invalid';
  const I = currentA / motor.fla;
  if (I <= motor.sf) return 'below-pickup';
  if (I < 2.5) return 'running';
  if (I <= 12) return 'starting';
  return 'outside-published-range';
}

/**
 * Menghitung waktu trip thermal 49T SEL-749M dalam detik.
 *
 * motor = {
 *   method: 'rating' | 'curve',
 *   fla, sf,
 *   lra, lrthot, td,
 *   rtcMode: 'auto' | 'manual', rtc,
 *   curve,
 *   initialState: 'hot' | 'cold'
 * }
 */
export function sel749mThermalTime(currentA, motor) {
  const region = sel749mRegion(currentA, motor);
  if (region === 'invalid') return NaN;
  if (region === 'below-pickup') return Infinity;
  if (region === 'outside-published-range') return NaN;

  const I = currentA / motor.fla;
  const I2 = I ** 2;
  const method = motor.method || 'rating';
  const state = motor.initialState || 'hot';

  // Starting element: Equation F.12 untuk Rating Method,
  // Equation F.15/F.16 untuk Curve Method.
  if (region === 'starting') {
    if (method === 'curve') {
      if (!(motor.curve >= 1 && motor.curve <= 45)) return NaN;
      const coefficient = state === 'cold' ? 90 : 75;
      return coefficient * motor.curve / I2;
    }

    if (!(motor.lra >= 2.5 && motor.lra <= 12)) return NaN;
    if (!(motor.lrthot > 0) || !(motor.td > 0)) return NaN;
    return motor.td * motor.lrthot * motor.lra ** 2 / I2;
  }

  // Running element: Equation F.11. Untuk kondisi hot, I0 = 0.9*SF;
  // untuk kondisi cold/testing, I0 = 0.
  const i0 = state === 'cold' ? 0 : 0.9 * motor.sf;
  const logTerm = safeLogRatio(I2 - i0 ** 2, I2 - motor.sf ** 2);
  if (!Number.isFinite(logTerm)) return NaN;

  const rtcMinutes = method === 'curve'
    ? sel749mAutoRtcMinutes(motor)
    : (motor.rtcMode === 'manual' ? motor.rtc : sel749mAutoRtcMinutes(motor));
  if (!(rtcMinutes > 0)) return NaN;

  return 60 * rtcMinutes * logTerm;
}

export function sel749mThermalResult(currentA, motor) {
  const region = sel749mRegion(currentA, motor);
  const rtcMinutes = motor.method === 'curve'
    ? sel749mAutoRtcMinutes(motor)
    : (motor.rtcMode === 'manual' ? motor.rtc : sel749mAutoRtcMinutes(motor));
  return {
    currentA,
    I: motor?.fla > 0 ? currentA / motor.fla : NaN,
    region,
    rtcMinutes,
    time: sel749mThermalTime(currentA, motor),
  };
}

/**
 * Validasi rentang setting berdasarkan SEL-749M Settings Sheets.
 */
export function validateSel749mMotor(motor) {
  const errors = [];
  if (!(motor.fla >= 0.2 && motor.fla <= 5000)) errors.push('FLA harus 0,2–5.000 A.');
  if (!(motor.sf >= 1.01 && motor.sf <= 1.5)) errors.push('Service Factor harus 1,01–1,50.');
  if (!['rating', 'curve'].includes(motor.method)) errors.push('Thermal Method tidak valid.');
  if (!['hot', 'cold'].includes(motor.initialState)) errors.push('Kondisi thermal awal tidak valid.');

  if (motor.method === 'curve') {
    if (!(motor.curve >= 1 && motor.curve <= 45)) errors.push('Curve Number harus 1–45.');
  } else {
    if (!(motor.lra >= 2.5 && motor.lra <= 12)) errors.push('LRA harus 2,5–12,0 × FLA.');
    if (!(motor.lrthot >= 1 && motor.lrthot <= 600)) errors.push('LRTHOT harus 1–600 detik.');
    if (!(motor.td >= 0.1 && motor.td <= 1.5)) errors.push('Acceleration Factor TD harus 0,10–1,50.');
    if (motor.rtcMode === 'manual' && !(motor.rtc >= 1 && motor.rtc <= 2000)) {
      errors.push('RTC manual harus 1–2.000 menit.');
    }
  }
  return errors;
}

/**
 * Mencari margin koordinasi minimum pada rentang arus logaritmik.
 * Margin = t_upstream - t_downstream.
 */
export function scanCoordinationMargin({
  downstreamFn,
  upstreamFn,
  minA,
  maxA,
  points = 320,
  breakpoints = [],
}) {
  if (!(minA > 0) || !(maxA > minA)) {
    return { valid: false, reason: 'Rentang arus grading tidak valid.', samples: 0 };
  }

  const currents = [];
  const logMin = Math.log10(minA);
  const logMax = Math.log10(maxA);
  for (let i = 0; i <= points; i++) {
    currents.push(10 ** (logMin + (logMax - logMin) * i / points));
  }

  // Tambahkan titik tepat di sekitar pickup/peralihan agar minimum tidak terlewat.
  breakpoints.forEach(b => {
    if (!(b > minA && b < maxA)) return;
    [0.9999, 1, 1.0001].forEach(k => currents.push(b * k));
  });
  currents.sort((a, b) => a - b);

  let worst = null;
  let validSamples = 0;
  for (const currentA of currents) {
    const downstreamTime = downstreamFn(currentA);
    const upstreamTime = upstreamFn(currentA);
    if (!Number.isFinite(downstreamTime) || !Number.isFinite(upstreamTime)) continue;
    if (!(downstreamTime > 0) || !(upstreamTime > 0)) continue;

    validSamples += 1;
    const margin = upstreamTime - downstreamTime;
    if (!worst || margin < worst.margin) {
      worst = { currentA, downstreamTime, upstreamTime, margin };
    }
  }

  if (!worst) {
    return {
      valid: false,
      reason: 'Tidak ada daerah operasi yang tumpang tindih pada rentang arus grading.',
      samples: validSamples,
    };
  }

  return { valid: true, ...worst, samples: validSamples };
}

// IEC 60255-8 — model thermal replica motor generik (single time constant).
// Dipertahankan untuk kompatibilitas modul lain. Modul grading SEL-749M tidak
// lagi memakai fungsi ini.
export function motorThermalTime(M, theta0, tauMinutes) {
  if (M <= 1) return Infinity;
  const M2 = M * M;
  const val = (M2 - theta0) / (M2 - 1);
  if (val <= 0) return Infinity;
  return tauMinutes * 60 * Math.log(val);
}
