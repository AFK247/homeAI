/**
 * The one interface every image model implements.
 *
 * To add a model: write a file in this folder that exports an ImageModelAdapter,
 * then register it in registry.ts. Nothing else in the harness changes — the
 * runner (validate.ts) only ever talks to this interface.
 *
 * This mirrors the Phase 1D goal from PROJECT_CONTEXT: "swap models by changing
 * one line." The provider-specific details (endpoint, auth, request/response
 * shape) live entirely inside each adapter.
 */

/** A source room image to redesign. */
export interface RoomImage {
  /** Raw file bytes. */
  bytes: Buffer;
  /** MIME type, e.g. "image/jpeg". */
  mime: string;
}

export interface ImageModelAdapter {
  /** Stable key used to select this adapter (registry key + output filename). */
  readonly key: string;
  /** Human-readable name for logs. */
  readonly label: string;
  /**
   * True when the adapter has everything it needs to run (e.g. required env
   * vars are set). The runner skips adapters that aren't ready and says why.
   */
  isReady(): { ok: true } | { ok: false; reason: string };
  /**
   * Run img2img: take the room image + a redesign prompt, return the generated
   * PNG bytes. Throw on failure — the runner catches and reports per generation.
   */
  redesign(prompt: string, room: RoomImage): Promise<Buffer>;
}
