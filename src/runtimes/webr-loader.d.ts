// Hand-written types for webr-loader.js's own surface only — see the
// comment there for why webR's real types are kept out of this program.
export interface WebRShelter {
  captureR(
    code: string,
    options?: { withAutoprint?: boolean; captureGraphics?: boolean },
  ): Promise<{ output: { type: string; data: unknown }[] }>;
  purge(): Promise<void>;
}

export function loadWebR(
  baseUrl: string,
  onStatus: (message: string) => void,
): Promise<WebRShelter>;
