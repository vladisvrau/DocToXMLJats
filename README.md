# DocToXMLJats

Convert Word (`.docx`) documents to [JATS](https://jats.nlm.nih.gov/) XML **entirely on the client**. There is no server and no API: the file is read into memory, converted, and handed back.

| Part | Path | What it is |
| --- | --- | --- |
| Converter | `packages/core` | Pure TypeScript library (`fflate` + a DOM parser). Runs in browsers, Electron and Node. |
| Website | `apps/web` | Vite app. Production build ships a CSP with `connect-src 'none'`, so the browser itself refuses any network call. |
| Desktop app | `apps/desktop` | Electron shell that loads the same UI, plus desktop-only features. |

## Develop

```bash
npm install
npm test                 # converter tests
npm run dev:web          # website with hot reload
npm run dev:desktop      # builds the UI + main process, launches Electron
npm run typecheck
```

Electron's binary is fetched by its install script. If npm blocks it, run `node node_modules/electron/install.js` once.

## Desktop-only features (implemented vs ideas)

Implemented: native Open/Save dialogs, **batch folder conversion** (writes to `jats-output/`), **"Open with…" / double-click** on `.docx` files, single-instance handling, and all UI network requests blocked.

Ideas: auto-update via `electron-updater` (GitHub Releases), watch-folder mode, a headless CLI sharing `packages/core`, bundled JATS DTD/XSD validation, recent files, saved conversion presets, running conversion in a worker so huge files don't block the UI (this one benefits the website too).

## Releasing the desktop app

1. Replace `OWNER` in `apps/web/src/config.ts` with the GitHub account that owns the repo.
2. `git tag v0.1.0 && git push --tags` — `.github/workflows/release.yml` builds Windows, macOS and Linux installers and attaches them to a GitHub Release.
3. The website's download button links to `releases/latest`. The website itself deploys to GitHub Pages from `main` (enable Pages → "GitHub Actions" in repo settings).

Unsigned installers trigger SmartScreen/Gatekeeper warnings. Code signing is a later decision.

## Converter coverage

Supported: title, abstract, nested sections from heading styles / outline levels, paragraphs, bold/italic/underline/strike/sub/sup, ordered and bullet lists (nested), hyperlinks, footnotes, tables (header row, colspan), author/title from document properties.

Not yet: images/figures, equations (OMML→MathML), references/citations, rowspan, comments/tracked changes. These are reported as warnings in the UI rather than failing silently. The output is JATS 1.3 Archiving-shaped but not yet validated against the DTD.
