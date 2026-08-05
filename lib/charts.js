import { CURVES, timeAt, diffThreshold, niceTicks, fmt } from './curves';

// ---- TCC log-log (kelipatan pickup) ----
export function buildTCCGeometry(curves, coord) {
  const W = 640, H = 400, ML = 54, MR = 16, MT = 14, MB = 40;
  const pw = W - ML - MR, ph = H - MT - MB;
  const xMin = 1, xMax = 30, yMin = 0.01, yMax = 100;
  const xLog = v => ML + (Math.log10(v) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin)) * pw;
  const yLog = v => MT + ph - (Math.log10(v) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin)) * ph;
  const xTicks = [1, 2, 3, 5, 10, 20, 30].map(v => ({ v, x: xLog(v), label: `${v}×` }));
  const yTicks = [0.01, 0.1, 1, 10, 100].map(v => ({ v, y: yLog(v), label: `${v >= 1 ? v : v.toFixed(2)}s` }));
  const paths = curves.filter(c => c.dial && !isNaN(c.dial)).map(cv => {
    let d = '';
    for (let i = 0; i <= 120; i++) {
      const M = Math.pow(10, Math.log10(1.02) + (Math.log10(xMax) - Math.log10(1.02)) * i / 120);
      let t = timeAt(cv.curveKey, cv.dial, M);
      t = Math.max(yMin, Math.min(yMax, t));
      d += (i === 0 ? 'M' : 'L') + xLog(M).toFixed(1) + ',' + yLog(t).toFixed(1) + ' ';
    }
    return { d, color: cv.color };
  });
  let point = null;
  if (coord && coord.M > 1) {
    point = { x: xLog(coord.M), y: yLog(Math.max(yMin, Math.min(yMax, coord.t))), label: coord.label };
  }
  return { W, H, ML, MT, ph, pw, xTicks, yTicks, paths, point };
}

function buildSegmentedPath({ xMin, xMax, xLog, yLog, yMin, yMax, timeFn, samples = 220 }) {
  let d = '';
  let segmentOpen = false;
  for (let i = 0; i <= samples; i++) {
    const I = 10 ** (Math.log10(xMin) + (Math.log10(xMax) - Math.log10(xMin)) * i / samples);
    const tRaw = timeFn(I);
    if (!Number.isFinite(tRaw) || !(tRaw > 0)) {
      segmentOpen = false;
      continue;
    }
    const t = Math.max(yMin, Math.min(yMax, tRaw));
    d += `${segmentOpen ? 'L' : 'M'}${xLog(I).toFixed(1)},${yLog(t).toFixed(1)} `;
    segmentOpen = true;
  }
  return d;
}

// ---- Overlay TCC dalam satuan Ampere aktual ----
export function buildTCCAmpsGeometry(curves, evalA) {
  const W = 720, H = 460, ML = 68, MR = 18, MT = 16, MB = 44;
  const pw = W - ML - MR, ph = H - MT - MB;

  const referenceCurrents = curves.flatMap(c => [c.pickup, c.at, c.maxCurrent]).filter(v => Number.isFinite(v) && v > 0);
  const safeEval = Number.isFinite(evalA) && evalA > 0 ? evalA : 1;
  const baseMin = referenceCurrents.length ? Math.min(...referenceCurrents) : safeEval;
  const baseMax = referenceCurrents.length ? Math.max(...referenceCurrents) : safeEval;
  const xMin = Math.max(0.01, Math.min(baseMin * 0.65, safeEval * 0.8));
  const xMax = Math.max(baseMax * 1.25, safeEval * 1.4, xMin * 10);
  const yMin = 0.01, yMax = 100000;

  const xLog = v => ML + (Math.log10(v) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin)) * pw;
  const yLog = v => MT + ph - (Math.log10(v) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin)) * ph;
  const xTicks = niceTicks(xMin, xMax).map(v => ({
    v,
    x: xLog(v),
    label: v >= 1000 ? `${fmt(v / 1000, 1)}k` : fmt(v, v < 10 ? 1 : 0),
  }));
  const yTickValues = [0.01, 0.1, 1, 10, 100, 1000, 10000, 100000];
  const yTicks = yTickValues.map(v => ({
    v,
    y: yLog(v),
    label: v >= 1000 ? `${fmt(v / 1000, 0)}k s` : `${v >= 1 ? v : v.toFixed(2)}s`,
  }));

  const getT = (cv, I) => cv.timeFn ? cv.timeFn(I) : timeAt(cv.curveKey, cv.dial, I / cv.pickup);
  const paths = curves.map(cv => {
    if (cv.kind === 'vertical') {
      const x = xLog(cv.at);
      return {
        d: `M${x.toFixed(1)},${yLog(yMin).toFixed(1)} L${x.toFixed(1)},${yLog(yMax).toFixed(1)}`,
        color: cv.color,
        dashed: true,
        dot: null,
      };
    }

    const d = buildSegmentedPath({ xMin, xMax, xLog, yLog, yMin, yMax, timeFn: I => getT(cv, I) });
    const tEvalRaw = getT(cv, safeEval);
    const dot = Number.isFinite(tEvalRaw) && tEvalRaw > 0
      ? { x: xLog(safeEval), y: yLog(Math.max(yMin, Math.min(yMax, tEvalRaw))) }
      : null;
    return { d, color: cv.color, dashed: !!cv.dashed, dot };
  });

  const evalX = xLog(safeEval);
  return { W, H, ML, MT, ph, pw, xTicks, yTicks, paths, evalX };
}

// ---- Kurva slope differential 87T (linear, pu) ----
export function buildDiffGeometry(curves, xMax) {
  const W = 640, H = 400, ML = 54, MR = 16, MT = 14, MB = 40;
  const pw = W - ML - MR, ph = H - MT - MB;
  let yMax = 1;
  curves.forEach(c => { yMax = Math.max(yMax, diffThreshold(c.is, c.s1, c.bp1, c.s2, xMax)); });
  yMax = Math.ceil(yMax * 1.15 * 2) / 2;
  const xS = v => ML + (v / xMax) * pw;
  const yS = v => MT + ph - (v / yMax) * ph;
  const xStep = xMax <= 6 ? 1 : 2;
  const xTicks = [];
  for (let gx = 0; gx <= xMax; gx += xStep) xTicks.push({ v: gx, x: xS(gx) });
  const yStep = yMax <= 4 ? 0.5 : 1;
  const yTicks = [];
  for (let gy = 0; gy <= yMax + 0.001; gy += yStep) yTicks.push({ v: gy, y: yS(gy) });
  const N = 80;
  const primary = curves.find(c => c.primary) || curves[0];
  let dFill = `M${xS(0).toFixed(1)},${yS(yMax).toFixed(1)} `;
  for (let i = 0; i <= N; i++) {
    const Ir = xMax * i / N;
    const t = Math.min(diffThreshold(primary.is, primary.s1, primary.bp1, primary.s2, Ir), yMax);
    dFill += `L${xS(Ir).toFixed(1)},${yS(t).toFixed(1)} `;
  }
  dFill += `L${xS(xMax).toFixed(1)},${yS(yMax).toFixed(1)} Z`;
  const paths = curves.map(c => {
    let d = '';
    for (let i = 0; i <= N; i++) {
      const Ir = xMax * i / N;
      const t = Math.min(diffThreshold(c.is, c.s1, c.bp1, c.s2, Ir), yMax);
      d += (i === 0 ? 'M' : 'L') + xS(Ir).toFixed(1) + ',' + yS(t).toFixed(1) + ' ';
    }
    const bx = xS(c.bp1), by = yS(Math.min(diffThreshold(c.is, c.s1, c.bp1, c.s2, c.bp1), yMax));
    return { d, color: c.color, primary: !!c.primary, dot: { x: bx, y: by } };
  });
  return { W, H, ML, MT, ph, pw, xTicks, yTicks, paths, fillPath: dFill, fillColor: primary.color };
}
