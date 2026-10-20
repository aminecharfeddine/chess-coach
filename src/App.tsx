import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, type Move, type Square } from 'chess.js';
import { Opponent, eloLabel } from './engine/opponent';
import { Analyst } from './engine/analyst';
import type { PositionAnalysis } from './lib/evaluation';
import { reviewMove, CLASS_INFO, type MoveReview } from './lib/coach';
import { buildReport } from './lib/review';
import { START_FEN, parseUci, turnOf } from './lib/chessUtils';
import { EvalBar } from './components/EvalBar';
import { CoachPanel } from './components/CoachPanel';
import { MoveList } from './components/MoveList';
import { NewGameDialog, type GameSettings } from './components/NewGameDialog';
import { ReviewDialog } from './components/ReviewDialog';

const EVAL_GUTTER = 42; // largeur barre d'évaluation + espace
const SETTINGS_KEY = 'eldrachess.settings';
const TESTMODE_KEY = 'eldrachess.testMode';

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { elo: 1200, color: 'w', depth: 16, ...JSON.parse(raw) };
  } catch {
    /* stockage indisponible */
  }
  return { elo: 1200, color: 'w', depth: 16 };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Petite pastille de classification dessinée dans le coin de la case d'arrivée. */
function badgeImage(color: string, symbol: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='82' cy='18' r='15' fill='${color}' stroke='white' stroke-width='3'/><text x='82' y='24.5' font-family='Arial' font-weight='700' font-size='${symbol.length > 1 ? 15 : 19}' fill='white' text-anchor='middle'>${symbol}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [started, setStarted] = useState(false);
  const [moves, setMoves] = useState<Move[]>([]);
  const [view, setView] = useState(0);
  const [analyses, setAnalyses] = useState<Record<string, PositionAnalysis>>({});
  const [testMode, setTestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TESTMODE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [resigned, setResigned] = useState(false);
  const [showNewGame, setShowNewGame] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [showBest, setShowBest] = useState(true);
  const [pending, setPending] = useState(0);
  const reviewShownFor = useRef<number>(-1);
  const gameId = useRef(0);

  // --- Moteurs (deux workers Stockfish distincts) ---
  const opponentRef = useRef<Opponent | null>(null);
  const analystRef = useRef<Analyst | null>(null);
  useEffect(() => {
    const analyst = new Analyst(settings.depth, (a) => {
      setAnalyses((prev) => ({ ...prev, [a.fen]: a }));
      setPending(analyst.pending);
    });
    const opponent = new Opponent();
    analystRef.current = analyst;
    opponentRef.current = opponent;
    return () => {
      analyst.destroy();
      opponent.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TESTMODE_KEY, testMode ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [testMode]);

  // --- État de la partie ---
  const game = useMemo(() => {
    const c = new Chess();
    moves.forEach((m) => c.move(m.san));
    return c;
  }, [moves]);
  const tipFen = game.fen();
  const viewFen = view === 0 ? START_FEN : moves[view - 1].after;
  const atTip = view === moves.length;
  const viewTurn = turnOf(viewFen);
  const aiColor = playerColor === 'w' ? 'b' : 'w';

  const gameOver: string | null = useMemo(() => {
    if (resigned) return `Vous avez abandonné. ${playerColor === 'w' ? '0-1' : '1-0'}`;
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'b' : 'w';
      return winner === playerColor ? 'Échec et mat : vous gagnez !' : 'Échec et mat : l’adversaire gagne.';
    }
    if (game.isStalemate()) return 'Pat : partie nulle.';
    if (game.isThreefoldRepetition()) return 'Triple répétition : partie nulle.';
    if (game.isInsufficientMaterial()) return 'Matériel insuffisant : partie nulle.';
    if (game.isDrawByFiftyMoves()) return 'Règle des 50 coups : partie nulle.';
    return null;
  }, [game, resigned, playerColor]);

  // --- Demandes d'analyse ---
  useEffect(() => {
    const a = analystRef.current;
    if (!a || !started) return;
    a.request([START_FEN, ...moves.map((m) => m.after)]);
    setPending(a.pending);
  }, [moves, started]);

  useEffect(() => {
    const a = analystRef.current;
    if (!a) return;
    if (view > 0) a.prioritize(moves[view - 1].before);
    a.prioritize(viewFen);
  }, [view, viewFen, moves]);

  // --- Coup de l'IA ---
  useEffect(() => {
    if (!started || gameOver || game.turn() !== aiColor) return;
    const opponent = opponentRef.current;
    if (!opponent) return;
    let cancelled = false;
    const fen = tipFen;
    const t0 = performance.now();
    setAiThinking(true);
    opponent
      .pickMove(fen, settings.elo)
      .then(async (uci) => {
        const elapsed = performance.now() - t0;
        if (elapsed < 450) await sleep(450 - elapsed); // rythme naturel
        if (cancelled || !uci) return;
        const c = new Chess(fen);
        let m: Move;
        try {
          m = c.move(parseUci(uci));
        } catch {
          return;
        }
        setMoves((prev) => {
          const prevTip = prev.length ? prev[prev.length - 1].after : START_FEN;
          if (prevTip !== fen) return prev;
          setView((v) => (v === prev.length ? prev.length + 1 : v));
          return [...prev, m];
        });
      })
      .finally(() => {
        if (!cancelled) setAiThinking(false);
      });
    return () => {
      cancelled = true;
      opponent.stop();
      setAiThinking(false);
    };
  }, [started, gameOver, game, aiColor, tipFen, settings.elo]);

  // --- Revues des coups ---
  const reviews: (MoveReview | null)[] = useMemo(
    () =>
      moves.map((m, i) => {
        const before = analyses[m.before];
        const after = analyses[m.after];
        if (!before || !after) return null;
        return reviewMove(i, m, before, after, m.color === playerColor);
      }),
    [moves, analyses, playerColor],
  );
  const report = useMemo(() => buildReport(reviews, playerColor), [reviews, playerColor]);
  const currentReview = view > 0 ? reviews[view - 1] : null;

  // Ouvre le bilan automatiquement à la fin de la partie (une fois l'analyse terminée)
  useEffect(() => {
    if (gameOver && report.complete && reviewShownFor.current !== gameId.current) {
      reviewShownFor.current = gameId.current;
      setShowReview(true);
    }
  }, [gameOver, report.complete]);

  useEffect(() => setShowBest(true), [view]);

  // --- Actions ---
  const startGame = (s: GameSettings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
    const color = s.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : s.color;
    opponentRef.current?.stop();
    void opponentRef.current?.newGame();
    if (analystRef.current?.setDepth(s.depth)) setAnalyses({});
    gameId.current++;
    setSettings(s);
    setPlayerColor(color);
    setFlipped(false);
    setMoves([]);
    setView(0);
    setResigned(false);
    setSelected(null);
    setShowReview(false);
    setShowNewGame(false);
    setStarted(true);
  };

  const canMoveHere = started && !promotion && viewTurn === playerColor && !(atTip && gameOver);

  const playMove = useCallback(
    (from: Square, to: Square, promo?: string): boolean => {
      if (!canMoveHere) return false;
      const c = new Chess(viewFen);
      let m: Move;
      try {
        m = c.move({ from, to, promotion: promo ?? 'q' });
      } catch {
        return false;
      }
      // Jouer depuis une position antérieure crée une nouvelle suite (les coups suivants sont remplacés)
      const next = [...moves.slice(0, view), m];
      setMoves(next);
      setView(next.length);
      setResigned(false);
      setSelected(null);
      return true;
    },
    [canMoveHere, viewFen, moves, view],
  );

  const isPromotion = (from: Square, to: Square) => {
    const c = new Chess(viewFen);
    return c.moves({ square: from, verbose: true }).some((m) => m.to === to && m.promotion);
  };

  const takeback = () => {
    let k = moves.length - 1;
    while (k >= 0 && moves[k].color !== playerColor) k--;
    if (k < 0) return;
    opponentRef.current?.stop();
    const next = moves.slice(0, k);
    setMoves(next);
    setView(next.length);
    setResigned(false);
    setSelected(null);
  };

  const goto = useCallback((ply: number) => {
    setView(Math.max(0, Math.min(moves.length, ply)));
    setSelected(null);
  }, [moves.length]);

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showNewGame || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') goto(view - 1);
      else if (e.key === 'ArrowRight') goto(view + 1);
      else if (e.key === 'Home') goto(0);
      else if (e.key === 'End') goto(moves.length);
      else if (e.key.toLowerCase() === 't') setTestMode((t) => !t);
      else if (e.key.toLowerCase() === 'f') setFlipped((f) => !f);
      else if (e.key === 'Escape') setShowReview(false);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goto, view, moves.length, showNewGame]);

  // --- Échiquier ---
  const orientation: 'white' | 'black' = (playerColor === 'w') !== flipped ? 'white' : 'black';
  const boardWrap = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(560);
  useLayoutEffect(() => {
    const el = boardWrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const h = window.innerWidth <= 1000 ? Infinity : r.height;
      setBoardWidth(Math.max(240, Math.floor(Math.min(r.width - EVAL_GUTTER, h))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return new Chess(viewFen).moves({ square: selected, verbose: true }).map((m) => m.to);
  }, [selected, viewFen]);

  const onSquareClick = (sq: Square) => {
    if (!canMoveHere) return;
    const c = new Chess(viewFen);
    const piece = c.get(sq);
    if (selected && legalTargets.includes(sq)) {
      if (isPromotion(selected, sq)) {
        setPromotion({ from: selected, to: sq });
        return;
      }
      playMove(selected, sq);
      return;
    }
    if (piece && piece.color === playerColor) setSelected(sq === selected ? null : sq);
    else setSelected(null);
  };

  const lastMove = view > 0 ? moves[view - 1] : null;
  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { background: 'var(--hl-last)' };
    squareStyles[lastMove.to] = { background: 'var(--hl-last)' };
    if (currentReview && !testMode) {
      const info = CLASS_INFO[currentReview.classification];
      squareStyles[lastMove.to] = {
        background: 'var(--hl-last)',
        backgroundImage: badgeImage(info.color, info.symbol),
        backgroundSize: '100% 100%',
      };
    }
  }
  const inCheck = new Chess(viewFen).inCheck();
  if (inCheck) {
    const king = new Chess(viewFen)
      .board()
      .flat()
      .find((s) => s && s.type === 'k' && s.color === viewTurn);
    if (king) squareStyles[king.square] = { ...(squareStyles[king.square] ?? {}), background: 'radial-gradient(circle, rgba(229,72,77,.85) 0%, rgba(229,72,77,.35) 45%, transparent 75%)' };
  }
  if (selected) {
    squareStyles[selected] = { background: 'var(--hl-select)' };
    const c = new Chess(viewFen);
    legalTargets.forEach((t) => {
      squareStyles[t] = c.get(t)
        ? { background: 'radial-gradient(circle, transparent 58%, rgba(20,30,25,.32) 60%)' }
        : { background: 'radial-gradient(circle, rgba(20,30,25,.3) 22%, transparent 24%)' };
    });
  }

  const arrows: [Square, Square, string][] = [];
  if (
    !testMode &&
    showBest &&
    currentReview &&
    currentReview.bestUci &&
    ['inaccuracy', 'mistake', 'blunder'].includes(currentReview.classification)
  ) {
    const b = parseUci(currentReview.bestUci);
    arrows.push([b.from as Square, b.to as Square, 'rgba(63,185,138,0.85)']);
  }

  const viewEval = analyses[viewFen]?.eval;
  const isPlayerTurn = started && atTip && !gameOver && game.turn() === playerColor;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden>
            <path d="M22 52h20l-2-6H24zM26 44h12l-1-12 4-6-4-6h-3l1-4h-6l1 4h-3l-4 6 4 6z" fill="currentColor" />
          </svg>
          <span>Eldrachess</span>
        </div>
        {started && (
          <div className="opponent-chip" title="Niveau de l’adversaire">
            <span className={`dot ${aiColor}`} aria-hidden />
            Stockfish {settings.elo} <span className="muted">{eloLabel(settings.elo)}</span>
          </div>
        )}
        <div className="topbar-actions">
          <label className="switch" title="Raccourci : T">
            <input type="checkbox" checked={!testMode} onChange={() => setTestMode((t) => !t)} />
            <span className="switch-track" aria-hidden>
              <span className="switch-thumb" />
            </span>
            <span>{testMode ? 'Mode test' : 'Conseils'}</span>
          </label>
          {started && moves.length > 0 && (
            <button className="btn ghost" onClick={() => setShowReview(true)}>
              Bilan
            </button>
          )}
          <button className="btn primary" onClick={() => setShowNewGame(true)}>
            Nouvelle partie
          </button>
        </div>
      </header>

      <main className="layout">
        <div className="board-col">
          <div className="board-wrap" ref={boardWrap}>
            <div className="board-inner">
              <div className="evalbar-slot" style={{ height: boardWidth }}>
                <EvalBar
                  evaluation={viewEval}
                  orientation={orientation}
                  hidden={testMode}
                  loading={!viewEval}
                />
              </div>
              <div className="board-frame" style={{ width: boardWidth }}>
                <Chessboard
                  id="main"
                  position={viewFen}
                  boardWidth={boardWidth}
                  boardOrientation={orientation}
                  animationDuration={180}
                  arePiecesDraggable={canMoveHere}
                  isDraggablePiece={({ piece }) => piece[0] === playerColor}
                  onPieceDrop={(from, to, piece) => {
                    const promo = piece[1]?.toLowerCase();
                    return playMove(from, to, isPromotion(from, to) ? promo : undefined);
                  }}
                  onSquareClick={onSquareClick}
                  onPromotionPieceSelect={(piece) => {
                    if (promotion && piece) {
                      const ok = playMove(promotion.from, promotion.to, piece[1].toLowerCase());
                      setPromotion(null);
                      return ok;
                    }
                    setPromotion(null);
                    return true;
                  }}
                  showPromotionDialog={!!promotion}
                  promotionToSquare={promotion?.to ?? null}
                  customSquareStyles={squareStyles}
                  customArrows={arrows}
                  areArrowsAllowed
                  customDarkSquareStyle={{ backgroundColor: 'var(--sq-dark)' }}
                  customLightSquareStyle={{ backgroundColor: 'var(--sq-light)' }}
                  customBoardStyle={{ borderRadius: '6px', overflow: 'hidden' }}
                  customNotationStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
              </div>
            </div>
          </div>

          <nav className="controls" style={{ maxWidth: boardWidth + EVAL_GUTTER }} aria-label="Navigation dans les coups">
            <div className="nav-group">
              <button className="icon-btn" onClick={() => goto(0)} disabled={view === 0} aria-label="Début de partie">
                ⏮
              </button>
              <button className="icon-btn" onClick={() => goto(view - 1)} disabled={view === 0} aria-label="Coup précédent">
                ◀
              </button>
              <span className="ply-counter">
                {view}/{moves.length}
              </span>
              <button className="icon-btn" onClick={() => goto(view + 1)} disabled={atTip} aria-label="Coup suivant">
                ▶
              </button>
              <button className="icon-btn" onClick={() => goto(moves.length)} disabled={atTip} aria-label="Position actuelle">
                ⏭
              </button>
            </div>
            <div className="nav-group">
              <button
                className="btn ghost sm"
                onClick={takeback}
                disabled={!started || !moves.some((m) => m.color === playerColor)}
                title="Annule votre dernier coup et la réponse de l’adversaire"
              >
                ↶ Reprendre
              </button>
              <button className="btn ghost sm" onClick={() => setFlipped((f) => !f)} title="Raccourci : F">
                Retourner
              </button>
              <button
                className="btn ghost sm danger"
                onClick={() => setResigned(true)}
                disabled={!started || !!gameOver || moves.length < 1}
              >
                Abandonner
              </button>
            </div>
          </nav>
          {!atTip && started && !gameOver && (
            <p className="branch-hint">
              Vous consultez un coup passé. {viewTurn === playerColor ? 'Jouez ici pour essayer une autre suite, ou ' : ''}
              <button className="link" onClick={() => goto(moves.length)}>
                revenez à la position actuelle
              </button>
              .
            </p>
          )}
        </div>

        <aside className="side">
          <CoachPanel
            review={currentReview}
            pending={pending > 0}
            viewPly={view}
            playerColor={playerColor}
            testMode={testMode}
            isPlayerTurn={isPlayerTurn}
            aiThinking={aiThinking}
            started={started}
            gameOver={gameOver}
            showBest={showBest}
            onToggleBest={() => setShowBest((s) => !s)}
          />
          <MoveList moves={moves} reviews={reviews} viewPly={view} testMode={testMode} onSelect={goto} />
          {gameOver && (
            <div className="gameover">
              <strong>{gameOver}</strong>
              <button className="btn primary sm" onClick={() => setShowReview(true)}>
                Voir le bilan
              </button>
            </div>
          )}
        </aside>
      </main>

      {showNewGame && (
        <NewGameDialog
          initial={settings}
          canCancel={started}
          onStart={startGame}
          onCancel={() => setShowNewGame(false)}
        />
      )}
      {showReview && (
        <ReviewDialog
          report={report}
          reviews={reviews}
          result={gameOver}
          playerColor={playerColor}
          elo={settings.elo}
          pending={pending}
          onJump={(ply) => {
            goto(ply);
            setShowReview(false);
          }}
          onClose={() => setShowReview(false)}
          onNewGame={() => {
            setShowReview(false);
            setShowNewGame(true);
          }}
        />
      )}
    </div>
  );
}
