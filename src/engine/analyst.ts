import { Chess } from 'chess.js';
import { Engine } from './Engine';
import { lineToWhite, type PositionAnalysis } from '../lib/evaluation';

/**
 * Analyste : instance Stockfish à pleine force, indépendante de l'adversaire.
 * Analyse chaque position à profondeur fixe (réglable) avec MultiPV 3 et met
 * les résultats en cache par FEN. La position la plus récente est prioritaire.
 */
export class Analyst {
  private engine = new Engine({ Hash: 32, UCI_LimitStrength: false, 'Skill Level': 20 });
  private cache = new Map<string, PositionAnalysis>();
  private queue: string[] = [];
  private running = false;
  private depth: number;

  constructor(
    depth: number,
    private onResult: (a: PositionAnalysis) => void,
  ) {
    this.depth = depth;
  }

  /** Change la profondeur ; vide le cache si elle change. Renvoie true si changée. */
  setDepth(depth: number) {
    if (depth === this.depth) return false;
    this.depth = depth;
    this.cache.clear();
    this.queue = [];
    return true;
  }

  get(fen: string) {
    return this.cache.get(fen);
  }

  /** Demande l'analyse de positions ; la dernière de la liste est traitée en premier. */
  request(fens: string[]) {
    for (const fen of fens) {
      if (this.cache.has(fen) || this.queue.includes(fen)) continue;
      this.queue.push(fen);
    }
    void this.pump();
  }

  /** Remonte une position en tête de file (ex. position affichée). */
  prioritize(fen: string) {
    const i = this.queue.indexOf(fen);
    if (i >= 0) {
      this.queue.splice(i, 1);
      this.queue.push(fen);
    }
  }

  get pending() {
    return this.queue.length + (this.current ? 1 : 0);
  }

  private current: string | null = null;

  private async pump() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length) {
      const fen = this.queue.pop()!;
      if (this.cache.has(fen)) continue;
      this.current = fen;
      const depth = this.depth;
      const result = await this.analyze(fen);
      this.current = null;
      if (depth !== this.depth) continue; // profondeur changée entre-temps
      this.cache.set(fen, result);
      this.onResult(result);
    }
    this.running = false;
  }

  private async analyze(fen: string): Promise<PositionAnalysis> {
    const chess = new Chess(fen);
    const turn = chess.turn();
    // Positions terminales : pas besoin du moteur
    if (chess.isCheckmate()) {
      return { fen, depth: 0, bestmove: null, lines: [], eval: { cp: null, mate: null, mated: turn } };
    }
    if (chess.isDraw() || chess.isStalemate()) {
      return { fen, depth: 0, bestmove: null, lines: [], eval: { cp: 0, mate: null, draw: true } };
    }
    const res = await this.engine.search(fen, { depth: this.depth, multipv: 3 });
    const lines = res.lines.map((l) => lineToWhite(l, turn));
    const top = lines[0] ?? { cp: 0, mate: null };
    return {
      fen,
      depth: lines[0]?.depth ?? 0,
      bestmove: res.bestmove ?? lines[0]?.pv[0] ?? null,
      lines,
      eval: { cp: top.cp, mate: top.mate, mated: top.mated },
    };
  }

  destroy() {
    this.engine.destroy();
  }
}
