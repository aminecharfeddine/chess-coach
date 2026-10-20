import { Engine } from './Engine';

/**
 * Adversaire : instance Stockfish dédiée, bridée selon l'Elo choisi.
 *  - Elo ≥ 1320 : bridage natif de Stockfish (UCI_LimitStrength + UCI_Elo).
 *  - Elo < 1320 : Stockfish ne descend pas plus bas ; on fait une recherche peu
 *    profonde en MultiPV et on tire un coup au hasard pondéré par sa qualité
 *    (température d'autant plus élevée que l'Elo est bas → erreurs humaines).
 */
export const ELO_MIN = 400;
export const ELO_MAX = 3190;
const NATIVE_MIN = 1320;

export class Opponent {
  private engine = new Engine({ Hash: 16, 'Skill Level': 20 });
  private configuredElo: number | null = null;

  private async configure(elo: number) {
    if (this.configuredElo === elo) return;
    this.configuredElo = elo;
    if (elo >= NATIVE_MIN) {
      await this.engine.setOptions({ UCI_LimitStrength: true, UCI_Elo: Math.min(ELO_MAX, elo) });
    } else {
      await this.engine.setOptions({ UCI_LimitStrength: false });
    }
  }

  newGame() {
    return this.engine.newGame();
  }

  stop() {
    this.engine.stop();
  }

  async pickMove(fen: string, elo: number): Promise<string | null> {
    await this.configure(elo);
    if (elo >= NATIVE_MIN) {
      // Plus fort = plus de temps de réflexion
      const t = (elo - NATIVE_MIN) / (ELO_MAX - NATIVE_MIN);
      const movetime = Math.round(250 + t * 1250);
      const res = await this.engine.search(fen, { movetime });
      return res.bestmove;
    }
    const t = (elo - ELO_MIN) / (NATIVE_MIN - ELO_MIN); // 0 → 1
    const depth = Math.round(3 + t * 6); // 3 → 9
    const res = await this.engine.search(fen, { depth, multipv: 8 });
    if (!res.lines.length) return res.bestmove;
    const temperature = 320 - t * 230; // 320cp → 90cp
    const scores = res.lines.map((l) =>
      l.mate !== null ? (l.mate > 0 ? 5000 - l.mate : -5000 - l.mate) : (l.cp ?? 0),
    );
    const top = Math.max(...scores);
    const weights = scores.map((s) => Math.exp((s - top) / temperature));
    // Les mats en 1 sont presque toujours vus, même par un débutant
    if (res.lines[0].mate === 1 && Math.random() < 0.85) return res.lines[0].pv[0];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return res.lines[i].pv[0] ?? res.bestmove;
    }
    return res.bestmove;
  }

  destroy() {
    this.engine.destroy();
  }
}

export const ELO_PRESETS = [
  { elo: 400, label: 'Débutant' },
  { elo: 800, label: 'Novice' },
  { elo: 1200, label: 'Club' },
  { elo: 1500, label: 'Intermédiaire' },
  { elo: 1800, label: 'Confirmé' },
  { elo: 2100, label: 'Expert' },
  { elo: 2500, label: 'Maître' },
  { elo: 3190, label: 'Stockfish max' },
];

export function eloLabel(elo: number) {
  let label = ELO_PRESETS[0].label;
  for (const p of ELO_PRESETS) if (elo >= p.elo) label = p.label;
  return label;
}
