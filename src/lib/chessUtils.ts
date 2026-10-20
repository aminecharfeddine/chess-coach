import { Chess, type Move, type PieceSymbol } from 'chess.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pion',
  n: 'cavalier',
  b: 'fou',
  r: 'tour',
  q: 'dame',
  k: 'roi',
};

/** Article + nom : « votre cavalier », « un fou »… */
export const pieceWithArticle = (p: PieceSymbol, article: 'votre' | 'un' | 'le') => {
  const name = PIECE_NAME[p];
  if (article === 'un') return (p === 'q' || p === 'r' ? 'une ' : 'un ') + name;
  if (article === 'le') return (p === 'q' || p === 'r' ? 'la ' : 'le ') + name;
  return 'votre ' + name;
};

/** Pièces (notation française) pour l'affichage SAN : C, F, T, D, R */
const FR_SAN: Record<string, string> = { N: 'C', B: 'F', R: 'T', Q: 'D', K: 'R' };
export const toFrenchSan = (san: string) => san.replace(/[NBRQK]/g, (m) => FR_SAN[m] ?? m);

export interface UciMove {
  from: string;
  to: string;
  promotion?: string;
}

export const parseUci = (uci: string): UciMove => ({
  from: uci.slice(0, 2),
  to: uci.slice(2, 4),
  promotion: uci.length > 4 ? uci[4] : undefined,
});

export const moveToUci = (m: Pick<Move, 'from' | 'to' | 'promotion'>) =>
  m.from + m.to + (m.promotion ?? '');

/** Joue une suite de coups UCI depuis une FEN ; renvoie les objets Move (s'arrête si illégal). */
export function playUciLine(fen: string, uciMoves: string[], max = uciMoves.length): Move[] {
  const c = new Chess(fen);
  const out: Move[] = [];
  for (const u of uciMoves.slice(0, max)) {
    try {
      out.push(c.move(parseUci(u)));
    } catch {
      break;
    }
  }
  return out;
}

/** Convertit une ligne UCI en SAN française lisible, avec numéros de coups. */
export function lineToSan(fen: string, uciMoves: string[], max = 6): string {
  const moves = playUciLine(fen, uciMoves, max);
  if (!moves.length) return '';
  const parts = fen.split(' ');
  let moveNo = Number(parts[5]) || 1;
  let turn = parts[1] as 'w' | 'b';
  const out: string[] = [];
  moves.forEach((m, i) => {
    if (turn === 'w') out.push(`${moveNo}.`);
    else if (i === 0) out.push(`${moveNo}…`);
    out.push(toFrenchSan(m.san));
    if (turn === 'b') moveNo++;
    turn = turn === 'w' ? 'b' : 'w';
  });
  return out.join(' ');
}

export function uciToSan(fen: string, uci: string): string | null {
  const m = playUciLine(fen, [uci], 1)[0];
  return m ? m.san : null;
}

/** Bilan matériel (Blancs − Noirs) en points. */
export function materialBalance(fen: string): number {
  const board = fen.split(' ')[0];
  let s = 0;
  for (const ch of board) {
    const lower = ch.toLowerCase() as PieceSymbol;
    if (lower in PIECE_VALUE) {
      const v = PIECE_VALUE[lower];
      s += ch === lower ? -v : v;
    }
  }
  return s;
}

/** Somme des pièces hors pions et rois (les deux camps). */
export function nonPawnMaterial(fen: string): number {
  const board = fen.split(' ')[0];
  let s = 0;
  for (const ch of board) {
    const l = ch.toLowerCase();
    if (l === 'n' || l === 'b' || l === 'r' || l === 'q') s += PIECE_VALUE[l as PieceSymbol];
  }
  return s;
}

export type Phase = 'opening' | 'middlegame' | 'endgame';

export function gamePhase(fen: string, ply: number): Phase {
  const npm = nonPawnMaterial(fen);
  if (npm <= 26) return 'endgame';
  if (ply < 20) return 'opening';
  return 'middlegame';
}

export const PHASE_LABEL: Record<Phase, string> = {
  opening: 'ouverture',
  middlegame: 'milieu de partie',
  endgame: 'finale',
};

export const turnOf = (fen: string) => fen.split(' ')[1] as 'w' | 'b';
