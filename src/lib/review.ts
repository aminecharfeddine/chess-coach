import { THEME_INFO, type Classification, type MoveReview, type Theme } from './coach';
import { PHASE_LABEL, type Phase } from './chessUtils';

export interface SideStats {
  accuracy: number | null;
  counts: Record<Classification, number>;
  moves: number;
}

export interface GameReport {
  player: SideStats;
  opponent: SideStats;
  keyMistakes: MoveReview[];
  missedPunishments: MoveReview[]; // erreurs adverses non exploitées
  themes: { theme: Theme; count: number }[];
  phases: { phase: Phase; accuracy: number; moves: number }[];
  advice: string[];
  complete: boolean;
}

const emptyCounts = (): Record<Classification, number> => ({
  best: 0,
  excellent: 0,
  good: 0,
  inaccuracy: 0,
  mistake: 0,
  blunder: 0,
});

function stats(reviews: MoveReview[]): SideStats {
  const counts = emptyCounts();
  reviews.forEach((r) => counts[r.classification]++);
  return {
    counts,
    moves: reviews.length,
    accuracy: reviews.length ? reviews.reduce((s, r) => s + r.accuracy, 0) / reviews.length : null,
  };
}

export function buildReport(all: (MoveReview | null)[], playerColor: 'w' | 'b'): GameReport {
  const done = all.filter((r): r is MoveReview => !!r);
  const mine = done.filter((r) => r.color === playerColor);
  const theirs = done.filter((r) => r.color !== playerColor);

  const keyMistakes = mine
    .filter((r) => r.classification === 'mistake' || r.classification === 'blunder')
    .sort((a, b) => b.loss - a.loss);
  // Si peu d'erreurs graves, on montre aussi les plus grosses imprécisions
  if (keyMistakes.length < 3) {
    keyMistakes.push(
      ...mine
        .filter((r) => r.classification === 'inaccuracy')
        .sort((a, b) => b.loss - a.loss)
        .slice(0, 3 - keyMistakes.length),
    );
  }

  const byPly = new Map(done.map((r) => [r.ply, r]));
  const missedPunishments = theirs.filter((r) => {
    if (r.classification !== 'mistake' && r.classification !== 'blunder') return false;
    const answer = byPly.get(r.ply + 1);
    return answer && answer.color === playerColor && !['best', 'excellent'].includes(answer.classification);
  });

  const themeCount = new Map<Theme, number>();
  mine.forEach((r) => r.themes.forEach((t) => themeCount.set(t, (themeCount.get(t) ?? 0) + 1)));
  const themes = [...themeCount.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);

  const phases = (['opening', 'middlegame', 'endgame'] as Phase[])
    .map((phase) => {
      const rs = mine.filter((r) => r.phase === phase);
      return {
        phase,
        moves: rs.length,
        accuracy: rs.length ? rs.reduce((s, r) => s + r.accuracy, 0) / rs.length : 0,
      };
    })
    .filter((p) => p.moves > 0);

  const advice: string[] = [];
  themes.slice(0, 3).forEach(({ theme }) => advice.push(THEME_INFO[theme].advice));
  if (missedPunishments.length) {
    advice.push(
      `L’adversaire a commis ${missedPunishments.length} erreur${missedPunishments.length > 1 ? 's' : ''} que vous n’avez pas exploitée${missedPunishments.length > 1 ? 's' : ''}. Après chaque coup adverse, demandez-vous : « qu’est-ce que ce coup a laissé sans défense ? ».`,
    );
  }
  const weakPhase = phases.filter((p) => p.moves >= 4).sort((a, b) => a.accuracy - b.accuracy)[0];
  const strongPhase = phases.filter((p) => p.moves >= 4).sort((a, b) => b.accuracy - a.accuracy)[0];
  if (weakPhase && strongPhase && strongPhase.accuracy - weakPhase.accuracy > 8) {
    const tips: Record<Phase, string> = {
      opening: 'révisez les principes d’ouverture : développer, contrôler le centre, roquer tôt',
      middlegame: 'travaillez la tactique (exercices quotidiens) et la recherche de plans',
      endgame: 'étudiez les finales de base : activité du roi, pions passés, finales de tours',
    };
    advice.push(
      `Votre précision chute en ${PHASE_LABEL[weakPhase.phase]} (${Math.round(weakPhase.accuracy)} % contre ${Math.round(strongPhase.accuracy)} % en ${PHASE_LABEL[strongPhase.phase]}) : ${tips[weakPhase.phase]}.`,
    );
  }
  if (!advice.length) {
    advice.push(
      mine.length
        ? 'Partie très propre : aucune faiblesse récurrente détectée. Essayez un adversaire plus fort pour progresser.'
        : 'Jouez quelques coups pour obtenir un bilan.',
    );
  }

  return {
    player: stats(mine),
    opponent: stats(theirs),
    keyMistakes: keyMistakes.sort((a, b) => a.ply - b.ply),
    missedPunishments,
    themes,
    phases,
    advice,
    complete: done.length === all.length,
  };
}
