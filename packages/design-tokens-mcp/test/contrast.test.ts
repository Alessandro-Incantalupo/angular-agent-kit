import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, isHexColor, parseHex } from '../src/contrast.ts';
import { defaultTokensPath, loadTokens } from '../src/tokens.ts';

describe('parseHex', () => {
  it('reads #rgb and #rrggbb, in any case', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('#0F52D4')).toEqual({ r: 15, g: 82, b: 212 });
  });

  it('refuses alpha, names and other syntaxes', () => {
    for (const value of ['#ffff', '#11223344', 'white', 'rgb(0 0 0)', '0f52d4']) {
      expect(isHexColor(value)).toBe(false);
      expect(() => parseHex(value)).toThrow(/not a #rgb or #rrggbb/);
    }
  });
});

describe('contrastRatio', () => {
  it('spans 1 to 21 and ignores the order of the colours', () => {
    const black = parseHex('#000');
    const white = parseHex('#fff');
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, white)).toBe(1);
  });

  it('matches every ratio the design-tokens package publishes', () => {
    const tokens = loadTokens();
    const raw = JSON.parse(readFileSync(defaultTokensPath(), 'utf8')) as {
      contrast?: { theme: string; fg: string; bg: string; ratio: number }[];
    };
    const table = raw.contrast;
    expect(table?.length).toBeGreaterThan(10);
    for (const row of table ?? []) {
      const roles = tokens.file.themes[row.theme]!.roles;
      const ratio = contrastRatio(parseHex(roles[row.fg]!.value), parseHex(roles[row.bg]!.value));
      expect(Math.floor(ratio * 100) / 100, `${row.theme} ${row.fg} on ${row.bg}`).toBe(row.ratio);
    }
  });
});
