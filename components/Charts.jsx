'use client';
import { buildTCCGeometry, buildTCCAmpsGeometry, buildDiffGeometry } from '../lib/charts';

function AxisLabel({ x, y, children, anchor = 'middle', fill, rotate }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="axis-label" fill={fill}
      transform={rotate ? `rotate(-90 ${x} ${y})` : undefined}>
      {children}
    </text>
  );
}

export function TCCChart({ curves, coord }) {
  const g = buildTCCGeometry(curves, coord);
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} className="chart-svg">
      {g.xTicks.map(t => (
        <g key={'x' + t.v}>
          <line x1={t.x} y1={g.MT} x2={t.x} y2={g.MT + g.ph} stroke={t.v === 1 ? '#2A333A' : '#1B2126'} />
          <AxisLabel x={t.x} y={g.MT + g.ph + 16}>{t.label}</AxisLabel>
        </g>
      ))}
      {g.yTicks.map(t => (
        <g key={'y' + t.v}>
          <line x1={g.ML} y1={t.y} x2={g.ML + g.pw} y2={t.y} stroke="#1B2126" />
          <AxisLabel x={g.ML - 8} y={t.y + 3} anchor="end">{t.label}</AxisLabel>
        </g>
      ))}
      <AxisLabel x={g.ML + g.pw / 2} y={g.H - 6}>Kelipatan arus pickup (M = I / Is)</AxisLabel>
      <AxisLabel x={14} y={g.MT + g.ph / 2} rotate>Waktu trip (detik)</AxisLabel>
      {g.paths.map((p, i) => <path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth="2.2" />)}
      {g.point && (
        <>
          <circle cx={g.point.x} cy={g.point.y} r="4.5" fill="var(--void)" stroke="var(--cyan)" strokeWidth="2" />
          <AxisLabel x={g.point.x + 8} y={g.point.y - 8} anchor="start" fill="var(--cyan)">{g.point.label}</AxisLabel>
        </>
      )}
    </svg>
  );
}

export function TCCAmpsChart({ curves, evalA }) {
  const g = buildTCCAmpsGeometry(curves, evalA);
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} className="chart-svg">
      {g.xTicks.map(t => (
        <g key={'x' + t.v}>
          <line x1={t.x} y1={g.MT} x2={t.x} y2={g.MT + g.ph} stroke="#1B2126" />
          <AxisLabel x={t.x} y={g.MT + g.ph + 16}>{t.label}</AxisLabel>
        </g>
      ))}
      {g.yTicks.map(t => (
        <g key={'y' + t.v}>
          <line x1={g.ML} y1={t.y} x2={g.ML + g.pw} y2={t.y} stroke="#1B2126" />
          <AxisLabel x={g.ML - 8} y={t.y + 3} anchor="end">{t.label}</AxisLabel>
        </g>
      ))}
      <AxisLabel x={g.ML + g.pw / 2} y={g.H - 6}>Arus (A)</AxisLabel>
      <AxisLabel x={16} y={g.MT + g.ph / 2} rotate>Waktu trip (detik)</AxisLabel>
      {g.paths.map((p, i) => (
        <g key={i}>
          <path d={p.d} fill="none" stroke={p.color} strokeWidth="2.2" />
          <circle cx={p.dot.x} cy={p.dot.y} r="4" fill="var(--void)" stroke={p.color} strokeWidth="2" />
        </g>
      ))}
      <line x1={g.evalX} y1={g.MT} x2={g.evalX} y2={g.MT + g.ph} stroke="var(--cyan)" strokeWidth="1.3" strokeDasharray="4,3" />
      <AxisLabel x={g.evalX + 6} y={g.MT + 12} anchor="start" fill="var(--cyan)">I evaluasi</AxisLabel>
    </svg>
  );
}

export function DiffChart({ curves, xMax = 8 }) {
  const g = buildDiffGeometry(curves, xMax);
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} className="chart-svg">
      {g.xTicks.map(t => (
        <g key={'x' + t.v}>
          <line x1={t.x} y1={g.MT} x2={t.x} y2={g.MT + g.ph} stroke="#1B2126" />
          <AxisLabel x={t.x} y={g.MT + g.ph + 16}>{t.v}</AxisLabel>
        </g>
      ))}
      {g.yTicks.map(t => (
        <g key={'y' + t.v}>
          <line x1={g.ML} y1={t.y} x2={g.ML + g.pw} y2={t.y} stroke="#1B2126" />
          <AxisLabel x={g.ML - 8} y={t.y + 3} anchor="end">{t.v.toFixed(1)}</AxisLabel>
        </g>
      ))}
      <AxisLabel x={g.ML + g.pw / 2} y={g.H - 6}>Arus restraint / bias (pu × In)</AxisLabel>
      <AxisLabel x={16} y={g.MT + g.ph / 2} rotate>Arus differential / operate (pu × In)</AxisLabel>
      <path d={g.fillPath} fill={g.fillColor} fillOpacity="0.10" stroke="none" />
      <AxisLabel x={g.ML + g.pw - 8} y={g.MT + 16} anchor="end" fill={g.fillColor}>DAERAH OPERASI (TRIP)</AxisLabel>
      <AxisLabel x={g.ML + 8} y={g.MT + g.ph - 10} anchor="start">DAERAH RESTRAINT (TIDAK TRIP)</AxisLabel>
      {g.paths.map((p, i) => (
        <g key={i}>
          <path d={p.d} fill="none" stroke={p.color} strokeWidth={p.primary ? 2.4 : 1.8} strokeDasharray={p.primary ? undefined : '6,4'} />
          <circle cx={p.dot.x} cy={p.dot.y} r="3" fill="var(--void)" stroke={p.color} strokeWidth="1.6" />
        </g>
      ))}
    </svg>
  );
}
