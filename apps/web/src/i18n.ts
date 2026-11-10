/** Tiny dependency-free i18n. English is the source of truth for keys. */

const en = {
  pageTitle: 'DOCX to JATS XML',
  heading: 'DOCX → JATS XML',
  lede: 'Converted entirely on your device. Your document is never uploaded.',
  language: 'Language',
  dropStrong: 'Drop a .docx here',
  dropRest: 'or click to choose',
  open: 'Open…',
  batch: 'Convert a folder…',
  copy: 'Copy XML',
  save: 'Download .xml',
  downloadHeading: 'Prefer a desktop app?',
  downloadText: 'Same converter, plus batch folder conversion, “Open with” support and offline-only operation.',
  downloadGeneric: 'Download the desktop app',
  downloadFor: 'Download for {os}',
  converting: 'Converting {name}…',
  converted: 'Converted “{title}” ({size} KB of XML).',
  copied: 'Copied to clipboard.',
  clipboardFail: 'Could not access the clipboard; use Download instead.',
  saved: 'Saved {path}',
  folderConverting: 'Converting folder…',
  folderDone: 'Converted {n} file(s) into {dir}.',
  folderDoneFailed: 'Converted {n} file(s) into {dir}; {failed} failed ({files}).',
  'err.not-zip': 'This file is not a valid .docx (it could not be opened as a zip archive).',
  'err.not-word': 'This file is not a Word document (word/document.xml is missing).',
  'err.no-body': 'This .docx is damaged: its main document has no body.',
  'err.no-parser': 'This environment cannot read XML.',
  'err.unknown': 'Unexpected error: {message}',
  'warn.equations': 'Equations were skipped; MathML conversion is not implemented yet.',
  'warn.images': 'Images and embedded objects were skipped; figure support is not implemented yet.',
  'warn.vmerge': 'Vertically merged table cells are not fully supported (rowspan is not emitted).',
};

export type Key = keyof typeof en;
type Dict = Record<Key, string>;

const ptBR: Dict = {
  pageTitle: 'DOCX para JATS XML',
  heading: 'DOCX → JATS XML',
  lede: 'Convertido inteiramente no seu dispositivo. Seu documento nunca é enviado.',
  language: 'Idioma',
  dropStrong: 'Solte um arquivo .docx aqui',
  dropRest: 'ou clique para escolher',
  open: 'Abrir…',
  batch: 'Converter uma pasta…',
  copy: 'Copiar XML',
  save: 'Baixar .xml',
  downloadHeading: 'Prefere um aplicativo de desktop?',
  downloadText: 'O mesmo conversor, com conversão de pastas em lote, suporte a “Abrir com” e funcionamento totalmente offline.',
  downloadGeneric: 'Baixar o aplicativo de desktop',
  downloadFor: 'Baixar para {os}',
  converting: 'Convertendo {name}…',
  converted: '“{title}” convertido ({size} KB de XML).',
  copied: 'Copiado para a área de transferência.',
  clipboardFail: 'Não foi possível acessar a área de transferência; use Baixar.',
  saved: 'Salvo em {path}',
  folderConverting: 'Convertendo a pasta…',
  folderDone: '{n} arquivo(s) convertido(s) em {dir}.',
  folderDoneFailed: '{n} arquivo(s) convertido(s) em {dir}; {failed} falharam ({files}).',
  'err.not-zip': 'Este arquivo não é um .docx válido (não pôde ser aberto como arquivo zip).',
  'err.not-word': 'Este arquivo não é um documento do Word (falta word/document.xml).',
  'err.no-body': 'Este .docx está danificado: o documento principal não tem corpo.',
  'err.no-parser': 'Este ambiente não consegue ler XML.',
  'err.unknown': 'Erro inesperado: {message}',
  'warn.equations': 'As equações foram ignoradas; a conversão para MathML ainda não foi implementada.',
  'warn.images': 'Imagens e objetos incorporados foram ignorados; o suporte a figuras ainda não foi implementado.',
  'warn.vmerge': 'Células de tabela mescladas verticalmente não são totalmente suportadas (rowspan não é gerado).',
};

const es: Dict = {
  pageTitle: 'DOCX a JATS XML',
  heading: 'DOCX → JATS XML',
  lede: 'Se convierte por completo en tu dispositivo. Tu documento nunca se sube.',
  language: 'Idioma',
  dropStrong: 'Suelta un archivo .docx aquí',
  dropRest: 'o haz clic para elegirlo',
  open: 'Abrir…',
  batch: 'Convertir una carpeta…',
  copy: 'Copiar XML',
  save: 'Descargar .xml',
  downloadHeading: '¿Prefieres una aplicación de escritorio?',
  downloadText: 'El mismo conversor, con conversión de carpetas por lotes, compatibilidad con “Abrir con” y funcionamiento totalmente sin conexión.',
  downloadGeneric: 'Descargar la aplicación de escritorio',
  downloadFor: 'Descargar para {os}',
  converting: 'Convirtiendo {name}…',
  converted: '«{title}» convertido ({size} KB de XML).',
  copied: 'Copiado al portapapeles.',
  clipboardFail: 'No se pudo acceder al portapapeles; usa Descargar.',
  saved: 'Guardado en {path}',
  folderConverting: 'Convirtiendo la carpeta…',
  folderDone: '{n} archivo(s) convertido(s) en {dir}.',
  folderDoneFailed: '{n} archivo(s) convertido(s) en {dir}; {failed} fallaron ({files}).',
  'err.not-zip': 'Este archivo no es un .docx válido (no se pudo abrir como archivo zip).',
  'err.not-word': 'Este archivo no es un documento de Word (falta word/document.xml).',
  'err.no-body': 'Este .docx está dañado: su documento principal no tiene cuerpo.',
  'err.no-parser': 'Este entorno no puede leer XML.',
  'err.unknown': 'Error inesperado: {message}',
  'warn.equations': 'Se omitieron las ecuaciones; la conversión a MathML aún no está implementada.',
  'warn.images': 'Se omitieron las imágenes y los objetos incrustados; la compatibilidad con figuras aún no está implementada.',
  'warn.vmerge': 'Las celdas de tabla combinadas verticalmente no son totalmente compatibles (no se genera rowspan).',
};

const fr: Dict = {
  pageTitle: 'DOCX vers JATS XML',
  heading: 'DOCX → JATS XML',
  lede: 'Conversion entièrement réalisée sur votre appareil. Votre document n’est jamais envoyé.',
  language: 'Langue',
  dropStrong: 'Déposez un fichier .docx ici',
  dropRest: 'ou cliquez pour le choisir',
  open: 'Ouvrir…',
  batch: 'Convertir un dossier…',
  copy: 'Copier le XML',
  save: 'Télécharger le .xml',
  downloadHeading: 'Vous préférez une application de bureau ?',
  downloadText: 'Le même convertisseur, avec conversion de dossiers par lot, prise en charge de « Ouvrir avec » et fonctionnement entièrement hors ligne.',
  downloadGeneric: 'Télécharger l’application de bureau',
  downloadFor: 'Télécharger pour {os}',
  converting: 'Conversion de {name}…',
  converted: '« {title} » converti ({size} Ko de XML).',
  copied: 'Copié dans le presse-papiers.',
  clipboardFail: 'Impossible d’accéder au presse-papiers ; utilisez Télécharger.',
  saved: 'Enregistré dans {path}',
  folderConverting: 'Conversion du dossier…',
  folderDone: '{n} fichier(s) converti(s) dans {dir}.',
  folderDoneFailed: '{n} fichier(s) converti(s) dans {dir} ; {failed} en échec ({files}).',
  'err.not-zip': 'Ce fichier n’est pas un .docx valide (il n’a pas pu être ouvert comme archive zip).',
  'err.not-word': 'Ce fichier n’est pas un document Word (word/document.xml est absent).',
  'err.no-body': 'Ce .docx est endommagé : son document principal n’a pas de corps.',
  'err.no-parser': 'Cet environnement ne peut pas lire le XML.',
  'err.unknown': 'Erreur inattendue : {message}',
  'warn.equations': 'Les équations ont été ignorées ; la conversion en MathML n’est pas encore implémentée.',
  'warn.images': 'Les images et objets intégrés ont été ignorés ; la prise en charge des figures n’est pas encore implémentée.',
  'warn.vmerge': 'Les cellules de tableau fusionnées verticalement ne sont pas entièrement prises en charge (rowspan non généré).',
};

const de: Dict = {
  pageTitle: 'DOCX zu JATS XML',
  heading: 'DOCX → JATS XML',
  lede: 'Die Umwandlung erfolgt vollständig auf Ihrem Gerät. Ihr Dokument wird nie hochgeladen.',
  language: 'Sprache',
  dropStrong: '.docx-Datei hier ablegen',
  dropRest: 'oder klicken, um sie auszuwählen',
  open: 'Öffnen…',
  batch: 'Ordner konvertieren…',
  copy: 'XML kopieren',
  save: '.xml herunterladen',
  downloadHeading: 'Lieber eine Desktop-App?',
  downloadText: 'Derselbe Konverter, dazu Stapelkonvertierung von Ordnern, Unterstützung für „Öffnen mit“ und reiner Offline-Betrieb.',
  downloadGeneric: 'Desktop-App herunterladen',
  downloadFor: 'Für {os} herunterladen',
  converting: '{name} wird konvertiert…',
  converted: '„{title}“ konvertiert ({size} KB XML).',
  copied: 'In die Zwischenablage kopiert.',
  clipboardFail: 'Kein Zugriff auf die Zwischenablage; bitte stattdessen herunterladen.',
  saved: 'Gespeichert unter {path}',
  folderConverting: 'Ordner wird konvertiert…',
  folderDone: '{n} Datei(en) nach {dir} konvertiert.',
  folderDoneFailed: '{n} Datei(en) nach {dir} konvertiert; {failed} fehlgeschlagen ({files}).',
  'err.not-zip': 'Diese Datei ist keine gültige .docx-Datei (sie ließ sich nicht als Zip-Archiv öffnen).',
  'err.not-word': 'Diese Datei ist kein Word-Dokument (word/document.xml fehlt).',
  'err.no-body': 'Diese .docx-Datei ist beschädigt: Das Hauptdokument hat keinen Inhalt.',
  'err.no-parser': 'Diese Umgebung kann kein XML lesen.',
  'err.unknown': 'Unerwarteter Fehler: {message}',
  'warn.equations': 'Formeln wurden übersprungen; die Umwandlung in MathML ist noch nicht implementiert.',
  'warn.images': 'Bilder und eingebettete Objekte wurden übersprungen; Abbildungen werden noch nicht unterstützt.',
  'warn.vmerge': 'Vertikal verbundene Tabellenzellen werden nicht vollständig unterstützt (rowspan wird nicht ausgegeben).',
};

export const LOCALES = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
} as const;
export type Locale = keyof typeof LOCALES;

const messages: Record<Locale, Dict> = { en, 'pt-BR': ptBR, es, fr, de };

/**
 * Pick the best supported locale from the browser's preferred languages (navigator.languages),
 * in order; English is the fallback. No IP or time-zone guessing: the browser setting is what
 * the user actually chose, and IP lookups would need a third-party request.
 */
export function matchLocale(tags: readonly string[]): Locale {
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    const exact = (Object.keys(LOCALES) as Locale[]).find((l) => l.toLowerCase() === lower);
    if (exact) return exact;
    const base = lower.split('-')[0];
    if (base === 'pt') return 'pt-BR';
    const byBase = (Object.keys(LOCALES) as Locale[]).find((l) => l.toLowerCase() === base);
    if (byBase) return byBase;
  }
  return 'en';
}

let current: Locale = 'en';
export const getLocale = () => current;
export const setLocale = (l: Locale) => {
  current = l;
};

export function t(key: Key, params: Record<string, string | number> = {}): string {
  return messages[current][key].replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}
