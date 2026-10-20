import type { CSSProperties } from 'react';

export interface UiTheme {
  id: string;
  label: string;
  /** Aperçu : fond, surface, accent */
  swatch: [string, string, string];
  vars: Record<string, string>;
}

export interface BoardTheme {
  id: string;
  label: string;
  light: string;
  dark: string;
  /** Surlignage du dernier coup */
  highlight: string;
}

export interface PieceSet {
  id: string;
  label: string;
  /** null = pièces intégrées à react-chessboard */
  folder: string | null;
}

export const UI_THEMES: UiTheme[] = [
  {
    id: 'club',
    label: 'Club',
    swatch: ['#121a17', '#1f2b26', '#d4a94f'],
    vars: {
      '--bg': '#121a17',
      '--surface': '#18221e',
      '--surface-2': '#1f2b26',
      '--line': '#2c3b34',
      '--text': '#ebe6d8',
      '--muted': '#95a39b',
      '--brass': '#d4a94f',
      '--brass-hover': '#e0b85f',
      '--brass-ink': '#241b07',
      '--scheme': 'dark',
    },
  },
  {
    id: 'nuit',
    label: 'Nuit',
    swatch: ['#10141c', '#1c2330', '#8fb3ff'],
    vars: {
      '--bg': '#10141c',
      '--surface': '#161c27',
      '--surface-2': '#1c2330',
      '--line': '#2a3344',
      '--text': '#e4e8f1',
      '--muted': '#8c97ab',
      '--brass': '#8fb3ff',
      '--brass-hover': '#a8c4ff',
      '--brass-ink': '#0c1530',
      '--scheme': 'dark',
    },
  },
  {
    id: 'acajou',
    label: 'Acajou',
    swatch: ['#1a1310', '#2a201b', '#e39b5b'],
    vars: {
      '--bg': '#1a1310',
      '--surface': '#221915',
      '--surface-2': '#2a201b',
      '--line': '#3b2d26',
      '--text': '#f1e6dc',
      '--muted': '#ab978a',
      '--brass': '#e39b5b',
      '--brass-hover': '#eeae75',
      '--brass-ink': '#2a1405',
      '--scheme': 'dark',
    },
  },
  {
    id: 'craie',
    label: 'Craie',
    swatch: ['#eef0ec', '#ffffff', '#2f6f5e'],
    vars: {
      '--bg': '#eef0ec',
      '--surface': '#ffffff',
      '--surface-2': '#e4e8e2',
      '--line': '#d3d9d1',
      '--text': '#1d2522',
      '--muted': '#5d6a64',
      '--brass': '#2f6f5e',
      '--brass-hover': '#3b8571',
      '--brass-ink': '#ffffff',
      '--scheme': 'light',
    },
  },
];

export const BOARD_THEMES: BoardTheme[] = [
  { id: 'olive', label: 'Ivoire et olive', light: '#e8dcc2', dark: '#8b9a74', highlight: 'rgba(212,169,79,.45)' },
  { id: 'bois', label: 'Bois', light: '#f0d9b5', dark: '#b58863', highlight: 'rgba(205,210,106,.6)' },
  { id: 'tournoi', label: 'Tournoi', light: '#eeeed2', dark: '#769656', highlight: 'rgba(246,246,105,.55)' },
  { id: 'glacier', label: 'Glacier', light: '#dee3e6', dark: '#8ca2ad', highlight: 'rgba(155,199,0,.42)' },
  { id: 'ardoise', label: 'Ardoise', light: '#c9ced6', dark: '#5f6b7c', highlight: 'rgba(143,179,255,.5)' },
  { id: 'corail', label: 'Corail', light: '#f3e4d7', dark: '#c98468', highlight: 'rgba(255,214,102,.55)' },
  { id: 'marbre', label: 'Marbre', light: '#e6e6e3', dark: '#9b9b97', highlight: 'rgba(120,170,220,.5)' },
];

export const PIECE_SETS: PieceSet[] = [
  { id: 'classique', label: 'Classique', folder: null },
  { id: 'cburnett', label: 'Cburnett', folder: 'cburnett' },
  { id: 'merida', label: 'Merida', folder: 'merida' },
  { id: 'chessnut', label: 'Chessnut', folder: 'chessnut' },
  { id: 'fantasy', label: 'Fantasy', folder: 'fantasy' },
  { id: 'rhosgfx', label: 'Rhos', folder: 'rhosgfx' },
];

export type PausePref = 0 | 3 | 6 | 'manual';

export const PAUSE_OPTIONS: { value: PausePref; label: string }[] = [
  { value: 0, label: 'Aucune' },
  { value: 3, label: '3 s' },
  { value: 6, label: '6 s' },
  { value: 'manual', label: 'Jusqu’à mon clic' },
];

export interface Preferences {
  ui: string;
  board: string;
  pieces: string;
  /** Temps de lecture de l'analyse de votre coup avant la réponse de l'IA */
  pause: PausePref;
  /** Montrer les coups possibles au survol d'une pièce (en plus du clic) */
  hoverHints: boolean;
}

export const DEFAULT_PREFS: Preferences = { ui: 'club', board: 'olive', pieces: 'cburnett', pause: 3, hoverHints: true };

const PREFS_KEY = 'eldrachess.prefs';

export function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* stockage indisponible */
  }
  return DEFAULT_PREFS;
}

export function savePrefs(p: Preferences) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export const findUi = (id: string) => UI_THEMES.find((t) => t.id === id) ?? UI_THEMES[0];
export const findBoard = (id: string) => BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
export const findPieces = (id: string) => PIECE_SETS.find((t) => t.id === id) ?? PIECE_SETS[0];

export function applyUiTheme(id: string) {
  const t = findUi(id);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(t.vars)) {
    if (k === '--scheme') root.style.colorScheme = v;
    else root.style.setProperty(k, v);
  }
  root.dataset.theme = t.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.vars['--bg']);
}

export const PIECE_CODES = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'] as const;

export const pieceUrl = (folder: string, code: string) => `/pieces/${folder}/${code}.svg`;

export const pieceImgStyle = (size: number): CSSProperties => ({
  width: size,
  height: size,
  display: 'block',
  userSelect: 'none',
  pointerEvents: 'none',
});
