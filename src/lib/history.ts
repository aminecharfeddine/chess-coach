import type { Classification } from './coach';

/**
 * Historique local (navigateur) : 10 dernières parties détaillées + statistiques
 * cumulées sur toutes les parties. Pas de serveur : tout est dans le localStorage.
 */

export type Outcome = 'win' | 'loss' | 'draw';

export interface SavedGame {
  id: string;
  date: number;
  playerColor: 'w' | 'b';
  elo: number;
  depth: number;
  outcome: Outcome;
  resultText: string;
  resigned: boolean;
  /** Coups en SAN (anglaise), rejouables avec chess.js */
  moves: string[];
  accuracy: number | null;
  opponentAccuracy: number | null;
  counts: Record<Classification, number> | null;
  /** Les stats de précision ont été intégrées au cumul */
  statsCounted: boolean;
}

export interface Stats {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  byColor: { w: [number, number, number]; b: [number, number, number] }; // V, N, D
  accuracySum: number;
  accuracyGames: number;
  counts: Record<Classification, number>;
  bestWinElo: number | null;
  streak: number; // >0 victoires d'affilée, <0 défaites d'affilée
  bestStreak: number;
}

export interface Profile {
  name: string;
  games: SavedGame[]; // plus récentes en premier, max 10
  stats: Stats;
}

const KEY = 'eldrachess.profile';
export const MAX_GAMES = 10;

const emptyCounts = (): Record<Classification, number> => ({
  best: 0,
  excellent: 0,
  good: 0,
  inaccuracy: 0,
  mistake: 0,
  blunder: 0,
});

export const emptyStats = (): Stats => ({
  games: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  byColor: { w: [0, 0, 0], b: [0, 0, 0] },
  accuracySum: 0,
  accuracyGames: 0,
  counts: emptyCounts(),
  bestWinElo: null,
  streak: 0,
  bestStreak: 0,
});

export const emptyProfile = (): Profile => ({ name: 'Joueur', games: [], stats: emptyStats() });

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Profile>;
      return {
        name: p.name || 'Joueur',
        games: Array.isArray(p.games) ? p.games : [],
        stats: { ...emptyStats(), ...(p.stats ?? {}) },
      };
    }
  } catch {
    /* stockage indisponible ou corrompu */
  }
  return emptyProfile();
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/**
 * Ajoute ou met à jour une partie. Victoires/nuls/défaites comptés à l'ajout ;
 * précision et répartition des coups ajoutées au cumul une seule fois, dès que
 * l'analyse est complète.
 */
export function upsertGame(profile: Profile, game: SavedGame, analysisComplete: boolean): Profile {
  const stats: Stats = {
    ...profile.stats,
    byColor: { w: [...profile.stats.byColor.w], b: [...profile.stats.byColor.b] } as Stats['byColor'],
    counts: { ...profile.stats.counts },
  };
  const existing = profile.games.find((g) => g.id === game.id);
  const next: SavedGame = { ...game, statsCounted: existing?.statsCounted ?? false };

  if (!existing) {
    stats.games++;
    const idx = game.outcome === 'win' ? 0 : game.outcome === 'draw' ? 1 : 2;
    stats.byColor[game.playerColor][idx]++;
    if (game.outcome === 'win') {
      stats.wins++;
      stats.streak = stats.streak > 0 ? stats.streak + 1 : 1;
      stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
      stats.bestWinElo = Math.max(stats.bestWinElo ?? 0, game.elo);
    } else if (game.outcome === 'loss') {
      stats.losses++;
      stats.streak = stats.streak < 0 ? stats.streak - 1 : -1;
    } else {
      stats.draws++;
      stats.streak = 0;
    }
  }

  if (analysisComplete && !next.statsCounted && next.accuracy !== null && next.counts) {
    stats.accuracySum += next.accuracy;
    stats.accuracyGames++;
    (Object.keys(next.counts) as Classification[]).forEach((k) => (stats.counts[k] += next.counts![k]));
    next.statsCounted = true;
  }

  const games = [next, ...profile.games.filter((g) => g.id !== game.id)]
    .sort((a, b) => b.date - a.date)
    .slice(0, MAX_GAMES);
  return { ...profile, games, stats };
}

/** PGN simple pour exporter une partie vers Lichess / chess.com. */
export function toPgn(g: SavedGame, playerName: string): string {
  const d = new Date(g.date);
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const white = g.playerColor === 'w' ? playerName : `Stockfish ${g.elo}`;
  const black = g.playerColor === 'b' ? playerName : `Stockfish ${g.elo}`;
  const result =
    g.outcome === 'draw' ? '1/2-1/2' : (g.outcome === 'win') === (g.playerColor === 'w') ? '1-0' : '0-1';
  const body = g.moves
    .map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m}` : m))
    .join(' ');
  return `[Event "Eldrachess"]\n[Date "${date}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n\n${body} ${result}\n`;
}
