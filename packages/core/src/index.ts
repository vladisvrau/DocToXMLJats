import { strFromU8, unzipSync } from 'fflate';

/** Anything with a DOMParser-like interface. Defaults to the global DOMParser. */
export interface XmlParser {
  parseFromString(source: string, mimeType: string): Document;
}

export type JatsVariant = 'archiving' | 'publishing' | 'authoring';
export const JATS_VARIANTS: readonly JatsVariant[] = ['archiving', 'publishing', 'authoring'];
export const DEFAULT_JATS_VARIANT: JatsVariant = 'archiving';

/** DOCTYPE identifiers for JATS 1.3 (with MathML 3). */
const DOCTYPES: Record<JatsVariant, { publicId: string; systemId: string }> = {
  archiving: {
    publicId: '-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with MathML3 v1.3 20210610//EN',
    systemId: 'JATS-archivearticle1-3-mathml3.dtd',
  },
  publishing: {
    publicId: '-//NLM//DTD JATS (Z39.96) Journal Publishing DTD with MathML3 v1.3 20210610//EN',
    systemId: 'JATS-journalpublishing1-3-mathml3.dtd',
  },
  authoring: {
    publicId: '-//NLM//DTD JATS (Z39.96) Article Authoring DTD with MathML3 v1.3 20210610//EN',
    systemId: 'JATS-articleauthoring1-3-mathml3.dtd',
  },
};

export interface ConvertOptions {
  /** Supply a parser when no global DOMParser exists (Node / Electron main). */
  parser?: XmlParser;
  /** Which JATS tag set to declare. Defaults to "archiving". */
  variant?: JatsVariant;
}

export type WarningCode = 'equations' | 'images' | 'vmerge';
export type ErrorCode = 'not-zip' | 'not-word' | 'no-body' | 'no-parser';

export interface ConvertWarning {
  /** Stable code so UIs can translate the message. */
  code: WarningCode;
  /** English fallback text. */
  message: string;
}

/** Thrown for unusable input. `code` is stable and translatable; `message` is English. */
export class ConvertError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ConvertError';
  }
}

const WARNING_TEXT: Record<WarningCode, string> = {
  equations: 'Equations (OMML) were skipped; MathML conversion is not implemented yet.',
  images: 'Images and embedded objects were skipped; figure support is not implemented yet.',
  vmerge: 'Vertically merged table cells are not fully supported (rowspan is not emitted).',
};

export interface ConvertResult {
  xml: string;
  variant: JatsVariant;
  title: string;
  /** BCP 47 language detected from the document (e.g. "pt-BR"), if any. */
  language?: string;
  /** Things in the document we could not (yet) represent in JATS. */
  warnings: ConvertWarning[];
}

/** Section headings that introduce an abstract, mapped to their language. Keys are lowercase, accent-free. */
const ABSTRACT_HEADINGS: Record<string, string> = {
  abstract: 'en',
  resumo: 'pt',
  resumen: 'es',
  resume: 'fr',
  zusammenfassung: 'de',
};
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[:.\s]+$/g, '')
    .toLowerCase();

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const WANTED = new Set([
  'word/document.xml',
  'word/styles.xml',
  'word/numbering.xml',
  'word/footnotes.xml',
  'word/_rels/document.xml.rels',
  'docProps/core.xml',
]);

type El = Element;

const esc = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;');

function kids(el: El | null | undefined, name?: string): El[] {
  if (!el) return [];
  const out: El[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (!name || (n as El).localName === name)) out.push(n as El);
  }
  return out;
}
const kid = (el: El | null | undefined, name: string) => kids(el, name)[0] ?? null;
const wval = (el: El | null | undefined): string | null =>
  el ? (el.getAttributeNS(W, 'val') ?? el.getAttribute('w:val')) : null;
/** Word toggle properties: present means on unless val is 0/false/off. */
const isOn = (el: El | null | undefined) =>
  !!el && !['0', 'false', 'off'].includes((wval(el) ?? '').toLowerCase());

interface StyleInfo {
  name: string;
  basedOn?: string;
  outline?: number;
  numId?: string;
  ilvl?: number;
}

interface ListItem {
  ordered: boolean;
  ilvl: number;
  html: string;
}

class Converter {
  private warned = new Set<WarningCode>();
  private warn(code: WarningCode) {
    this.warned.add(code);
  }
  private styles = new Map<string, StyleInfo>();
  private numbering = new Map<string, Map<number, boolean>>(); // numId -> ilvl -> ordered?
  private rels = new Map<string, string>();
  private footnotes = new Map<string, El>();
  private usedFootnotes: string[] = [];
  private secCounter = 0;

  constructor(
    private parse: (bytes?: Uint8Array) => Document | null,
    private files: Record<string, Uint8Array>,
    private variant: JatsVariant,
  ) {}

  convert(): ConvertResult {
    const doc = this.parse(this.files['word/document.xml']);
    const body = doc ? kid(doc.documentElement, 'body') : null;
    if (!body || !doc) throw new ConvertError('no-body', 'Not a valid .docx: word/document.xml has no body.');

    this.loadStyles();
    this.loadNumbering();
    this.loadRels();
    this.loadFootnotes();

    const { title, abstracts, bodyHtml } = this.convertBody(body);
    const core = this.parse(this.files['docProps/core.xml']);
    const language = this.detectLanguage(doc, core);
    const metaTitle = core?.getElementsByTagName('dc:title')[0]?.textContent?.trim() ?? '';
    const creators = (core?.getElementsByTagName('dc:creator')[0]?.textContent ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    const finalTitle = title || esc(metaTitle) || 'Untitled';
    const contribs = creators.length
      ? `<contrib-group>${creators.map((c) => this.contrib(c)).join('')}</contrib-group>`
      : '';
    const fnGroup = this.usedFootnotes.length
      ? `<back><fn-group>${this.usedFootnotes
          .map((id, i) => `<fn id="fn${i + 1}">${this.footnoteBody(id)}</fn>`)
          .join('')}</fn-group></back>`
      : '';

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<!DOCTYPE article PUBLIC "${DOCTYPES[this.variant].publicId}" "${DOCTYPES[this.variant].systemId}">\n` +
      `<article xmlns:xlink="http://www.w3.org/1999/xlink" article-type="research-article" dtd-version="1.3"${language ? ` xml:lang="${escAttr(language)}"` : ''}>` +
      `<front><article-meta><title-group><article-title>${finalTitle}</article-title></title-group>` +
      contribs +
      abstracts
        .filter((a) => a.buf.length)
        .map((a, i) => {
          const tag = i === 0 ? 'abstract' : 'trans-abstract';
          return `<${tag} xml:lang="${a.lang}">${a.buf.join('')}</${tag}>`;
        })
        .join('') +
      `</article-meta></front><body>${bodyHtml}</body>${fnGroup}</article>\n`;

    return {
      xml,
      variant: this.variant,
      title: finalTitle.replace(/<[^>]+>/g, ''),
      ...(language ? { language } : {}),
      warnings: [...this.warned].map((code) => ({ code, message: WARNING_TEXT[code] })),
    };
  }

  /** Most common explicit run language, else the document default, else dc:language. */
  private detectLanguage(doc: Document, core: Document | null): string | undefined {
    const valid = (v: string | null) => (v && !/^(zxx|none)$/i.test(v) ? v : null);
    const counts = new Map<string, number>();
    for (const l of Array.from(doc.getElementsByTagName('w:lang'))) {
      const v = valid(l.getAttribute('w:val'));
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top) return top;
    const styles = this.parse(this.files['word/styles.xml']);
    const def = valid(styles?.getElementsByTagName('w:lang')[0]?.getAttribute('w:val') ?? null);
    if (def) return def;
    return core?.getElementsByTagName('dc:language')[0]?.textContent?.trim() || undefined;
  }

  // ---------- package parts ----------

  private loadStyles() {
    const doc = this.parse(this.files['word/styles.xml']);
    for (const s of kids(doc?.documentElement, 'style')) {
      const id = s.getAttributeNS(W, 'styleId') ?? s.getAttribute('w:styleId');
      if (!id) continue;
      const pPr = kid(s, 'pPr');
      const outline = wval(kid(pPr, 'outlineLvl'));
      const numPr = kid(pPr, 'numPr');
      const info: StyleInfo = { name: wval(kid(s, 'name')) ?? id };
      const basedOn = wval(kid(s, 'basedOn'));
      if (basedOn) info.basedOn = basedOn;
      if (outline !== null && Number(outline) < 9) info.outline = Number(outline) + 1;
      const numId = wval(kid(numPr, 'numId'));
      if (numId) info.numId = numId;
      const ilvl = wval(kid(numPr, 'ilvl'));
      if (ilvl) info.ilvl = Number(ilvl);
      this.styles.set(id, info);
    }
  }

  private loadNumbering() {
    const doc = this.parse(this.files['word/numbering.xml']);
    if (!doc) return;
    const abstracts = new Map<string, Map<number, boolean>>();
    for (const a of kids(doc.documentElement, 'abstractNum')) {
      const id = a.getAttributeNS(W, 'abstractNumId') ?? a.getAttribute('w:abstractNumId');
      const levels = new Map<number, boolean>();
      for (const lvl of kids(a, 'lvl')) {
        const il = Number(lvl.getAttributeNS(W, 'ilvl') ?? lvl.getAttribute('w:ilvl') ?? 0);
        const fmt = wval(kid(lvl, 'numFmt')) ?? 'bullet';
        levels.set(il, fmt !== 'bullet' && fmt !== 'none');
      }
      if (id) abstracts.set(id, levels);
    }
    for (const n of kids(doc.documentElement, 'num')) {
      const id = n.getAttributeNS(W, 'numId') ?? n.getAttribute('w:numId');
      const abs = wval(kid(n, 'abstractNumId'));
      const levels = abs ? abstracts.get(abs) : undefined;
      if (id && levels) this.numbering.set(id, levels);
    }
  }

  private loadRels() {
    const doc = this.parse(this.files['word/_rels/document.xml.rels']);
    for (const r of kids(doc?.documentElement, 'Relationship')) {
      const id = r.getAttribute('Id');
      const target = r.getAttribute('Target');
      if (id && target && r.getAttribute('TargetMode') === 'External') this.rels.set(id, target);
    }
  }

  private loadFootnotes() {
    const doc = this.parse(this.files['word/footnotes.xml']);
    for (const f of kids(doc?.documentElement, 'footnote')) {
      const type = f.getAttributeNS(W, 'type') ?? f.getAttribute('w:type');
      const id = f.getAttributeNS(W, 'id') ?? f.getAttribute('w:id');
      if (id && !type) this.footnotes.set(id, f);
    }
  }

  // ---------- paragraph classification ----------

  private resolveStyle(id: string | null) {
    const out = {
      title: false,
      level: null as number | null,
      numId: null as string | null,
      ilvl: null as number | null,
    };
    let cur = id ?? undefined;
    for (let guard = 0; cur && guard < 10; guard++) {
      const s = this.styles.get(cur);
      if (!s) break;
      const name = s.name.toLowerCase();
      const m = /^heading (\d)$/.exec(name);
      if (name === 'title') out.title = true;
      if (out.level === null) {
        if (m) out.level = Number(m[1]);
        else if (s.outline) out.level = s.outline;
      }
      if (out.numId === null && s.numId) out.numId = s.numId;
      if (out.ilvl === null && s.ilvl !== undefined) out.ilvl = s.ilvl;
      cur = s.basedOn;
    }
    return out;
  }

  private classify(p: El) {
    const pPr = kid(p, 'pPr');
    const st = this.resolveStyle(wval(kid(pPr, 'pStyle')));
    if (st.title) return { kind: 'title' as const };
    const outline = wval(kid(pPr, 'outlineLvl'));
    const level = outline !== null && Number(outline) < 9 ? Number(outline) + 1 : st.level;
    if (level) return { kind: 'heading' as const, level: Math.min(level, 6) };

    const numPr = kid(pPr, 'numPr');
    const numId = wval(kid(numPr, 'numId')) ?? st.numId;
    if (numId && numId !== '0') {
      const ilvl = Number(wval(kid(numPr, 'ilvl')) ?? st.ilvl ?? 0);
      const ordered = this.numbering.get(numId)?.get(ilvl) ?? false;
      return { kind: 'list' as const, ilvl, ordered };
    }
    return { kind: 'p' as const };
  }

  // ---------- inline content ----------

  private inline(parent: El): string {
    let out = '';
    for (const c of kids(parent)) {
      switch (c.localName) {
        case 'r':
          out += this.run(c);
          break;
        case 'hyperlink': {
          const rid = c.getAttributeNS(R, 'id') ?? c.getAttribute('r:id');
          const href = rid ? this.rels.get(rid) : undefined;
          const inner = this.inline(c);
          out += href
            ? `<ext-link ext-link-type="uri" xlink:href="${escAttr(href)}">${inner}</ext-link>`
            : inner;
          break;
        }
        case 'ins':
        case 'smartTag':
        case 'sdt':
        case 'sdtContent':
        case 'fldSimple':
          out += this.inline(c);
          break;
        case 'oMath':
        case 'oMathPara':
          this.warn('equations');
          break;
      }
    }
    return out;
  }

  private run(r: El): string {
    const rPr = kid(r, 'rPr');
    let text = '';
    for (const c of kids(r)) {
      switch (c.localName) {
        case 't':
          text += esc(c.textContent ?? '');
          break;
        case 'tab':
          text += ' ';
          break;
        case 'br':
        case 'cr':
          text += '<break/>';
          break;
        case 'noBreakHyphen':
          text += '-';
          break;
        case 'footnoteReference': {
          const id = c.getAttributeNS(W, 'id') ?? c.getAttribute('w:id');
          if (id && this.footnotes.has(id)) {
            let idx = this.usedFootnotes.indexOf(id);
            if (idx < 0) idx = this.usedFootnotes.push(id) - 1;
            text += `<xref ref-type="fn" rid="fn${idx + 1}">${idx + 1}</xref>`;
          }
          break;
        }
        case 'drawing':
        case 'pict':
        case 'object':
          this.warn('images');
          break;
      }
    }
    if (!text.trim()) return text;
    if (isOn(kid(rPr, 'b'))) text = `<bold>${text}</bold>`;
    if (isOn(kid(rPr, 'i'))) text = `<italic>${text}</italic>`;
    const u = wval(kid(rPr, 'u'));
    if (kid(rPr, 'u') && u !== 'none') text = `<underline>${text}</underline>`;
    if (isOn(kid(rPr, 'strike'))) text = `<strike>${text}</strike>`;
    const va = wval(kid(rPr, 'vertAlign'));
    if (va === 'superscript') text = `<sup>${text}</sup>`;
    if (va === 'subscript') text = `<sub>${text}</sub>`;
    return text;
  }

  private footnoteBody(id: string): string {
    const f = this.footnotes.get(id);
    return kids(f, 'p')
      .map((p) => this.inline(p).trim())
      .filter(Boolean)
      .map((h) => `<p>${h}</p>`)
      .join('');
  }

  private contrib(name: string): string {
    const parts = name.split(/\s+/);
    const surname = parts.length > 1 ? parts.pop()! : name;
    const given = parts.join(' ');
    return (
      `<contrib contrib-type="author"><name><surname>${esc(surname)}</surname>` +
      (given ? `<given-names>${esc(given)}</given-names>` : '') +
      `</name></contrib>`
    );
  }

  // ---------- blocks ----------

  private table(tbl: El): string {
    const rows = kids(tbl, 'tr');
    const cell = (tc: El, tag: 'td' | 'th') => {
      const span = Number(wval(kid(kid(tc, 'tcPr'), 'gridSpan')) ?? 1);
      if (kid(kid(tc, 'tcPr'), 'vMerge')) {
        this.warn('vmerge');
      }
      const html = kids(tc, 'p')
        .map((p) => this.inline(p).trim())
        .join('<break/>');
      return `<${tag}${span > 1 ? ` colspan="${span}"` : ''}>${html}</${tag}>`;
    };
    const isHeader = (tr: El) => !!kid(kid(tr, 'trPr'), 'tblHeader');
    const head = rows.filter(isHeader);
    const bodyRows = rows.filter((r) => !isHeader(r));
    const render = (rs: El[], tag: 'td' | 'th') =>
      rs.map((tr) => `<tr>${kids(tr, 'tc').map((tc) => cell(tc, tag)).join('')}</tr>`).join('');
    return (
      `<table-wrap><table>` +
      (head.length ? `<thead>${render(head, 'th')}</thead>` : '') +
      `<tbody>${render(bodyRows, 'td')}</tbody></table></table-wrap>`
    );
  }

  private renderList(items: ListItem[]): string {
    let out = '';
    const stack: { ilvl: number }[] = [];
    for (const it of items) {
      while (stack.length && stack[stack.length - 1]!.ilvl > it.ilvl) {
        out += '</list-item></list>';
        stack.pop();
      }
      if (stack.length && stack[stack.length - 1]!.ilvl === it.ilvl) {
        out += '</list-item>';
      } else {
        out += `<list list-type="${it.ordered ? 'order' : 'bullet'}">`;
        stack.push({ ilvl: it.ilvl });
      }
      out += `<list-item><p>${it.html}</p>`;
    }
    while (stack.pop()) out += '</list-item></list>';
    return out;
  }

  private convertBody(body: El) {
    interface Sec {
      id: number;
      level: number;
      title: string;
      buf: string[];
    }
    const stack: Sec[] = [{ id: 0, level: 0, title: '', buf: [] }];
    const abstracts: { lang: string; buf: string[] }[] = [];
    let currentAbstract: { lang: string; buf: string[] } | null = null;
    let title = '';
    let pendingList: ListItem[] = [];

    const out = () => (currentAbstract ? currentAbstract.buf : stack[stack.length - 1]!.buf);
    const flushList = () => {
      if (pendingList.length) out().push(this.renderList(pendingList));
      pendingList = [];
    };
    const closeTo = (level: number) => {
      while (stack.length > 1 && stack[stack.length - 1]!.level >= level) {
        const s = stack.pop()!;
        stack[stack.length - 1]!.buf.push(
          `<sec id="sec-${s.id}"><title>${s.title}</title>${s.buf.join('')}</sec>`,
        );
      }
    };

    for (const el of kids(body)) {
      if (el.localName === 'tbl') {
        flushList();
        out().push(this.table(el));
        continue;
      }
      if (el.localName !== 'p') continue;

      const html = this.inline(el).trim();
      const cls = this.classify(el);
      if (!html) continue;

      if (cls.kind === 'list') {
        pendingList.push({ ordered: cls.ordered, ilvl: cls.ilvl, html });
        continue;
      }
      flushList();

      if (cls.kind === 'title') {
        if (!title) title = html;
        else out().push(`<p>${html}</p>`);
      } else if (cls.kind === 'heading') {
        const abstractLang = ABSTRACT_HEADINGS[fold(html.replace(/<[^>]+>/g, ''))];
        if (abstractLang) {
          closeTo(cls.level);
          currentAbstract = { lang: abstractLang, buf: [] };
          abstracts.push(currentAbstract);
        } else {
          currentAbstract = null;
          closeTo(cls.level);
          stack.push({ id: ++this.secCounter, level: cls.level, title: html, buf: [] });
        }
      } else {
        out().push(`<p>${html}</p>`);
      }
    }
    flushList();
    closeTo(1);
    return {
      title,
      abstracts,
      bodyHtml: stack[0]!.buf.join(''),
    };
  }
}

export function convertDocx(data: Uint8Array, options: ConvertOptions = {}): ConvertResult {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data, { filter: (f) => WANTED.has(f.name) });
  } catch {
    throw new ConvertError('not-zip', 'This file is not a valid .docx (could not open it as a zip archive).');
  }
  if (!files['word/document.xml']) {
    throw new ConvertError('not-word', 'This file is not a Word document (word/document.xml is missing).');
  }

  const parser: XmlParser =
    options.parser ??
    (typeof DOMParser !== 'undefined'
      ? new DOMParser()
      : (() => {
          throw new ConvertError('no-parser', 'No DOMParser available: pass options.parser.');
        })());

  const parse = (bytes?: Uint8Array) =>
    bytes ? parser.parseFromString(strFromU8(bytes).replace(/^﻿/, ''), 'application/xml') : null;

  const variant = options.variant ?? DEFAULT_JATS_VARIANT;
  if (!JATS_VARIANTS.includes(variant)) throw new RangeError(`Unknown JATS variant: ${String(variant)}`);
  return new Converter(parse, files, variant).convert();
}
