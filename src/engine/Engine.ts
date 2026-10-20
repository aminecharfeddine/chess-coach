// Wrapper UCI minimal autour de Stockfish (WASM) exécuté dans un Web Worker.
// Chaque instance = un worker indépendant. Les recherches sont sérialisées.

export const ENGINE_URL = '/engine/stockfish-18-lite-single.js';

export interface PvLine {
  multipv: number;
  depth: number;
  /** Score du point de vue du camp au trait */
  cp: number | null;
  mate: number | null;
  pv: string[];
}

export interface SearchResult {
  bestmove: string | null;
  lines: PvLine[];
}

export interface GoOptions {
  depth?: number;
  movetime?: number;
  multipv?: number;
}

type Listener = (line: string) => void;

export class Engine {
  private worker: Worker;
  private listeners = new Set<Listener>();
  private chain: Promise<unknown> = Promise.resolve();
  private ready: Promise<void>;
  private currentMultiPv = 1;
  private searching = false;
  private destroyed = false;

  constructor(options: Record<string, string | number | boolean> = {}) {
    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data);
      this.listeners.forEach((l) => l(line));
    };
    this.ready = (async () => {
      this.send('uci');
      await this.waitFor((l) => l === 'uciok');
      for (const [k, v] of Object.entries(options)) this.setOptionRaw(k, v);
      await this.isReady();
    })();
  }

  private send(cmd: string) {
    if (!this.destroyed) this.worker.postMessage(cmd);
  }

  private waitFor(pred: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => {
      const l: Listener = (line) => {
        if (pred(line)) {
          this.listeners.delete(l);
          resolve(line);
        }
      };
      this.listeners.add(l);
    });
  }

  private async isReady() {
    this.send('isready');
    await this.waitFor((l) => l === 'readyok');
  }

  private setOptionRaw(name: string, value: string | number | boolean) {
    this.send(`setoption name ${name} value ${value}`);
  }

  /** Change des options (sérialisé avec les recherches). */
  setOptions(options: Record<string, string | number | boolean>) {
    return this.enqueue(async () => {
      for (const [k, v] of Object.entries(options)) this.setOptionRaw(k, v);
      await this.isReady();
    });
  }

  newGame() {
    return this.enqueue(async () => {
      this.send('ucinewgame');
      await this.isReady();
    });
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.chain.then(() => this.ready).then(job);
    this.chain = run.catch(() => undefined);
    return run;
  }

  /** Interrompt la recherche en cours (le résultat partiel est renvoyé). */
  stop() {
    if (this.searching) this.send('stop');
  }

  search(fen: string, go: GoOptions): Promise<SearchResult> {
    return this.enqueue(async () => {
      const multipv = go.multipv ?? 1;
      if (multipv !== this.currentMultiPv) {
        this.setOptionRaw('MultiPV', multipv);
        this.currentMultiPv = multipv;
      }
      const lines = new Map<number, PvLine>();
      const onInfo: Listener = (line) => {
        if (!line.startsWith('info') || !line.includes(' score ')) return;
        const parsed = parseInfo(line);
        if (parsed) lines.set(parsed.multipv, parsed);
      };
      this.listeners.add(onInfo);
      this.searching = true;
      this.send(`position fen ${fen}`);
      const parts = ['go'];
      if (go.depth) parts.push('depth', String(go.depth));
      if (go.movetime) parts.push('movetime', String(go.movetime));
      this.send(parts.join(' '));
      const bm = await this.waitFor((l) => l.startsWith('bestmove'));
      this.searching = false;
      this.listeners.delete(onInfo);
      const best = bm.split(/\s+/)[1];
      return {
        bestmove: best && best !== '(none)' ? best : null,
        lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv),
      };
    });
  }

  destroy() {
    this.destroyed = true;
    this.worker.terminate();
    this.listeners.clear();
  }
}

function parseInfo(line: string): PvLine | null {
  const tok = line.split(/\s+/);
  let depth = 0;
  let multipv = 1;
  let cp: number | null = null;
  let mate: number | null = null;
  let pv: string[] = [];
  let bound = false;
  for (let i = 0; i < tok.length; i++) {
    switch (tok[i]) {
      case 'depth':
        depth = Number(tok[++i]);
        break;
      case 'multipv':
        multipv = Number(tok[++i]);
        break;
      case 'score':
        if (tok[i + 1] === 'cp') cp = Number(tok[i + 2]);
        else if (tok[i + 1] === 'mate') mate = Number(tok[i + 2]);
        i += 2;
        if (tok[i + 1] === 'lowerbound' || tok[i + 1] === 'upperbound') bound = true;
        break;
      case 'pv':
        pv = tok.slice(i + 1);
        i = tok.length;
        break;
    }
  }
  if (bound) return null;
  if (cp === null && mate === null) return null;
  return { multipv, depth, cp, mate, pv };
}
