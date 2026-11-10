import { describe, expect, it } from 'vitest';
import { localeFromTimeZone, matchLocale } from './i18n';

describe('matchLocale', () => {
  it('prefers the browser language over the time zone', () => {
    expect(matchLocale(['en-US'], 'America/Sao_Paulo')).toBe('en');
    expect(matchLocale(['fr-CA', 'en'], 'Europe/Berlin')).toBe('fr');
  });

  it('maps Portuguese variants to pt-BR and matches exact tags', () => {
    expect(matchLocale(['pt-PT'], 'UTC')).toBe('pt-BR');
    expect(matchLocale(['pt-BR'], 'UTC')).toBe('pt-BR');
  });

  it('falls back to the time zone when no preferred language is supported', () => {
    expect(matchLocale(['ja-JP'], 'America/Sao_Paulo')).toBe('pt-BR');
    expect(matchLocale(['it-IT'], 'Europe/Vienna')).toBe('de');
    expect(matchLocale([], 'America/Argentina/Buenos_Aires')).toBe('es');
    expect(matchLocale(['ja'], 'Europe/Paris')).toBe('fr');
  });

  it('ends at English when nothing matches', () => {
    expect(matchLocale(['ja'], 'Asia/Tokyo')).toBe('en');
    expect(matchLocale([], 'UTC')).toBe('en');
    expect(matchLocale([], '')).toBe('en');
  });

  it('does not guess from ambiguous zones', () => {
    expect(localeFromTimeZone('America/New_York')).toBeNull();
  });
});
