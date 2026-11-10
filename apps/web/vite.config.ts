import { defineConfig, type Plugin } from 'vite';

// The website promises that documents never leave the browser. Enforce it in the
// browser itself: the production page may not open any network connection.
// (Skipped for the Electron build, which blocks network in the main process.)
const csp = (): Plugin => ({
  name: 'strict-csp',
  apply: 'build',
  transformIndexHtml(html, ctx) {
    if (ctx.server) return html;
    const policy =
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'";
    return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
  },
});

export default defineConfig(({ mode }) => ({
  // Relative base: works on GitHub Pages sub-paths and from file:// inside Electron.
  base: './',
  plugins: mode === 'desktop' ? [] : [csp()],
  build: { target: 'es2022' },
}));
