// Kurva IDMT (standar TMS): IEC 60255-151 & IEEE C37.112
export const CURVES = {
  'IEC-SI':  { std: 'IEC 60255-151', name: 'Standard Inverse (SI)',   label: 'IEC 60255-151 — Standard Inverse (SI)',   type: 'iec',  K: 0.14, a: 0.02 },
  'IEC-VI':  { std: 'IEC 60255-151', name: 'Very Inverse (VI)',       label: 'IEC 60255-151 — Very Inverse (VI)',       type: 'iec',  K: 13.5, a: 1 },
  'IEC-EI':  { std: 'IEC 60255-151', name: 'Extremely Inverse (EI)',  label: 'IEC 60255-151 — Extremely Inverse (EI)',  type: 'iec',  K: 80,   a: 2 },
  'IEEE-MI': { std: 'IEEE C37.112',  name: 'Moderately Inverse (MI)', label: 'IEEE C37.112 — Moderately Inverse (MI)',  type: 'ieee', A: 0.0515, B: 0.1140, p: 0.02 },
  'IEEE-VI': { std: 'IEEE C37.112',  name: 'Very Inverse (VI)',       label: 'IEEE C37.112 — Very Inverse (VI)',        type: 'ieee', A: 19.61,  B: 0.491,  p: 2 },
  'IEEE-EI': { std: 'IEEE C37.112',  name: 'Extremely Inverse (EI)',  label: 'IEEE C37.112 — Extremely Inverse (EI)',   type: 'ieee', A: 28.2,   B: 0.1217, p: 2 },
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
  if (M <= 1.001) return Infinity;
  return c.type === 'iec' ? dial * c.K / (Math.pow(M, c.a) - 1) : dial * (c.A / (Math.pow(M, c.p) - 1) + c.B);
}
export function solveDial(curveKey, targetT, M) {
  const c = CURVES[curveKey];
  if (M <= 1.001) return NaN;
  return c.type === 'iec' ? targetT * (Math.pow(M, c.a) - 1) / c.K : targetT / (c.A / (Math.pow(M, c.p) - 1) + c.B);
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
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
};
