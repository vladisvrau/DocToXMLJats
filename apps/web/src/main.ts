import { convertDocx } from '@doctoxmljats/core';
import { DOWNLOAD_URL } from './config';
import type { OpenedFile } from './desktop';
import './style.css';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const desktop = window.desktop;

let currentName = 'document';
let currentXml = '';

const status = (msg: string, isError = false) => {
  const el = $('status');
  el.textContent = msg;
  el.classList.toggle('error', isError);
};

async function handle(name: string, data: Uint8Array) {
  status(`Converting ${name}…`);
  // Let the status paint before the (synchronous) conversion starts.
  await new Promise((r) => setTimeout(r, 0));
  try {
    const result = convertDocx(data);
    currentName = name.replace(/\.docx$/i, '');
    currentXml = result.xml;
    $('xml').textContent = result.xml;
    const ul = $('warnings');
    ul.replaceChildren(
      ...result.warnings.map((w) => Object.assign(document.createElement('li'), { textContent: w })),
    );
    $('result').hidden = false;
    status(`Converted “${result.title}” (${(result.xml.length / 1024).toFixed(1)} KB of XML).`);
  } catch (e) {
    $('result').hidden = true;
    status(e instanceof Error ? e.message : String(e), true);
  }
}

async function handleFile(file: File) {
  await handle(file.name, new Uint8Array(await file.arrayBuffer()));
}

// --- browser input ---
$<HTMLInputElement>('file').addEventListener('change', (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) void handleFile(f);
  (e.target as HTMLInputElement).value = '';
});

const drop = $('drop');
for (const ev of ['dragenter', 'dragover']) {
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
}
for (const ev of ['dragleave', 'drop']) {
  drop.addEventListener(ev, () => drop.classList.remove('over'));
}
// Dropping anywhere on the page should convert, not navigate away.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f) void handleFile(f);
});

// --- output actions ---
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentXml);
    status('Copied to clipboard.');
  } catch {
    status('Could not access the clipboard; use Download instead.', true);
  }
});

$('save').addEventListener('click', async () => {
  const fileName = `${currentName}.xml`;
  if (desktop) {
    const saved = await desktop.saveXml(fileName, currentXml);
    if (saved) status(`Saved ${saved}`);
    return;
  }
  const url = URL.createObjectURL(new Blob([currentXml], { type: 'application/xml' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
});

// --- desktop-only extras / website-only download promo ---
if (desktop) {
  $('download').hidden = true;
  $('desktop-tools').hidden = false;
  const openFile = (f: OpenedFile) => void handle(f.name, f.data);
  $('open-native').addEventListener('click', async () => {
    const f = await desktop.openFile();
    if (f) openFile(f);
  });
  $('batch').addEventListener('click', async () => {
    status('Converting folder…');
    const s = await desktop.convertFolder();
    if (!s) return status('');
    const failed = s.failed.length ? `, ${s.failed.length} failed (${s.failed.map((f) => f.file).join(', ')})` : '';
    status(`Converted ${s.converted} file(s) into ${s.outDir}${failed}.`, s.failed.length > 0);
  });
  desktop.onFileOpened(openFile);
  void desktop.getLaunchFile().then((f) => f && openFile(f));
} else {
  const link = $<HTMLAnchorElement>('download-link');
  link.href = DOWNLOAD_URL;
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  if (os) link.textContent = `Download for ${os}`;
}
