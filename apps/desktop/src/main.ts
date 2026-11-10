import { convertDocx, type XmlParser } from '@doctoxmljats/core';
import { DOMParser } from '@xmldom/xmldom';
import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const parser = new DOMParser() as unknown as XmlParser;
const DOCX = /\.docx$/i;

let win: BrowserWindow | null = null;
let launchFile: string | null = process.argv.slice(1).find((a) => DOCX.test(a)) ?? null;

async function readDocx(file: string) {
  return { name: path.basename(file), data: new Uint8Array(await readFile(file)) };
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Links leave the app; the app itself never navigates away from its bundled UI.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

async function openFileInWindow(file: string) {
  if (!win) return;
  win.webContents.send('file:opened', await readDocx(file));
  if (win.isMinimized()) win.restore();
  win.focus();
}

// --- single instance + "Open with" ---
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const f = argv.slice(1).find((a) => DOCX.test(a));
    if (f) void openFileInWindow(f);
    else win?.focus();
  });
  // macOS delivers "Open with" through this event instead of argv.
  app.on('open-file', (e, file) => {
    e.preventDefault();
    if (win) void openFileInWindow(file);
    else launchFile = file;
  });

  app.whenReady().then(() => {
    // The converter is offline by design: refuse every network request from the UI.
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      (_details, cb) => cb({ cancel: true }),
    );
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// --- IPC ---
ipcMain.handle('file:launch', async () => {
  const f = launchFile;
  launchFile = null;
  return f ? readDocx(f) : null;
});

ipcMain.handle('file:open', async () => {
  const r = await dialog.showOpenDialog(win!, {
    properties: ['openFile'],
    filters: [{ name: 'Word documents', extensions: ['docx'] }],
  });
  return r.canceled || !r.filePaths[0] ? null : readDocx(r.filePaths[0]);
});

ipcMain.handle('file:save-xml', async (_e, name: string, xml: string) => {
  const r = await dialog.showSaveDialog(win!, {
    defaultPath: path.basename(name),
    filters: [{ name: 'JATS XML', extensions: ['xml'] }],
  });
  if (r.canceled || !r.filePath) return null;
  await writeFile(r.filePath, xml, 'utf8');
  return r.filePath;
});

ipcMain.handle('batch:convert-folder', async () => {
  const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] });
  const dir = r.filePaths[0];
  if (r.canceled || !dir) return null;

  const outDir = path.join(dir, 'jats-output');
  await mkdir(outDir, { recursive: true });
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && DOCX.test(e.name) && !e.name.startsWith('~$'));

  let converted = 0;
  const failed: { file: string; error: string }[] = [];
  for (const f of files) {
    try {
      const { xml } = convertDocx(new Uint8Array(await readFile(path.join(dir, f.name))), { parser });
      await writeFile(path.join(outDir, f.name.replace(DOCX, '.xml')), xml, 'utf8');
      converted++;
    } catch (err) {
      failed.push({ file: f.name, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { outDir, converted, failed };
});
