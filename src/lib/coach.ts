import { Chess, type Move, type PieceSymbol } from 'chess.js';
import {
  formatEval,
  winPercentFor,
  type Evaluation,
  type PositionAnalysis,
} from './evaluation';
import {
  gamePhase,
  lineToSan,
  materialBalance,
  moveToUci,
  pieceWithArticle,
  playUciLine,
  toFrenchSan,
  type Phase,
} from './chessUtils';

export type Classification = 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export const CLASS_INFO: Record<
  Classification,
  { label: string; symbol: string; color: string; noun: string }
> = {
  best: { label: 'Meilleur coup', symbol: '★', color: '#3fb98a', noun: 'le meilleur coup' },
  excellent: { label: 'Excellent', symbol: '!', color: '#4cc38a', noun: 'un excellent coup' },
  good: { label: 'Bon', symbol: '✓', color: '#8fbf6a', noun: 'un bon coup' },
  inaccuracy: { label: 'Imprécision', symbol: '?!', color: '#e6c14a', noun: 'une imprécision' },
  mistake: { label: 'Mauvais coup', symbol: '?', color: '#ec8b3a', noun: 'un mauvais coup' },
  blunder: { label: 'Gaffe', symbol: '??', color: '#e5484d', noun: 'une gaffe' },
};

export type Theme =
  | 'hanging' // pièce laissée en prise / matériel perdu
  | 'missedGain' // gain de matériel manqué
  | 'allowedMate'
  | 'missedMate'
  | 'kingSafety'
  | 'positional';

export const THEME_INFO: Record<Theme, { label: string; advice: string }> = {
  hanging: {
    label: 'Pièces laissées en prise',
    advice:
      'Avant chaque coup, vérifiez quelles pièces l’adversaire peut prendre après votre coup, et si chacune est suffisamment défendue (« blunder check »).',
  },
  missedGain: {
    label: 'Tactiques manquées',
    advice:
      'Cherchez systématiquement les coups forçants (échecs, prises, menaces) avant un coup calme : plusieurs occasions de gagner du matériel vous ont échappé.',
  },
  allowedMate: {
    label: 'Sécurité du roi (mat concédé)',
    advice:
      'Surveillez les menaces contre votre roi : cases faibles, diagonales ouvertes, rangée du fond. Demandez-vous « quel est le coup le plus dangereux pour moi ? ».',
  },
  missedMate: {
    label: 'Mats manqués',
    advice:
      'Quand le roi adverse est exposé, examinez tous les échecs : des séquences de mat étaient disponibles. Entraînez-vous avec des exercices « mat en 2 / mat en 3 ».',
  },
  kingSafety: {
    label: 'Roi exposé',
    advice:
      'Roquez tôt et évitez de déplacer votre roi ou les pions qui l’abritent sans nécessité, surtout tant que les dames sont sur l’échiquier.',
  },
  positional: {
    label: 'Imprécisions positionnelles',
    advice:
      'Sans perte matérielle immédiate, certains coups ont cédé du terrain. Privilégiez l’activité des pièces, le contrôle du centre et les plans à long terme.',
  },
};

export interface MoveReview {
  ply: number; // index du coup (0 = premier demi-coup)
  color: 'w' | 'b';
  san: string;
  uci: string;
  classification: Classification;
  /** Perte de probabilité de gain (points de %) pour le camp qui a joué. */
  loss: number;
  accuracy: number;
  evalBefore: Evaluation;
  evalAfter: Evaluation;
  bestUci: string | null;
  bestSan: string | null;
  bestLine: string;
  /** Meilleure réponse adverse après le coup joué (réfutation). */
  replyUci: string | null;
  replyLine: string;
  title: string;
  explanation: string;
  themes: Theme[];
  phase: Phase;
}

const sideName = (c: 'w' | 'b') => (c === 'w' ? 'Blancs' : 'Noirs');

function materialLabel(points: number): string {
  const p = Math.round(points);
  if (p <= 1) return 'un pion';
  if (p === 2) return 'deux pions';
  if (p === 3) return 'une pièce';
  if (p === 4) return 'une pièce et un pion';
  if (p === 5) return 'l’équivalent d’une tour';
  if (p <= 7) return 'plus que l’équivalent d’une tour';
  return 'l’équivalent d’une dame';
}

/**
 * Bilan matériel (point de vue `color`) à la fin d'une ligne, en s'arrêtant
 * dans une position calme (plus de prise immédiate) pour éviter les échanges coupés.
 */
function materialAfterLine(fen: string, uci: string[], color: 'w' | 'b'): { value: number; moves: Move[] } {
  const moves = playUciLine(fen, uci, 10);
  const c = new Chess(fen);
  const sign = color === 'w' ? 1 : -1;
  let value = materialBalance(fen) * sign;
  const played: Move[] = [];
  for (let i = 0; i < moves.length; i++) {
    c.move(moves[i]);
    played.push(moves[i]);
    value = materialBalance(c.fen()) * sign;
    const next = moves[i + 1];
    if (i >= 3 && !moves[i].captured && (!next || !next.captured)) break;
  }
  return { value, moves: played };
}

export function accuracyFromLoss(loss: number) {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));
}

function classify(loss: number, isBest: boolean): Classification {
  if (isBest) return 'best';
  if (loss < 2) return 'excellent';
  if (loss < 5) return 'good';
  if (loss < 10) return 'inaccuracy';
  if (loss < 20) return 'mistake';
  return 'blunder';
}

function mateFor(e: Evaluation, color: 'w' | 'b'): number | null {
  if (e.mate === null) return null;
  const m = color === 'w' ? e.mate : -e.mate;
  return m;
}

export function reviewMove(
  ply: number,
  move: Move,
  before: PositionAnalysis,
  after: PositionAnalysis,
  isPlayer: boolean,
): MoveReview {
  const color = move.color;
  const opp = color === 'w' ? 'b' : 'w';
  const uci = moveToUci(move);
  const fenBefore = move.before;
  const fenAfter = move.after;

  const wpBefore = winPercentFor(before.eval, color);
  const wpAfter = winPercentFor(after.eval, color);
  const isBest = before.bestmove === uci;
  let loss = Math.max(0, wpBefore - wpAfter);
  if (isBest) loss = 0;
  // Un coup alternatif listé quasiment à égalité avec le meilleur reste excellent.
  const altLine = before.lines.find((l) => l.pv[0] === uci);
  if (altLine) {
    const altLoss = Math.max(0, wpBefore - winPercentFor(altLine, color));
    loss = Math.min(loss, altLoss);
  }
  let classification = classify(loss, isBest);
  if (move.san.includes('#')) classification = 'best';

  const bestUci = before.bestmove;
  const bestSan = bestUci ? (playUciLine(fenBefore, [bestUci], 1)[0]?.san ?? null) : null;
  const bestLine = before.lines[0] ? lineToSan(fenBefore, before.lines[0].pv, 6) : '';
  const replyUci = after.bestmove;
  const replyLine = after.lines[0] ? lineToSan(fenAfter, after.lines[0].pv, 6) : '';

  // --- Analyse des motifs ---
  const themes: Theme[] = [];
  const parts: string[] = [];
  const phase = gamePhase(fenBefore, ply);
  const sanFr = toFrenchSan(move.san);
  const bestFr = bestSan ? toFrenchSan(bestSan) : null;
  const you = isPlayer;

  const matStart = materialBalance(fenBefore) * (color === 'w' ? 1 : -1);
  const playedLine = materialAfterLine(fenBefore, [uci, ...(after.lines[0]?.pv ?? [])], color);
  const bestLineMat = before.lines[0]
    ? materialAfterLine(fenBefore, before.lines[0].pv, color)
    : playedLine;
  const playedNet = playedLine.value - matStart;
  const bestNet = bestLineMat.value - matStart;

  const mateAfterForOpp = mateFor(after.eval, opp);
  const mateBeforeForMe = mateFor(before.eval, color);
  const mateAfterForMe = mateFor(after.eval, color);
  const bad = ['inaccuracy', 'mistake', 'blunder'].includes(classification);

  if (move.san.includes('#')) {
    parts.push(you ? 'Échec et mat ! Bravo, la partie est gagnée.' : 'Échec et mat.');
  } else if (mateAfterForOpp !== null && mateAfterForOpp > 0 && !(before.eval.mate !== null && mateFor(before.eval, opp)! > 0)) {
    themes.push('allowedMate');
    parts.push(
      `${you ? 'Ce coup permet' : 'Ce coup permet'} un mat en ${mateAfterForOpp} : ${replyLine}.`,
    );
  } else if (mateBeforeForMe !== null && mateBeforeForMe > 0 && !(mateAfterForMe !== null && mateAfterForMe > 0)) {
    themes.push('missedMate');
    parts.push(`${you ? 'Vous aviez' : 'Il y avait'} un mat en ${mateBeforeForMe} : ${bestLine}.`);
  } else if (bad && playedNet <= -1 && bestNet - playedNet >= 1.5) {
    // Matériel perdu : trouve la première pièce du camp capturée dans la réfutation
    themes.push('hanging');
    const lost = bestNet - playedNet;
    const capture = playedLine.moves.slice(1).find((m) => m.color === opp && m.captured);
    if (capture && capture.captured) {
      const piece = capture.captured as PieceSymbol;
      const justMoved = capture.to === move.to;
      const who = you ? pieceWithArticle(piece, 'votre') : pieceWithArticle(piece, 'le');
      if (justMoved) {
        parts.push(
          `${cap(who)} ${you && move.piece === piece ? 'que vous venez de jouer ' : ''}en ${move.to} n’est pas suffisamment défendu${piece === 'q' || piece === 'r' ? 'e' : ''} : après ${toFrenchSan(capture.san)}, ${you ? 'vous perdez' : 'les ' + sideName(color) + ' perdent'} ${materialLabel(lost)}.`,
        );
      } else {
        parts.push(
          `Après ${sanFr}, ${who} en ${capture.to} est en prise : ${toFrenchSan(capture.san)}. Au total, ${you ? 'vous perdez' : 'les ' + sideName(color) + ' perdent'} ${materialLabel(lost)}.`,
        );
      }
    } else {
      parts.push(`Ce coup perd ${materialLabel(lost)} après ${replyLine}.`);
    }
  } else if (bad && bestNet >= 1.5 && bestNet - playedNet >= 1.5) {
    themes.push('missedGain');
    parts.push(
      `Occasion manquée : ${bestFr} ${you ? 'vous faisait gagner' : 'gagnait'} ${materialLabel(bestNet - Math.max(0, playedNet))}.`,
    );
  } else if (bad) {
    // Explications positionnelles
    const tags: string[] = [];
    if (move.piece === 'k' && !move.san.startsWith('O-O')) {
      const castling = fenBefore.split(' ')[2];
      const had = color === 'w' ? /[KQ]/.test(castling) : /[kq]/.test(castling);
      if (had) {
        themes.push('kingSafety');
        tags.push(`le roi perd définitivement le droit de roquer`);
      }
    }
    if (move.piece === 'q' && ply < 14 && phase === 'opening') {
      tags.push('sortir la dame aussi tôt l’expose aux attaques avec gain de temps');
    }
    if (move.piece === 'p' && ['f', 'g', 'h'].includes(move.from[0]) && phase !== 'endgame') {
      const kingSide = new Chess(fenBefore).board().flat().find((s) => s && s.type === 'k' && s.color === color);
      if (kingSide && ['f', 'g', 'h'].includes(kingSide.square[0])) {
        themes.push('kingSafety');
        tags.push('avancer les pions devant votre roi affaiblit son abri');
      }
    }
    if (!themes.length) themes.push('positional');
    const bestMove = bestUci ? playUciLine(fenBefore, [bestUci], 1)[0] : undefined;
    let why = '';
    if (bestMove) {
      if (bestMove.san.startsWith('O-O')) why = 'qui met le roi à l’abri';
      else if (bestMove.san.includes('+')) why = 'qui force la réponse adverse';
      else if (bestMove.captured) why = 'qui prend du matériel';
      else if (phase === 'opening' && ['n', 'b'].includes(bestMove.piece) && ['1', '8'].includes(bestMove.from[1]))
        why = 'qui développe une pièce';
    }
    const evalTxt = `L’évaluation passe de ${formatEval(before.eval)} à ${formatEval(after.eval)}`;
    if (tags.length) parts.push(cap(tags.join(' ; ')) + '.');
    parts.push(
      `${evalTxt} sans perte matérielle immédiate, mais ${bestFr ?? 'un autre coup'}${why ? ` (${why})` : ''} était plus précis.`,
    );
    if (replyUci && classification !== 'inaccuracy') {
      const reply = playUciLine(fenAfter, [replyUci], 1)[0];
      if (reply) parts.push(`L’adversaire peut répondre ${toFrenchSan(reply.san)}.`);
    }
  } else {
    // Bons coups
    const evalAfterTxt = describeBalance(after.eval, color, you);
    if (classification === 'best') {
      if (move.san.startsWith('O-O')) parts.push('Roque au bon moment : le roi est en sécurité et la tour entre en jeu.');
      else if (playedNet >= 1) parts.push(`Meilleur coup : ${you ? 'vous gagnez' : 'gagne'} ${materialLabel(playedNet)}.`);
      else if (move.san.includes('+')) parts.push('Meilleur coup : un échec qui garde l’initiative.');
      else if (phase === 'opening' && ['n', 'b'].includes(move.piece) && ['1', '8'].includes(move.from[1]))
        parts.push('Meilleur coup : développement naturel et efficace.');
      else parts.push('C’est le coup choisi par Stockfish.');
    } else if (classification === 'excellent') {
      parts.push(`Excellent coup, quasiment aussi fort que ${bestFr ?? 'le choix du moteur'}.`);
    } else {
      parts.push(`Bon coup. ${bestFr ? `${bestFr} était légèrement plus précis.` : ''}`.trim());
    }
    if (evalAfterTxt) parts.push(evalAfterTxt);
  }

  const info = CLASS_INFO[classification];
  const title = `${sanFr} : ${info.noun}`;

  return {
    ply,
    color,
    san: move.san,
    uci,
    classification,
    loss,
    accuracy: accuracyFromLoss(loss),
    evalBefore: before.eval,
    evalAfter: after.eval,
    bestUci,
    bestSan,
    bestLine,
    replyUci,
    replyLine,
    title,
    explanation: parts.join(' '),
    themes: bad ? themes : [],
    phase,
  };
}

function describeBalance(e: Evaluation, color: 'w' | 'b', you: boolean): string {
  const wp = winPercentFor(e, color);
  const subject = you ? 'Vous' : `Les ${sideName(color)}`;
  const verb = you ? 'avez' : 'ont';
  if (e.mate !== null) {
    const m = mateFor(e, color)!;
    return m > 0 ? `${subject} ${verb} un mat forcé en ${m}.` : '';
  }
  if (wp >= 80) return `${subject} ${verb} un avantage décisif (${formatEval(e)}).`;
  if (wp >= 62) return `${subject} ${verb} un net avantage (${formatEval(e)}).`;
  if (wp >= 54) return `${subject} ${verb} un léger avantage (${formatEval(e)}).`;
  if (wp > 46) return `La position est équilibrée (${formatEval(e)}).`;
  if (wp > 38) return `${subject} ${verb} un léger désavantage (${formatEval(e)}), rien de grave.`;
  if (wp > 20) return `La position reste difficile (${formatEval(e)}), mais le coup limite les dégâts.`;
  return '';
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
