import type { PvLine } from '../engine/Engine';

/**
 * Évaluation toujours exprimée du point de vue des Blancs.
 * mate > 0 : les Blancs matent en N ; mate < 0 : les Noirs matent en N.
 * mated : position terminale de mat (le camp indiqué est maté).
 */
export interface Evaluation {
  cp: number | null;
  mate: number | null;
  mated?: 'w' | 'b';
  draw?: boolean;
}

export interface AnalyzedLine extends Evaluation {
  pv: string[]; // coups UCI
  depth: number;
}

export interface PositionAnalysis {
  fen: string;
  depth: number;
  bestmove: string | null;
  lines: AnalyzedLine[]; // de la meilleure à la moins bonne pour le camp au trait
  eval: Evaluation;
}

/** Convertit une ligne moteur (point de vue du camp au trait) en point de vue Blancs. */
export function lineToWhite(line: PvLine, turn: 'w' | 'b'): AnalyzedLine {
  const sign = turn === 'w' ? 1 : -1;
  if (line.mate === 0) {
    return { cp: null, mate: null, mated: turn, pv: [], depth: line.depth };
  }
  return {
    cp: line.cp === null ? null : line.cp * sign,
    mate: line.mate === null ? null : line.mate * sign,
    pv: line.pv,
    depth: line.depth,
  };
}

/** Valeur numérique comparable (centipions ; mats = ±100000). Point de vue Blancs. */
export function evalToNumber(e: Evaluation): number {
  if (e.mated) return e.mated === 'w' ? -100000 : 100000;
  if (e.draw) return 0;
  if (e.mate !== null) return e.mate > 0 ? 100000 - e.mate * 100 : -100000 - e.mate * 100;
  return e.cp ?? 0;
}

/** Probabilité de gain des Blancs (0–100), formule utilisée par Lichess. */
export function winPercent(e: Evaluation): number {
  if (e.mated) return e.mated === 'w' ? 0 : 100;
  if (e.draw) return 50;
  if (e.mate !== null) return e.mate > 0 ? 100 : 0;
  const cp = Math.max(-1000, Math.min(1000, e.cp ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

const fmt = (n: number) => n.toFixed(1).replace('.', ',');

/** Affichage : +1,5 / −0,8 / M3 / −M2 / 1-0 / ½ */
export function formatEval(e: Evaluation | null | undefined): string {
  if (!e) return '…';
  if (e.mated) return e.mated === 'w' ? '0-1' : '1-0';
  if (e.draw) return '½-½';
  if (e.mate !== null) return e.mate > 0 ? `M${e.mate}` : `−M${Math.abs(e.mate)}`;
  const p = (e.cp ?? 0) / 100;
  if (Math.abs(p) < 0.05) return '0,0';
  return p > 0 ? `+${fmt(p)}` : `−${fmt(-p)}`;
}

/** Fraction blanche de la barre (0–1). */
export function barFraction(e: Evaluation | null | undefined): number {
  if (!e) return 0.5;
  if (e.mated) return e.mated === 'w' ? 0 : 1;
  if (e.mate !== null) return e.mate > 0 ? 1 : 0;
  const wp = winPercent(e) / 100;
  return Math.max(0.04, Math.min(0.96, wp));
}

/** Probabilité de gain du point de vue d'un camp. */
export function winPercentFor(e: Evaluation, color: 'w' | 'b') {
  const w = winPercent(e);
  return color === 'w' ? w : 100 - w;
}
