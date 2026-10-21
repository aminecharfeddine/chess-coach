import { CLASS_INFO, THEME_INFO, type Classification, type MoveReview } from '../lib/coach';
import type { GameReport } from '../lib/review';
import { barFraction, formatEval } from '../lib/evaluation';
import { PHASE_LABEL, toFrenchSan } from '../lib/chessUtils';

interface Props {
  report: GameReport;
  reviews: (MoveReview | null)[];
  result: string | null;
  playerColor: 'w' | 'b';
  elo: number;
  pending: number;
  onJump: (ply: number) => void;
  onClose: () => void;
  onNewGame: () => void;
}

const ORDER: Classification[] = ['best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];

const moveLabel = (r: MoveReview) =>
  `${Math.floor(r.ply / 2) + 1}${r.color === 'w' ? '.' : '…'} ${toFrenchSan(r.san)}`;

export function ReviewDialog({ report, reviews, result, playerColor, elo, pending, onJump, onClose, onNewGame }: Props) {
  const acc = (v: number | null) => (v === null ? '-' : `${Math.round(v)} %`);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="rv-title" onClick={onClose}>
      <div className="dialog review" onClick={(e) => e.stopPropagation()}>
        <header className="review-head">
          <div>
            <h2 id="rv-title">Bilan de la partie</h2>
            <p className="muted">Contre Stockfish {elo}. {result ?? 'Partie en cours.'}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer le bilan">
            ✕
          </button>
        </header>

        {pending > 0 && (
          <p className="notice">Analyse en cours ({pending} position{pending > 1 ? 's' : ''} restante{pending > 1 ? 's' : ''}) : le bilan se complète automatiquement.</p>
        )}

        <div className="acc-grid">
          <div className="acc you">
            <span className="acc-num">{acc(report.player.accuracy)}</span>
            <span>Votre précision</span>
          </div>
          <div className="acc">
            <span className="acc-num">{acc(report.opponent.accuracy)}</span>
            <span>Précision de l’adversaire</span>
          </div>
        </div>

        <EvalGraph reviews={reviews} playerColor={playerColor} onJump={onJump} />

        <table className="counts">
          <thead>
            <tr>
              <th />
              <th>Vous</th>
              <th>Adversaire</th>
            </tr>
          </thead>
          <tbody>
            {ORDER.map((c) => (
              <tr key={c}>
                <td>
                  <span className="badge sm" style={{ background: CLASS_INFO[c].color }} aria-hidden>
                    {CLASS_INFO[c].symbol}
                  </span>
                  {CLASS_INFO[c].label}
                </td>
                <td>{report.player.counts[c]}</td>
                <td>{report.opponent.counts[c]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section>
          <h3>Moments clés à revoir</h3>
          {report.keyMistakes.length === 0 ? (
            <p className="muted">Aucune erreur notable. Bravo !</p>
          ) : (
            <ul className="key-list">
              {report.keyMistakes.map((r) => (
                <li key={r.ply}>
                  <button className="key-item" onClick={() => onJump(r.ply + 1)}>
                    <span className="badge sm" style={{ background: CLASS_INFO[r.classification].color }} aria-hidden>
                      {CLASS_INFO[r.classification].symbol}
                    </span>
                    <span className="key-main">
                      <strong>{moveLabel(r)}</strong>
                      <span className="muted">
                        {' '}
                        {formatEval(r.evalBefore)} → {formatEval(r.evalAfter)}
                        {r.bestSan && <> ; meilleur : {toFrenchSan(r.bestSan)}</>}
                      </span>
                      <span className="key-expl">{r.explanation}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3>Axes de progression</h3>
          {report.themes.length > 0 && (
            <div className="themes">
              {report.themes.map((t) => (
                <span key={t.theme} className="theme">
                  {THEME_INFO[t.theme].label} <b>×{t.count}</b>
                </span>
              ))}
            </div>
          )}
          <ul className="advice">
            {report.advice.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
          {report.phases.length > 0 && (
            <div className="phases">
              {report.phases.map((p) => (
                <div key={p.phase} className="phase">
                  <span className="phase-name">{PHASE_LABEL[p.phase]}</span>
                  <div className="phase-bar">
                    <div style={{ width: `${p.accuracy}%` }} />
                  </div>
                  <span className="phase-val">{Math.round(p.accuracy)} %</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="dialog-actions">
          <button className="btn ghost" onClick={onClose}>
            Revoir la partie
          </button>
          <button className="btn primary" onClick={onNewGame}>
            Nouvelle partie
          </button>
        </div>
      </div>
    </div>
  );
}

function EvalGraph({
  reviews,
  playerColor,
  onJump,
}: {
  reviews: (MoveReview | null)[];
  playerColor: 'w' | 'b';
  onJump: (ply: number) => void;
}) {
  const W = 560;
  const H = 120;
  const n = reviews.length;
  if (!n) return null;
  const pts: [number, number][] = [[0, H / 2]];
  reviews.forEach((r, i) => {
    const f = r ? barFraction(r.evalAfter) : null;
    const y = f === null ? pts[pts.length - 1][1] : H - f * H;
    pts.push([((i + 1) / n) * W, y]);
  });
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <figure className="graph">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Courbe d’évaluation de la partie">
        <rect width={W} height={H} className="graph-black" />
        <path d={area} className="graph-white" />
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="graph-mid" />
        {reviews.map((r, i) =>
          r && r.color === playerColor && ['mistake', 'blunder', 'inaccuracy'].includes(r.classification) ? (
            <circle
              key={i}
              cx={pts[i + 1][0]}
              cy={pts[i + 1][1]}
              r={r.classification === 'inaccuracy' ? 3.5 : 5}
              fill={CLASS_INFO[r.classification].color}
              className="graph-dot"
              onClick={() => onJump(i + 1)}
            >
              <title>{`${toFrenchSan(r.san)} : ${CLASS_INFO[r.classification].label}`}</title>
            </circle>
          ) : null,
        )}
      </svg>
      <figcaption className="muted small">Courbe d’évaluation (zone claire = avantage Blancs). Cliquez un point pour revoir le coup.</figcaption>
    </figure>
  );
}
