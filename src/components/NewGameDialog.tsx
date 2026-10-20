import { useState } from 'react';
import { ELO_MAX, ELO_MIN, ELO_PRESETS, eloLabel } from '../engine/opponent';

export interface GameSettings {
  elo: number;
  color: 'w' | 'b' | 'random';
  depth: number;
}

export const DEPTHS = [
  { depth: 12, label: 'Rapide', hint: 'Profondeur 12, idéal sur mobile' },
  { depth: 16, label: 'Standard', hint: 'Profondeur 16, bon compromis' },
  { depth: 20, label: 'Profonde', hint: 'Profondeur 20, plus lent mais plus précis' },
];

interface Props {
  initial: GameSettings;
  canCancel: boolean;
  onStart: (s: GameSettings) => void;
  onCancel: () => void;
}

export function NewGameDialog({ initial, canCancel, onStart, onCancel }: Props) {
  const [s, setS] = useState<GameSettings>(initial);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="ng-title">
      <form
        className="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onStart(s);
        }}
      >
        <h2 id="ng-title">Nouvelle partie</h2>

        <fieldset>
          <legend>Niveau de l’adversaire</legend>
          <div className="elo-readout">
            <span className="elo-num">{s.elo}</span>
            <span className="muted">Elo</span>
            <span className="elo-tag">{eloLabel(s.elo)}</span>
          </div>
          <input
            type="range"
            min={ELO_MIN}
            max={ELO_MAX}
            step={10}
            value={s.elo}
            onChange={(e) => setS({ ...s, elo: Number(e.target.value) })}
            aria-label="Elo de l’adversaire"
          />
          <div className="chips">
            {ELO_PRESETS.map((p) => (
              <button
                type="button"
                key={p.elo}
                className={`chip ${s.elo === p.elo ? 'on' : ''}`}
                onClick={() => setS({ ...s, elo: p.elo })}
              >
                {p.elo === ELO_MAX ? 'Max' : p.elo}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Vos pièces</legend>
          <div className="segmented">
            {(
              [
                ['w', 'Blancs'],
                ['random', 'Au hasard'],
                ['b', 'Noirs'],
              ] as const
            ).map(([v, l]) => (
              <button type="button" key={v} className={s.color === v ? 'on' : ''} onClick={() => setS({ ...s, color: v })}>
                {v !== 'random' && <span className={`dot ${v}`} aria-hidden />}
                {l}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Analyse de l’entraîneur</legend>
          <div className="segmented">
            {DEPTHS.map((d) => (
              <button type="button" key={d.depth} title={d.hint} className={s.depth === d.depth ? 'on' : ''} onClick={() => setS({ ...s, depth: d.depth })}>
                {d.label}
              </button>
            ))}
          </div>
          <p className="muted small">
            L’entraîneur utilise Stockfish à pleine force, indépendamment du niveau de l’adversaire.
          </p>
        </fieldset>

        <div className="dialog-actions">
          {canCancel && (
            <button type="button" className="btn ghost" onClick={onCancel}>
              Annuler
            </button>
          )}
          <button type="submit" className="btn primary" autoFocus>
            Commencer la partie
          </button>
        </div>
      </form>
    </div>
  );
}
