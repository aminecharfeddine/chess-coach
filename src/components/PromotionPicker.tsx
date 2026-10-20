import { useEffect } from 'react';
import { pieceUrl } from '../lib/themes';

interface Props {
  to: string; // case de promotion, ex. "e8"
  color: 'w' | 'b';
  orientation: 'white' | 'black';
  boardWidth: number;
  folder: string;
  onSelect: (piece: 'q' | 'n' | 'r' | 'b') => void;
  onCancel: () => void;
}

const CHOICES: { p: 'q' | 'n' | 'r' | 'b'; label: string }[] = [
  { p: 'q', label: 'Dame' },
  { p: 'n', label: 'Cavalier' },
  { p: 'r', label: 'Tour' },
  { p: 'b', label: 'Fou' },
];

/**
 * Choix de la pièce de promotion, affiché par-dessus l'échiquier dans la colonne
 * de la case d'arrivée (comme sur Lichess), avec le reste de l'échiquier assombri.
 */
export function PromotionPicker({ to, color, orientation, boardWidth, folder, onSelect, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      const map: Record<string, 'q' | 'n' | 'r' | 'b'> = { d: 'q', q: 'q', c: 'n', n: 'n', t: 'r', r: 'r', f: 'b', b: 'b' };
      const p = map[e.key.toLowerCase()];
      if (p) onSelect(p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onSelect]);

  const sq = boardWidth / 8;
  const file = to.charCodeAt(0) - 97;
  const rank = Number(to[1]);
  const col = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 8 - rank : rank - 1;
  const fromTop = row === 0;
  const prefix = color === 'w' ? 'w' : 'b';
  const letter: Record<string, string> = { q: 'Q', n: 'N', r: 'R', b: 'B' };

  return (
    <div className="promo-layer" onClick={onCancel} role="dialog" aria-label="Choisissez la pièce de promotion">
      {CHOICES.map((c, i) => (
        <button
          key={c.p}
          className="promo-choice"
          style={{
            left: col * sq,
            top: fromTop ? i * sq : (7 - i) * sq,
            width: sq,
            height: sq,
            padding: sq * 0.07,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(c.p);
          }}
          aria-label={c.label}
          title={c.label}
          autoFocus={i === 0}
        >
          <img src={pieceUrl(folder, prefix + letter[c.p])} alt="" draggable={false} />
        </button>
      ))}
    </div>
  );
}
