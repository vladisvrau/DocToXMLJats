import { ConvertError, convertDocx, type WarningCode } from '@doctoxmljats/core';
import { DOWNLOAD_URL } from './config';
import type { OpenedFile } from './desktop';
import { type Key, type Locale, LOCALES, matchLocale, setLocale, t } from './i18n';
import './style.css';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const desktop = window.desktop;

let currentName = 'document';
let currentXml = '';

// What the status line and warnings currently show, kept as keys so a language
// switch can re-render them instead of leaving stale text.
let statusState: { key: Key; params?: Record<string, string | number>; error?: boolean } | null = null;
let warningCodes: WarningCode[] = [];

const LANG_STORAGE_KEY = 'doctoxmljats.lang';
const storage = {
  get: () => {
    try {
      return localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set: (v: string) => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, v);
    } catch {
      /* private mode etc.: the choice just won't persist */
    }
  },
};

function renderStatus() {
  const el = $('status');
  el.textContent = statusState ? t(statusState.key, statusState.params) : '';
  el.classList.toggle('error', !!statusState?.error);
}
function status(key: Key | null, params?: Record<string, string | number>, error = false) {
  statusState = key ? { key, ...(params ? { params } : {}), error } : null;
  renderStatus();
}

function renderWarnings() {
  $('warnings').replaceChildren(
    ...warningCodes.map((c) => Object.assign(document.createElement('li'), { textContent: t(`warn.${c}`) })),
  );
}

function renderDownloadLink() {
  const link = $<HTMLAnchorElement>('download-link');
  link.href = DOWNLOAD_URL;
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  link.textContent = os ? t('downloadFor', { os }) : t('downloadGeneric');
}

function applyLocale(locale: Locale) {
  setLocale(locale);
  document.documentElement.lang = locale;
  document.title = t('pageTitle');
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n as Key);
  }
  $<HTMLSelectElement>('lang').value = locale;
  renderStatus();
  renderWarnings();
  if (!desktop) renderDownloadLink();
}

async function handle(name: string, data: Uint8Array) {
  status('converting', { name });
  // Let the status paint before the (synchronous) conversion starts.
  await new Promise((r) => setTimeout(r, 0));
  try {
    const result = convertDocx(data);
    currentName = name.replace(/\.docx$/i, '');
    currentXml = result.xml;
    $('xml').textContent = result.xml;
    warningCodes = result.warnings.map((w) => w.code);
    renderWarnings();
    $('result').hidden = false;
    status('converted', { title: result.title, size: (result.xml.length / 1024).toFixed(1) });
  } catch (e) {
    $('result').hidden = true;
    if (e instanceof ConvertError) status(`err.${e.code}`, undefined, true);
    else status('err.unknown', { message: e instanceof Error ? e.message : String(e) }, true);
  }
}

async function handleFile(file: File) {
  await handle(file.name, new Uint8Array(await file.arrayBuffer()));
}

// --- language switcher ---
const select = $<HTMLSelectElement>('lang');
for (const [code, label] of Object.entries(LOCALES)) {
  select.append(Object.assign(document.createElement('option'), { value: code, textContent: label }));
}
select.addEventListener('change', () => {
  const l = select.value as Locale;
  storage.set(l);
  applyLocale(l);
});
const stored = storage.get();
applyLocale(stored && stored in LOCALES ? (stored as Locale) : matchLocale(navigator.languages ?? [navigator.language]));

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
    status('copied');
  } catch {
    status('clipboardFail', undefined, true);
  }
});

$('save').addEventListener('click', async () => {
  const fileName = `${currentName}.xml`;
  if (desktop) {
    const saved = await desktop.saveXml(fileName, currentXml);
    if (saved) status('saved', { path: saved });
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
    status('folderConverting');
    const s = await desktop.convertFolder();
    if (!s) return status(null);
    if (s.failed.length) {
      status(
        'folderDoneFailed',
        { n: s.converted, dir: s.outDir, failed: s.failed.length, files: s.failed.map((f) => f.file).join(', ') },
        true,
      );
    } else {
      status('folderDone', { n: s.converted, dir: s.outDir });
    }
  });
  desktop.onFileOpened(openFile);
  void desktop.getLaunchFile().then((f) => f && openFile(f));
}
