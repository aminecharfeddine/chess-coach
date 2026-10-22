import { useState, useEffect } from 'react';
import { CLASS_INFO, type MoveReview } from '../lib/coach';
import { formatEval } from '../lib/evaluation';
import { readableMove, toFrenchSan } from '../lib/chessUtils';
import { pieceUrl } from '../lib/themes';
import type { Move } from 'chess.js';
import { IconUndo } from './Icons';

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
  onNewGame: () => void;
  /** Dossier du jeu de pièces affiché (pour les icônes) */
  pieceFolder: string;
  /** Message quand le coup affiché n'est pas commenté (réglage de la partie) */
  silentNote: string | null;
  /** Revenir sur le coup commenté quand on affiche un commentaire précédent */
  onJump: (ply: number) => void;
}

/** Bloc « coup lisible » : icône de la pièce, départ → arrivée, détails, notation en petit. */
function MoveCard({ m, folder, tone }: { m: Move; folder: string; tone: 'best' | 'played' | 'chance' }) {
  const r = readableMove(m);
  return (
    <div className={`movecard ${tone}`}>
      <img className="movecard-piece" src={pieceUrl(folder, m.color + m.piece.toUpperCase())} alt="" />
      <div className="movecard-text">
        <span className="movecard-title">{r.title}</span>
        <span className="movecard-details">
          {r.details.length > 0 && <span className="movecard-detail">{r.details.join(', ')}</span>}
          <span className="movecard-san" title="Notation utilisée dans la liste des coups">
            Notation : {toFrenchSan(m.san)}
          </span>
        </span>
      </div>
    </div>
  );
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
        <button className="btn ghost sm with-icon" onClick={onTakeback}>
          <IconUndo width={15} height={15} />
          Reprendre
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
    ? 'Prêt à jouer'
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
  if (!p.started) {
    body = (
      <div className="coach-empty welcome">
        <p className="coach-voice">
          Choisissez le niveau de Stockfish, votre couleur, et si vous voulez être conseillé pendant la partie.
        </p>
        <button className="btn primary" onClick={p.onNewGame}>
          Nouvelle partie
        </button>
      </div>
    );
  } else if (p.testMode) {
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
  } else if (p.silentNote) {
    body = (
      <div className="coach-empty">
        <p className="coach-voice">{p.silentNote}</p>
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
    // Commentaire d'un coup précédent (le coup adverse affiché n'est pas commenté)
    const isCurrent = r.ply === p.viewPly - 1;
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
              {mine ? 'Votre coup' : 'Adversaire'} : <strong>{readableMove(r.move).title}</strong>
            </div>
          </div>
          <div className="coach-delta" title="Évaluation avant → après">
            {formatEval(r.evalBefore)} <span aria-hidden>→</span> {formatEval(r.evalAfter)}
          </div>
        </div>

        <p className="coach-voice">{r.explanation}</p>

        {badMove && r.bestMove && (
          <div className="alt">
            <div className="alt-head">
              <span>{mine ? 'Il fallait jouer' : 'Meilleur coup'}</span>
              {isCurrent ? (
                <button className="link" onClick={p.onToggleBest} aria-pressed={p.showBest}>
                  {p.showBest ? 'Masquer la flèche' : 'Montrer sur l’échiquier'}
                </button>
              ) : (
                <button className="link" onClick={() => p.onJump(r.ply + 1)}>
                  Revoir sur l’échiquier
                </button>
              )}
            </div>
            <MoveCard m={r.bestMove} folder={p.pieceFolder} tone="best" />
            {isCurrent && p.showBest && (
              <p className="alt-hint">La flèche verte sur l’échiquier montre ce coup.</p>
            )}
            {r.bestLine && (
              <details className="alt-line">
                <summary>Suite prévue par Stockfish</summary>
                {r.bestLine}
              </details>
            )}
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
                null
              )}
            </div>
            {reveal && r.replyMove && <MoveCard m={r.replyMove} folder={p.pieceFolder} tone="chance" />}
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
      {p.pending && !p.testMode && (
        <div className="analysis-progress">
          <span className="spinner" aria-hidden /> Stockfish analyse…
        </div>
      )}
    </section>
  );
}
