import { describe, expect, it } from 'vitest';
import { matchLocale } from './i18n';

describe('matchLocale', () => {
  it('matches exact tags and base languages', () => {
    expect(matchLocale(['pt-BR'])).toBe('pt-BR');
    expect(matchLocale(['es-MX'])).toBe('es');
    expect(matchLocale(['fr-CA'])).toBe('fr');
    expect(matchLocale(['de-AT'])).toBe('de');
  });

  it('maps any Portuguese variant to pt-BR', () => {
    expect(matchLocale(['pt-PT'])).toBe('pt-BR');
    expect(matchLocale(['pt'])).toBe('pt-BR');
  });

  it('respects the order of preferred languages', () => {
    expect(matchLocale(['ja', 'fr'])).toBe('fr');
    expect(matchLocale(['en-US', 'de'])).toBe('en');
  });

  it('falls back to English', () => {
    expect(matchLocale(['ja-JP'])).toBe('en');
    expect(matchLocale([])).toBe('en');
  });
});
