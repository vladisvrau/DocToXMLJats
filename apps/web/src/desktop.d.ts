/** API exposed by apps/desktop/src/preload.ts. Absent in the browser. */
export interface OpenedFile {
  name: string;
  data: Uint8Array;
}

export interface BatchSummary {
  outDir: string;
  converted: number;
  failed: { file: string; error: string }[];
}

export interface DesktopApi {
  openFile(): Promise<OpenedFile | null>;
  saveXml(suggestedName: string, xml: string): Promise<string | null>;
  convertFolder(): Promise<BatchSummary | null>;
  /** File passed on launch ("Open with…" / double-click), if any. */
  getLaunchFile(): Promise<OpenedFile | null>;
  /** Files opened while the app is already running. */
  onFileOpened(cb: (file: OpenedFile) => void): void;
}

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}
