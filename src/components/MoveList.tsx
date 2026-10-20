import { useEffect, useRef } from 'react';
import type { Move } from 'chess.js';
import { CLASS_INFO, type MoveReview } from '../lib/coach';
import { toFrenchSan } from '../lib/chessUtils';

interface Props {
  moves: Move[];
  reviews: (MoveReview | null)[];
  viewPly: number;
  testMode: boolean;
  onSelect: (ply: number) => void;
}

const SHOW_SYMBOL = new Set(['best', 'inaccuracy', 'mistake', 'blunder']);

export function MoveList({ moves, reviews, viewPly, testMode, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [viewPly]);

  const firstIsBlack = moves[0]?.color === 'b';
  const rows: { no: number; w?: number; b?: number }[] = [];
  moves.forEach((m, i) => {
    const no = Math.floor((i + (firstIsBlack ? 1 : 0)) / 2) + 1;
    if (!rows.length || rows[rows.length - 1].no !== no) rows.push({ no });
    rows[rows.length - 1][m.color] = i;
  });

  const cell = (i: number | undefined) => {
    if (i === undefined) return <span className="mv empty" />;
    const r = reviews[i];
    const info = r && !testMode ? CLASS_INFO[r.classification] : null;
    const active = viewPly === i + 1;
    return (
      <button
        ref={active ? activeRef : undefined}
        className={`mv ${active ? 'active' : ''}`}
        onClick={() => onSelect(i + 1)}
        aria-current={active}
      >
        {toFrenchSan(moves[i].san)}
        {info && SHOW_SYMBOL.has(r!.classification) && (
          <span className="mv-sym" style={{ color: info.color }}>
            {info.symbol}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="movelist" aria-label="Liste des coups">
      {rows.length === 0 ? (
        <p className="muted small">Les coups apparaîtront ici.</p>
      ) : (
        rows.map((row) => (
          <div className="mv-row" key={row.no}>
            <span className="mv-no">{row.no}.</span>
            {cell(row.w)}
            {cell(row.b)}
          </div>
        ))
      )}
    </div>
  );
}
