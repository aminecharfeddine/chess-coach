import {
  BOARD_THEMES,
  PAUSE_OPTIONS,
  PIECE_SETS,
  UI_THEMES,
  findBoard,
  pieceUrl,
  type Preferences,
} from '../lib/themes';

interface Props {
  prefs: Preferences;
  onChange: (p: Preferences) => void;
  onClose: () => void;
}

/** Mini-échiquier 4×2 pour prévisualiser une combinaison cases + pièces. */
function Preview({ board, pieces }: { board: string; pieces: string }) {
  const b = findBoard(board);
  const folder = PIECE_SETS.find((s) => s.id === pieces)?.folder ?? 'cburnett';
  const row1 = ['bR', 'bN', 'bB', 'bQ'];
  const row2 = ['wK', 'wB', 'wN', 'wP'];
  return (
    <div className="preview" aria-hidden>
      {[row1, row2].map((row, r) =>
        row.map((p, c) => (
          <div key={`${r}${c}`} style={{ background: (r + c) % 2 ? b.dark : b.light }}>
            <img src={pieceUrl(folder, p)} alt="" />
          </div>
        )),
      )}
    </div>
  );
}

export function PreferencesDialog({ prefs, onChange, onClose }: Props) {
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => onChange({ ...prefs, [k]: v });

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pf-title" onClick={onClose}>
      <div className="dialog prefs" onClick={(e) => e.stopPropagation()}>
        <header className="review-head">
          <h2 id="pf-title">Apparence et rythme</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        <fieldset>
          <legend>Thème de l’interface</legend>
          <div className="theme-grid">
            {UI_THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-opt ${prefs.ui === t.id ? 'on' : ''}`}
                onClick={() => set('ui', t.id)}
                aria-pressed={prefs.ui === t.id}
              >
                <span className="ui-swatch" style={{ background: t.swatch[0] }}>
                  <span style={{ background: t.swatch[1] }} />
                  <span style={{ background: t.swatch[2] }} />
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Échiquier</legend>
          <div className="theme-grid">
            {BOARD_THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-opt ${prefs.board === t.id ? 'on' : ''}`}
                onClick={() => set('board', t.id)}
                aria-pressed={prefs.board === t.id}
              >
                <span className="board-swatch">
                  <span style={{ background: t.light }} />
                  <span style={{ background: t.dark }} />
                  <span style={{ background: t.dark }} />
                  <span style={{ background: t.light }} />
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Pièces</legend>
          <div className="theme-grid">
            {PIECE_SETS.map((s) => (
              <button
                key={s.id}
                className={`theme-opt ${prefs.pieces === s.id ? 'on' : ''}`}
                onClick={() => set('pieces', s.id)}
                aria-pressed={prefs.pieces === s.id}
              >
                <span className="piece-swatch">
                  {s.folder ? (
                    <>
                      <img src={pieceUrl(s.folder, 'wN')} alt="" />
                      <img src={pieceUrl(s.folder, 'bQ')} alt="" />
                    </>
                  ) : (
                    <span className="classic-glyph">♘♛</span>
                  )}
                </span>
                {s.label}
              </button>
            ))}
          </div>
          {PIECE_SETS.find((s) => s.id === prefs.pieces)?.folder && (
            <Preview board={prefs.board} pieces={prefs.pieces} />
          )}
        </fieldset>

        <fieldset>
          <legend>Coups possibles d’une pièce</legend>
          <div className="segmented">
            <button className={prefs.hoverHints ? 'on' : ''} onClick={() => set('hoverHints', true)}>
              Au survol et au clic
            </button>
            <button className={!prefs.hoverHints ? 'on' : ''} onClick={() => set('hoverHints', false)}>
              Au clic seulement
            </button>
          </div>
          <p className="muted small">
            Points sombres : cases où votre pièce peut aller. Points rouges : cases où une pièce adverse peut aller (ses prises
            comprises).
          </p>
        </fieldset>

        <fieldset>
          <legend>Temps pour lire l’analyse de votre coup</legend>
          <div className="segmented">
            {PAUSE_OPTIONS.map((o) => (
              <button
                key={String(o.value)}
                className={prefs.pause === o.value ? 'on' : ''}
                onClick={() => set('pause', o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="muted small">
            L’adversaire attend que votre coup soit analysé, puis ce délai, avant de jouer. Pendant ce temps
            vous pouvez reprendre votre coup. En mode test, il répond directement.
          </p>
        </fieldset>

        <div className="dialog-actions">
          <button className="btn primary" onClick={onClose}>
            Terminé
          </button>
        </div>
      </div>
    </div>
  );
}
