import { barFraction, formatEval, type Evaluation } from '../lib/evaluation';

interface Props {
  evaluation: Evaluation | null | undefined;
  orientation: 'white' | 'black';
  hidden: boolean;
  loading: boolean;
}

export function EvalBar({ evaluation, orientation, hidden, loading }: Props) {
  const white = barFraction(evaluation);
  const text = formatEval(evaluation);
  const whiteAhead = white >= 0.5;
  // La part des Blancs part du bas si l'échiquier est vu côté Blancs
  const whiteAtBottom = orientation === 'white';
  const labelAtBottom = whiteAhead === whiteAtBottom;

  return (
    <div
      className={`evalbar ${hidden ? 'is-hidden' : ''}`}
      role="meter"
      aria-label="Évaluation de la position"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(white * 100)}
      aria-valuetext={hidden ? 'Masquée (mode test)' : text}
    >
      {hidden ? (
        <div className="evalbar-hidden" title="Évaluation masquée en mode test">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path
              d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.8 9.8 0 0112 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.6 6.6C4.5 8 3.1 10 2 12c1 2.5 5 7 10 7 1.6 0 3-.4 4.3-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : (
        <>
          <div
            className="evalbar-white"
            style={{
              height: `${white * 100}%`,
              [whiteAtBottom ? 'bottom' : 'top']: 0,
            }}
          />
          <span
            className={`evalbar-label ${whiteAhead ? 'on-white' : 'on-black'} ${loading ? 'is-loading' : ''}`}
            style={{ [labelAtBottom ? 'bottom' : 'top']: 6 }}
          >
            {text}
          </span>
        </>
      )}
    </div>
  );
}
