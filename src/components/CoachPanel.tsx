import { useState, useEffect } from 'react';
import { CLASS_INFO, type MoveReview } from '../lib/coach';
import { formatEval } from '../lib/evaluation';
import { toFrenchSan } from '../lib/chessUtils';

interface Props {
  review: MoveReview | null;
  pending: boolean;
  viewPly: number;
  playerColor: 'w' | 'b';
  testMode: boolean;
  isPlayerTurn: boolean;
  aiThinking: boolean;
  started: boolean;
  gameOver: string | null;
  showBest: boolean;
  onToggleBest: () => void;
  awaitingAnalysis: boolean;
  countdown: { deadline: number | null; total: number } | null;
  onTakeback: () => void;
  onRelease: () => void;
  onHold: () => void;
}

/** Bandeau affiché entre votre coup et la réponse de l'IA. */
function PauseBox({
  awaiting,
  countdown,
  onTakeback,
  onRelease,
  onHold,
}: {
  awaiting: boolean;
  countdown: { deadline: number | null; total: number } | null;
  onTakeback: () => void;
  onRelease: () => void;
  onHold: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!countdown?.deadline) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [countdown?.deadline]);

  const remaining = countdown?.deadline ? Math.max(0, countdown.deadline - now) : null;
  return (
    <div className="pausebox" role="status">
      <div className="pausebox-text">
        {awaiting
          ? 'Analyse de votre coup…'
          : remaining !== null
            ? `L’adversaire répond dans ${Math.ceil(remaining / 1000)} s`
            : 'En pause : l’adversaire attend votre signal.'}
      </div>
      {countdown?.deadline && (
        <div className="pausebar">
          <div
            key={countdown.deadline}
            style={{ animationDuration: `${countdown.total}ms` }}
          />
        </div>
      )}
      <div className="pausebox-actions">
        <button className="btn ghost sm" onClick={onTakeback}>
          ↶ Reprendre
        </button>
        {countdown?.deadline && (
          <button className="btn ghost sm" onClick={onHold}>
            Pause
          </button>
        )}
        {!awaiting && (
          <button className="btn primary sm" onClick={onRelease} title="Raccourci : Espace">
            {countdown?.deadline ? 'Jouer' : 'Continuer'}
          </button>
        )}
      </div>
    </div>
  );
}

export function CoachPanel(p: Props) {
  const [reveal, setReveal] = useState(false);
  useEffect(() => setReveal(false), [p.viewPly]);

  const pausing = !p.testMode && (p.awaitingAnalysis || !!p.countdown);
  const status = !p.started
    ? 'Choisissez un adversaire pour commencer.'
    : p.gameOver
      ? p.gameOver
      : pausing
        ? 'Lisez l’analyse de votre coup.'
        : p.aiThinking
        ? 'L’adversaire réfléchit…'
        : p.isPlayerTurn
          ? 'À vous de jouer.'
          : 'Navigation dans la partie.';

  let body: JSX.Element;
  if (p.testMode) {
    body = (
      <div className="coach-empty">
        <p className="coach-voice">Mode test activé.</p>
        <p className="muted">
          Les conseils et l’évaluation sont masqués. L’analyse continue en arrière-plan : réactivez les
          conseils à tout moment, ou consultez le bilan en fin de partie.
        </p>
      </div>
    );
  } else if (p.viewPly === 0) {
    body = (
      <div className="coach-empty">
        <p className="coach-voice">
          Jouez votre coup : je vous dirai s’il est bon, pourquoi, et ce que Stockfish aurait préféré.
        </p>
        <p className="muted">Astuce : ← → pour naviguer, T pour basculer en mode test.</p>
      </div>
    );
  } else if (!p.review) {
    body = (
      <div className="coach-empty">
        <p className="coach-voice">Analyse du coup…</p>
        <div className="shimmer" />
        <div className="shimmer short" />
      </div>
    );
  } else {
    const r = p.review;
    const info = CLASS_INFO[r.classification];
    const mine = r.color === p.playerColor;
    const badMove = ['inaccuracy', 'mistake', 'blunder'].includes(r.classification);
    const oppErred = !mine && ['mistake', 'blunder'].includes(r.classification);
    body = (
      <div className="coach-review" key={r.ply}>
        <div className="coach-head">
          <span className="badge" style={{ background: info.color }} aria-hidden>
            {info.symbol}
          </span>
          <div>
            <div className="coach-class" style={{ color: info.color }}>
              {info.label}
            </div>
            <div className="coach-move">
              {mine ? 'Votre coup' : 'Coup de l’adversaire'} :{' '}
              <strong>{toFrenchSan(r.san)}</strong>
            </div>
          </div>
          <div className="coach-delta" title="Évaluation avant → après">
            {formatEval(r.evalBefore)} <span aria-hidden>→</span> {formatEval(r.evalAfter)}
          </div>
        </div>

        <p className="coach-voice">{r.explanation}</p>

        {badMove && r.bestSan && (
          <div className="alt">
            <div className="alt-row">
              <span className="muted">Meilleur coup</span>
              <strong className="alt-move">{toFrenchSan(r.bestSan)}</strong>
              <button className="link" onClick={p.onToggleBest} aria-pressed={p.showBest}>
                {p.showBest ? 'Masquer la flèche' : 'Voir sur l’échiquier'}
              </button>
            </div>
            {r.bestLine && <div className="alt-line">{r.bestLine}</div>}
          </div>
        )}

        {oppErred && r.replyUci && (
          <div className="alt opportunity">
            <div className="alt-row">
              <span>L’adversaire s’est trompé : un coup en profite.</span>
              {!reveal ? (
                <button className="link" onClick={() => setReveal(true)}>
                  Révéler
                </button>
              ) : (
                <strong className="alt-move">{r.replyLine.split(' ').slice(0, 2).join(' ')}</strong>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="coach" aria-live="polite" aria-label="Entraîneur">
      <header className="coach-title">
        <h2>Entraîneur</h2>
        <span className={`status ${p.aiThinking && !pausing ? 'thinking' : ''}`}>{status}</span>
      </header>
      {pausing && (
        <PauseBox
          awaiting={p.awaitingAnalysis}
          countdown={p.countdown}
          onTakeback={p.onTakeback}
          onRelease={p.onRelease}
          onHold={p.onHold}
        />
      )}
      {body}
      {p.pending && !p.testMode && <div className="analysis-progress">Analyse Stockfish en cours…</div>}
    </section>
  );
}
