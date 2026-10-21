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
  {
    id: 'minuit',
    label: 'Minuit',
    swatch: ['#15121e', '#241e33', '#b794f6'],
    vars: {
      '--bg': '#15121e',
      '--surface': '#1c1828',
      '--surface-2': '#241e33',
      '--line': '#352d48',
      '--text': '#ece6f7',
      '--muted': '#9e94b3',
      '--brass': '#b794f6',
      '--brass-hover': '#c9adff',
      '--brass-ink': '#1d0f3a',
      '--scheme': 'dark',
    },
  },
  {
    id: 'ocean',
    label: 'Océan',
    swatch: ['#0c191d', '#16292f', '#4fd1c5'],
    vars: {
      '--bg': '#0c191d',
      '--surface': '#112126',
      '--surface-2': '#16292f',
      '--line': '#223a41',
      '--text': '#e1f0f0',
      '--muted': '#88a6a8',
      '--brass': '#4fd1c5',
      '--brass-hover': '#72e0d6',
      '--brass-ink': '#03201d',
      '--scheme': 'dark',
    },
  },
  {
    id: 'graphite',
    label: 'Graphite',
    swatch: ['#17181a', '#25272a', '#f5a524'],
    vars: {
      '--bg': '#17181a',
      '--surface': '#1e2022',
      '--surface-2': '#25272a',
      '--line': '#34373b',
      '--text': '#ececec',
      '--muted': '#9a9ea3',
      '--brass': '#f5a524',
      '--brass-hover': '#ffb94a',
      '--brass-ink': '#2b1a00',
      '--scheme': 'dark',
    },
  },
  {
    id: 'bordeaux',
    label: 'Bordeaux',
    swatch: ['#1b1013', '#2b1a1f', '#e8b04b'],
    vars: {
      '--bg': '#1b1013',
      '--surface': '#221519',
      '--surface-2': '#2b1a1f',
      '--line': '#3e262d',
      '--text': '#f3e6e8',
      '--muted': '#ad9298',
      '--brass': '#e8b04b',
      '--brass-hover': '#f2c46c',
      '--brass-ink': '#2c1a00',
      '--scheme': 'dark',
    },
  },
  {
    id: 'papier',
    label: 'Papier',
    swatch: ['#f3f4f6', '#ffffff', '#2b59c3'],
    vars: {
      '--bg': '#f3f4f6',
      '--surface': '#ffffff',
      '--surface-2': '#e7e9ee',
      '--line': '#d5d9e0',
      '--text': '#1b1f27',
      '--muted': '#5c6472',
      '--brass': '#2b59c3',
      '--brass-hover': '#3a6ad6',
      '--brass-ink': '#ffffff',
      '--scheme': 'light',
    },
  },
  {
    id: 'sable',
    label: 'Sable',
    swatch: ['#f2ebe0', '#fbf7f1', '#9a4f2c'],
    vars: {
      '--bg': '#f2ebe0',
      '--surface': '#fbf7f1',
      '--surface-2': '#e9dfd0',
      '--line': '#dccfbd',
      '--text': '#2b2118',
      '--muted': '#76685a',
      '--brass': '#9a4f2c',
      '--brass-hover': '#b05f39',
      '--brass-ink': '#ffffff',
      '--scheme': 'light',
    },
  },
  {
    id: 'neige',
    label: 'Neige',
    swatch: ['#f6f7f9', '#ffffff', '#4353ff'],
    vars: {
      '--bg': '#f6f7f9',
      '--surface': '#ffffff',
      '--surface-2': '#eef0f4',
      '--line': '#e1e4ea',
      '--text': '#151821',
      '--muted': '#5f6675',
      '--brass': '#4353ff',
      '--brass-hover': '#5b69ff',
      '--brass-ink': '#ffffff',
      '--scheme': 'light',
    },
  },
  {
    id: 'ciel',
    label: 'Ciel',
    swatch: ['#eef4fb', '#ffffff', '#1d6fe0'],
    vars: {
      '--bg': '#eef4fb',
      '--surface': '#ffffff',
      '--surface-2': '#e3ecf7',
      '--line': '#d3dfee',
      '--text': '#0f1e33',
      '--muted': '#556985',
      '--brass': '#1d6fe0',
      '--brass-hover': '#3583ee',
      '--brass-ink': '#ffffff',
      '--scheme': 'light',
    },
  },
  {
    id: 'brume',
    label: 'Brume',
    swatch: ['#eef3f2', '#fbfdfc', '#0e8a7f'],
    vars: {
      '--bg': '#eef3f2',
      '--surface': '#fbfdfc',
      '--surface-2': '#e2eae8',
      '--line': '#d2dddb',
      '--text': '#14201e',
      '--muted': '#55716c',
      '--brass': '#0e8a7f',
      '--brass-hover': '#16a194',
      '--brass-ink': '#ffffff',
      '--scheme': 'light',
    },
  },
  {
    id: 'petale',
    label: 'Pétale',
    swatch: ['#fbf4f5', '#ffffff', '#c23a6b'],
    vars: {
      '--bg': '#fbf4f5',
      '--surface': '#ffffff',
      '--surface-2': '#f5e7ea',
      '--line': '#ecd8dd',
      '--text': '#261519',
      '--muted': '#7a5d64',
      '--brass': '#c23a6b',
      '--brass-hover': '#d4517f',
      '--brass-ink': '#ffffff',
      '--scheme': 'light',
    },
  },
  {
    id: 'lilas',
    label: 'Lilas',
    swatch: ['#f5f3fc', '#ffffff', '#6b4ce6'],
    vars: {
      '--bg': '#f5f3fc',
      '--surface': '#ffffff',
      '--surface-2': '#ece8f8',
      '--line': '#dfd9f2',
      '--text': '#1c1730',
      '--muted': '#6a6385',
      '--brass': '#6b4ce6',
      '--brass-hover': '#7d61f0',
      '--brass-ink': '#ffffff',
      '--scheme': 'light',
    },
  },
  {
    id: 'agrume',
    label: 'Agrume',
    swatch: ['#fbf8ef', '#fffdf7', '#c77700'],
    vars: {
      '--bg': '#fbf8ef',
      '--surface': '#fffdf7',
      '--surface-2': '#f3eddc',
      '--line': '#e7dfc8',
      '--text': '#221d10',
      '--muted': '#6f6750',
      '--brass': '#c77700',
      '--brass-hover': '#dc8a10',
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
  { id: 'noyer', label: 'Noyer', light: '#dcbf96', dark: '#7d5638', highlight: 'rgba(240,200,80,.55)' },
  { id: 'ocean', label: 'Océan', light: '#d7eaee', dark: '#4b8a98', highlight: 'rgba(255,214,102,.55)' },
  { id: 'lavande', label: 'Lavande', light: '#ebe4f3', dark: '#9479b9', highlight: 'rgba(255,214,102,.55)' },
  { id: 'menthe', label: 'Menthe', light: '#e7f3ea', dark: '#6fae8a', highlight: 'rgba(255,214,102,.6)' },
  { id: 'cerise', label: 'Cerise', light: '#f4dede', dark: '#b85c66', highlight: 'rgba(255,214,102,.55)' },
  { id: 'sable', label: 'Sable', light: '#f5e9cf', dark: '#c9a66b', highlight: 'rgba(120,170,90,.5)' },
  { id: 'charbon', label: 'Charbon', light: '#a9abae', dark: '#55585d', highlight: 'rgba(245,165,36,.55)' },
  { id: 'contraste', label: 'Contraste', light: '#ffffff', dark: '#6b7280', highlight: 'rgba(43,89,195,.4)' },
];

export const PIECE_SETS: PieceSet[] = [
  { id: 'classique', label: 'Classique', folder: null },
  { id: 'cburnett', label: 'Cburnett', folder: 'cburnett' },
  { id: 'merida', label: 'Merida', folder: 'merida' },
  { id: 'chessnut', label: 'Chessnut', folder: 'chessnut' },
  { id: 'fantasy', label: 'Fantasy', folder: 'fantasy' },
  { id: 'rhosgfx', label: 'Rhos', folder: 'rhosgfx' },
  { id: 'celtic', label: 'Celtic', folder: 'celtic' },
  { id: 'spatial', label: 'Spatial', folder: 'spatial' },
  { id: 'kiwen-suwi', label: 'Kiwen-suwi', folder: 'kiwen-suwi' },
  { id: 'firi', label: 'Firi', folder: 'firi' },
  { id: 'mpchess', label: 'MPChess', folder: 'mpchess' },
  { id: 'totoy', label: 'Totoy', folder: 'totoy' },
  { id: 'papercut', label: 'Papercut', folder: 'papercut' },
  { id: 'shapes', label: 'Formes', folder: 'shapes' },
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
  root.dataset.scheme = t.vars['--scheme'];
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
