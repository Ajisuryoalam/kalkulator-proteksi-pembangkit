'use client';
import { fmt } from '../lib/curves';

export default function ResultsPanel({ groups }) {
  return (
    <div>
      {groups.map((g, gi) => (
        <div className="result-group" key={gi}>
          <div className="result-group-title">{g.group}</div>
          {g.items.map((it, ii) => {
            if (it.flag) {
              return <div key={ii} className={it.flag === 'warn' ? 'flag-warn' : 'flag-ok'}>{it.note}</div>;
            }
            return (
              <div className="result-row" key={ii}>
                <div>
                  <div className="result-label">{it.label}</div>
                  {it.formula ? <div className="result-formula">{it.formula}</div> : null}
                </div>
                <div className="result-value">
                  {it.value === null ? '—' : fmt(it.value, Math.abs(it.value) < 10 ? 2 : 1)}
                  <span className="u">{it.unit || ''}</span>
                </div>
                {it.note ? <div className="result-note">{it.note}</div> : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
