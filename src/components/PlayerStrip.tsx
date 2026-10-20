import { pieceUrl } from '../lib/themes';
import { IconChip } from './Icons';

const START: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ORDER = ['q', 'r', 'b', 'n', 'p'];

/** Pièces adverses capturées par `color` et avance matérielle, à partir de la FEN. */
export function captured(fen: string, color: 'w' | 'b') {
  const board = fen.split(' ')[0];
  const zero = () => ({ p: 0, n: 0, b: 0, r: 0, q: 0 }) as Record<string, number>;
  const count: Record<'w' | 'b', Record<string, number>> = { w: zero(), b: zero() };
  for (const ch of board) {
    const l = ch.toLowerCase();
    if (l in START) count[ch === l ? 'b' : 'w'][l]++;
  }
  const opp = color === 'w' ? 'b' : 'w';
  const taken: string[] = [];
  let mine = 0;
  let theirs = 0;
  for (const p of ORDER) {
    const n = Math.max(0, START[p] - count[opp][p]);
    for (let i = 0; i < n; i++) taken.push(p);
    mine += count[color][p] * VALUE[p];
    theirs += count[opp][p] * VALUE[p];
  }
  return { taken, opp, advantage: mine - theirs };
}

interface Props {
  name: string;
  detail: string;
  color: 'w' | 'b';
  fen: string;
  isEngine: boolean;
  initial: string;
  active: boolean;
  thinking: boolean;
  folder: string;
}

export function PlayerStrip({ name, detail, color, fen, isEngine, initial, active, thinking, folder }: Props) {
  const { taken, opp, advantage } = captured(fen, color);
  return (
    <div className={`player ${active ? 'is-active' : ''}`}>
      <span className={`player-avatar ${isEngine ? 'engine' : ''}`} aria-hidden>
        {isEngine ? <IconChip width={20} height={20} /> : initial}
      </span>
      <div className="player-id">
        <span className="player-name">
          {name}
          <span className={`dot ${color}`} aria-label={color === 'w' ? 'Blancs' : 'Noirs'} />
        </span>
        <span className="player-detail">{thinking ? 'réfléchit…' : detail}</span>
      </div>
      <div className="captured" aria-label={`${taken.length} pièce(s) prise(s)`}>
        {taken.map((p, i) => (
          <img
            key={i}
            src={pieceUrl(folder, opp + p.toUpperCase())}
            alt=""
            className={i > 0 && taken[i - 1] !== p ? 'gap' : ''}
          />
        ))}
        {advantage > 0 && <span className="adv">+{advantage}</span>}
      </div>
      {active && <span className={`turn ${thinking ? 'thinking' : ''}`} aria-label="Au trait" />}
    </div>
  );
}
