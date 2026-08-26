/**
 * A LanguageRuntime wraps whatever it takes to execute one language's code
 * in the browser (a WASM interpreter, its loader script, output plumbing).
 * CodeRunner only talks to this interface, so adding a new language later
 * (R via webR, etc.) means writing one new file and registering it below —
 * no changes to the editor/UI component itself.
 */
/** Output of bokeh.embed.json_item(), ready for BokehJS's embed_item(). */
export interface BokehPayload {
  version: string;
  items: Record<string, unknown>[];
}

export interface RunResult {
  ok: boolean;
  stdout: string;
  error?: string;
  /** Base64-encoded PNGs of any matplotlib figures left open after the run. */
  images?: string[];
  /** Any Bokeh plot objects left as globals after the run. */
  bokeh?: BokehPayload;
}

export interface LanguageRuntime {
  id: string;
  label: string;
  /** True once the interpreter is downloaded and ready to execute code. */
  isLoaded(): boolean;
  /** Downloads/initializes the interpreter. Safe to call more than once. */
  load(onStatus: (message: string) => void): Promise<void>;
  /** Runs a snippet against an already-loaded interpreter. */
  run(code: string): Promise<RunResult>;
}

/** Placeholder for languages that don't have a working runtime yet. */
export class UnsupportedRuntime implements LanguageRuntime {
  constructor(
    public id: string,
    public label: string,
    private reason: string,
  ) {}
  isLoaded() {
    return false;
  }
  async load(): Promise<void> {
    throw new Error(this.reason);
  }
  async run(): Promise<RunResult> {
    return { ok: false, stdout: "", error: this.reason };
  }
}
