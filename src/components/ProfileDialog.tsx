import { useRef, useState } from 'react';
import { CLASS_INFO, type Classification } from '../lib/coach';
import { MAX_GAMES, emptyProfile, toPgn, type Outcome, type Profile, type SavedGame } from '../lib/history';
import { eloLabel } from '../engine/opponent';

interface Props {
  profile: Profile;
  onChange: (p: Profile) => void;
  onOpenGame: (g: SavedGame) => void;
  onClose: () => void;
}

const OUTCOME: Record<Outcome, { label: string; cls: string }> = {
  win: { label: 'Victoire', cls: 'win' },
  draw: { label: 'Nulle', cls: 'draw' },
  loss: { label: 'Défaite', cls: 'loss' },
};

const ORDER: Classification[] = ['best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];

const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
  ' à ' +
  new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ProfileDialog({ profile, onChange, onOpenGame, onClose }: Props) {
  const s = profile.stats;
  const [confirmReset, setConfirmReset] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pct = (n: number) => (s.games ? (n / s.games) * 100 : 0);
  const avgAcc = s.accuracyGames ? Math.round(s.accuracySum / s.accuracyGames) : null;
  const totalMoves = ORDER.reduce((a, k) => a + s.counts[k], 0);
  const perGame = (k: Classification) => (s.accuracyGames ? (s.counts[k] / s.accuracyGames).toFixed(1).replace('.', ',') : '—');
  const trend = [...profile.games].reverse().filter((g) => g.accuracy !== null);

  const importFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as Profile;
      if (!data || !Array.isArray(data.games) || !data.stats) throw new Error();
      onChange({ ...emptyProfile(), ...data });
      setImportError(null);
    } catch {
      setImportError('Ce fichier n’est pas une sauvegarde Eldrachess valide.');
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pr-title" onClick={onClose}>
      <div className="dialog review profile" onClick={(e) => e.stopPropagation()}>
        <header className="review-head">
          <div className="profile-id">
            <span className="avatar" aria-hidden>
              {profile.name.trim().charAt(0).toUpperCase() || 'J'}
            </span>
            <div>
              <input
                id="pr-title"
                className="name-input"
                value={profile.name}
                maxLength={24}
                onChange={(e) => onChange({ ...profile, name: e.target.value })}
                aria-label="Votre nom"
              />
              <p className="muted small">
                {s.games} partie{s.games > 1 ? 's' : ''} jouée{s.games > 1 ? 's' : ''}
                {s.bestWinElo ? `, meilleure victoire contre ${s.bestWinElo} Elo` : ''}
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer le profil">
            ✕
          </button>
        </header>

        {s.games === 0 ? (
          <p className="notice">
            Terminez une partie (mat, nulle ou abandon) pour qu’elle apparaisse ici avec ses statistiques.
          </p>
        ) : (
          <>
            <div className="acc-grid three">
              <div className="acc">
                <span className="acc-num">{avgAcc === null ? '—' : `${avgAcc} %`}</span>
                <span>Précision moyenne</span>
              </div>
              <div className="acc">
                <span className="acc-num">{Math.round(pct(s.wins))} %</span>
                <span>Taux de victoire</span>
              </div>
              <div className="acc">
                <span className="acc-num">{Math.abs(s.streak)}</span>
                <span>
                  {s.streak > 0 ? 'Victoires d’affilée' : s.streak < 0 ? 'Défaites d’affilée' : 'Série en cours'}
                  {s.bestStreak > 1 ? ` (record ${s.bestStreak})` : ''}
                </span>
              </div>
            </div>

            <div className="wdl" aria-label={`${s.wins} victoires, ${s.draws} nulles, ${s.losses} défaites`}>
              <div className="wdl-bar">
                <span className="win" style={{ width: `${pct(s.wins)}%` }} />
                <span className="draw" style={{ width: `${pct(s.draws)}%` }} />
                <span className="loss" style={{ width: `${pct(s.losses)}%` }} />
              </div>
              <div className="wdl-legend">
                <span>
                  <i className="win" /> {s.wins} victoire{s.wins > 1 ? 's' : ''}
                </span>
                <span>
                  <i className="draw" /> {s.draws} nulle{s.draws > 1 ? 's' : ''}
                </span>
                <span>
                  <i className="loss" /> {s.losses} défaite{s.losses > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="profile-cols">
              <table className="counts">
                <thead>
                  <tr>
                    <th />
                    <th>Par partie</th>
                    <th>Part</th>
                  </tr>
                </thead>
                <tbody>
                  {ORDER.map((c) => (
                    <tr key={c}>
                      <td>
                        <span className="badge sm" style={{ background: CLASS_INFO[c].color }} aria-hidden>
                          {CLASS_INFO[c].symbol}
                        </span>
                        {CLASS_INFO[c].label}
                      </td>
                      <td>{perGame(c)}</td>
                      <td>{totalMoves ? `${Math.round((s.counts[c] / totalMoves) * 100)} %` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div>
                <table className="counts">
                  <thead>
                    <tr>
                      <th />
                      <th>V</th>
                      <th>N</th>
                      <th>D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['w', 'b'] as const).map((c) => (
                      <tr key={c}>
                        <td>
                          <span className={`dot ${c}`} aria-hidden /> Avec les {c === 'w' ? 'Blancs' : 'Noirs'}
                        </td>
                        {s.byColor[c].map((n, i) => (
                          <td key={i}>{n}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {trend.length >= 2 && <Trend values={trend.map((g) => g.accuracy!)} />}
              </div>
            </div>
          </>
        )}

        <section>
          <h3>
            {profile.games.length ? `Dernières parties (${profile.games.length}/${MAX_GAMES})` : 'Dernières parties'}
          </h3>
          {profile.games.length === 0 ? (
            <p className="muted">Aucune partie enregistrée pour l’instant.</p>
          ) : (
            <ul className="games">
              {profile.games.map((g) => (
                <li key={g.id}>
                  <button className="game-row" onClick={() => onOpenGame(g)}>
                    <span className={`outcome ${OUTCOME[g.outcome].cls}`}>{OUTCOME[g.outcome].label}</span>
                    <span className="game-main">
                      <strong>
                        <span className={`dot ${g.playerColor}`} aria-hidden /> contre Stockfish {g.elo}
                      </strong>
                      <span className="muted small">
                        {eloLabel(g.elo)}, {Math.ceil(g.moves.length / 2)} coups, {fmtDate(g.date)}
                      </span>
                    </span>
                    <span className="game-acc">
                      {g.accuracy === null ? '—' : `${Math.round(g.accuracy)} %`}
                      {g.counts && g.counts.blunder > 0 && (
                        <span className="small" style={{ color: CLASS_INFO.blunder.color }}>
                          {g.counts.blunder} gaffe{g.counts.blunder > 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                    <span className="game-open">Revoir</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="profile-tools">
          <button
            className="btn ghost sm"
            onClick={() =>
              download(
                'eldrachess-parties.pgn',
                profile.games
                  .slice()
                  .reverse()
                  .map((g) => toPgn(g, profile.name))
                  .join('\n'),
                'application/x-chess-pgn',
              )
            }
            disabled={!profile.games.length}
          >
            Exporter en PGN
          </button>
          <button
            className="btn ghost sm"
            onClick={() => download('eldrachess-profil.json', JSON.stringify(profile, null, 2), 'application/json')}
          >
            Sauvegarder le profil
          </button>
          <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>
            Importer
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
          />
          {confirmReset ? (
            <span className="confirm">
              Tout effacer ?
              <button
                className="btn ghost sm danger"
                onClick={() => {
                  onChange({ ...emptyProfile(), name: profile.name });
                  setConfirmReset(false);
                }}
              >
                Oui, effacer
              </button>
              <button className="btn ghost sm" onClick={() => setConfirmReset(false)}>
                Non
              </button>
            </span>
          ) : (
            <button className="btn ghost sm danger" onClick={() => setConfirmReset(true)} disabled={!s.games}>
              Réinitialiser
            </button>
          )}
        </footer>
        {importError && <p className="notice">{importError}</p>}
        <p className="muted small">
          Profil enregistré dans ce navigateur. Pour le retrouver sur un autre appareil, sauvegardez-le puis
          importez le fichier.
        </p>
      </div>
    </div>
  );
}

function Trend({ values }: { values: number[] }) {
  const W = 260;
  const H = 70;
  const n = values.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * (W - 12) + 6);
  const y = (v: number) => H - 8 - (v / 100) * (H - 16);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <figure className="trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Évolution de la précision sur les dernières parties">
        <line x1={0} x2={W} y1={y(50)} y2={y(50)} className="graph-mid" />
        <path d={d} fill="none" stroke="var(--brass)" strokeWidth={2} strokeLinejoin="round" />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={3} fill="var(--brass)">
            <title>{`${Math.round(v)} %`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="muted small">Précision sur les dernières parties</figcaption>
    </figure>
  );
}
