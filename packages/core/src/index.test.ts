import { DOMParser } from '@xmldom/xmldom';
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { convertDocx, type XmlParser } from './index';

const parser = new DOMParser() as unknown as XmlParser;
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function docx(body: string, extra: Record<string, string> = {}): Uint8Array {
  const files: Record<string, Uint8Array> = {
    'word/document.xml': strToU8(`<?xml version="1.0"?><w:document ${NS}><w:body>${body}</w:body></w:document>`),
  };
  for (const [k, v] of Object.entries(extra)) files[k] = strToU8(v);
  return zipSync(files);
}

const styles = `<w:styles ${NS}>
  <w:style w:styleId="Title"><w:name w:val="Title"/></w:style>
  <w:style w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
  <w:style w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
</w:styles>`;

const p = (text: string, style?: string, rpr = '') =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t>${text}</w:t></w:r></w:p>`;

describe('convertDocx', () => {
  it('rejects non-docx input', () => {
    expect(() => convertDocx(new Uint8Array([1, 2, 3]), { parser })).toThrow(/not a valid/);
    expect(() => convertDocx(zipSync({ 'x.txt': strToU8('hi') }), { parser })).toThrow(/not a Word document/);
  });

  it('builds title, nested sections and abstract', () => {
    const body =
      p('My Paper', 'Title') +
      p('Abstract', 'Heading1') +
      p('Short summary.') +
      p('Intro', 'Heading1') +
      p('Hello &amp; &lt;world&gt;') +
      p('Background', 'Heading2') +
      p('Deep text') +
      p('Methods', 'Heading1') +
      p('Done');
    const { xml, title } = convertDocx(docx(body, { 'word/styles.xml': styles }), { parser });
    expect(title).toBe('My Paper');
    expect(xml).toContain('<article-title>My Paper</article-title>');
    expect(xml).toContain('<abstract xml:lang="en"><p>Short summary.</p></abstract>');
    expect(xml).toContain('<sec id="sec-1"><title>Intro</title><p>Hello &amp; &lt;world&gt;</p><sec id="sec-2"><title>Background</title><p>Deep text</p></sec></sec>');
    expect(xml).toContain('<title>Methods</title><p>Done</p>');
  });

  it('maps inline formatting', () => {
    const { xml } = convertDocx(
      docx(p('x', undefined, '<w:b/><w:i/>') + p('2', undefined, '<w:vertAlign w:val="superscript"/>') + p('off', undefined, '<w:b w:val="0"/>')),
      { parser },
    );
    expect(xml).toContain('<italic><bold>x</bold></italic>');
    expect(xml).toContain('<sup>2</sup>');
    expect(xml).toContain('<p>off</p>');
  });

  it('handles lists, links, footnotes, tables and author metadata', () => {
    const li = (t: string, ilvl: number, numId = 1) =>
      `<w:p><w:pPr><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr><w:r><w:t>${t}</w:t></w:r></w:p>`;
    const body =
      li('a', 0) + li('a1', 1) + li('b', 0) +
      `<w:p><w:hyperlink r:id="rId9"><w:r><w:t>site</w:t></w:r></w:hyperlink><w:r><w:footnoteReference w:id="2"/></w:r></w:p>` +
      `<w:tbl><w:tr><w:trPr><w:tblHeader/></w:trPr><w:tc><w:p><w:r><w:t>H</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>v</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`;
    const numbering = `<w:numbering ${NS}>
      <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl><w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>
      <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
    const { xml, warnings } = convertDocx(
      docx(body, {
        'word/numbering.xml': numbering,
        'word/_rels/document.xml.rels': `<Relationships><Relationship Id="rId9" Type="x" Target="https://example.org/?a=1&amp;b=2" TargetMode="External"/></Relationships>`,
        'word/footnotes.xml': `<w:footnotes ${NS}><w:footnote w:type="separator" w:id="-1"><w:p/></w:footnote><w:footnote w:id="2"><w:p><w:r><w:t>Note text</w:t></w:r></w:p></w:footnote></w:footnotes>`,
        'docProps/core.xml': `<cp:coreProperties xmlns:cp="c" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Meta Title</dc:title><dc:creator>Ada Lovelace; Alan Turing</dc:creator></cp:coreProperties>`,
      }),
      { parser },
    );
    expect(xml).toContain('<list list-type="order"><list-item><p>a</p><list list-type="bullet"><list-item><p>a1</p></list-item></list></list-item><list-item><p>b</p></list-item></list>');
    expect(xml).toContain('<ext-link ext-link-type="uri" xlink:href="https://example.org/?a=1&amp;b=2">site</ext-link>');
    expect(xml).toContain('<xref ref-type="fn" rid="fn1">1</xref>');
    expect(xml).toContain('<fn id="fn1"><p>Note text</p></fn>');
    expect(xml).toContain('<thead><tr><th>H</th></tr></thead><tbody><tr><td>v</td></tr></tbody>');
    expect(xml).toContain('<article-title>Meta Title</article-title>');
    expect(xml).toContain('<surname>Lovelace</surname>');
    expect(warnings).toEqual([]);
  });

  it('warns about unsupported content', () => {
    const { warnings } = convertDocx(docx(`<w:p><w:r><w:drawing/></w:r><w:r><w:t>x</w:t></w:r></w:p>`), { parser });
    expect(warnings.map((w) => w.code)).toEqual(['images']);
  });

  it('throws translatable error codes', () => {
    expect(() => convertDocx(new Uint8Array([1, 2, 3]), { parser })).toThrowError(expect.objectContaining({ code: 'not-zip' }));
  });

  it('detects the document language and recognises localized abstracts', () => {
    const lang = (v: string) => `<w:lang w:val="${v}"/>`;
    const body =
      p('Título', 'Title') +
      p('Resumo', 'Heading1') +
      p('Texto do resumo.', undefined, lang('pt-BR')) +
      p('Abstract', 'Heading1') +
      p('English summary.', undefined, lang('pt-BR')) +
      p('Introdução', 'Heading1') +
      p('Corpo.', undefined, lang('pt-BR')) +
      p('Résumé', 'Heading1') +
      p('Fr.', undefined, lang('en-US'));
    const { xml, language } = convertDocx(docx(body, { 'word/styles.xml': styles }), { parser });
    expect(language).toBe('pt-BR');
    expect(xml).toContain('xml:lang="pt-BR"');
    expect(xml).toContain('<abstract xml:lang="pt"><p>Texto do resumo.</p></abstract>');
    expect(xml).toContain('<trans-abstract xml:lang="en"><p>English summary.</p></trans-abstract>');
    expect(xml).toContain('<trans-abstract xml:lang="fr"><p>Fr.</p></trans-abstract>');
    expect(xml).toContain('<title>Introdução</title><p>Corpo.</p>');
  });

  it('declares the requested JATS variant (archiving by default)', () => {
    const data = docx(p('x'));
    const doctype = (v?: 'archiving' | 'publishing' | 'authoring') =>
      /<!DOCTYPE article PUBLIC "([^"]+)" "([^"]+)">/.exec(convertDocx(data, { parser, ...(v ? { variant: v } : {}) }).xml)!.slice(1);
    expect(doctype()).toEqual([
      '-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with MathML3 v1.3 20210610//EN',
      'JATS-archivearticle1-3-mathml3.dtd',
    ]);
    expect(doctype('publishing')).toEqual([
      '-//NLM//DTD JATS (Z39.96) Journal Publishing DTD with MathML3 v1.3 20210610//EN',
      'JATS-journalpublishing1-3-mathml3.dtd',
    ]);
    expect(doctype('authoring')).toEqual([
      '-//NLM//DTD JATS (Z39.96) Article Authoring DTD with MathML3 v1.3 20210610//EN',
      'JATS-articleauthoring1-3-mathml3.dtd',
    ]);
    expect(convertDocx(data, { parser, variant: 'authoring' }).variant).toBe('authoring');
    // @ts-expect-error invalid variant
    expect(() => convertDocx(data, { parser, variant: 'nope' })).toThrow(RangeError);
  });

  it('omits xml:lang when the document declares no language', () => {
    const { xml, language } = convertDocx(docx(p('x')), { parser });
    expect(language).toBeUndefined();
    expect(xml).not.toContain('xml:lang');
  });
});
