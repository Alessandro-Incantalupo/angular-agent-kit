import { beforeAll, describe, expect, it } from 'vitest';
import { checkContrast, getToken, listRoles, ToolInputError } from '../src/tools.ts';
import { fromTokensFile, loadTokens, type Tokens } from '../src/tokens.ts';

let tokens: Tokens;
beforeAll(() => {
  tokens = loadTokens();
});

describe('list_roles', () => {
  it('lists every role with a value per theme', () => {
    const out = listRoles(tokens, {});
    expect(out.themes).toEqual(['light', 'dark']);
    expect(out.defaultTheme).toBe('light');
    const text = out.roles.find((r) => r.name === '--text');
    expect(text).toMatchObject({ kind: 'color', tailwind: ['text-default'] });
    expect(Object.keys(text!.values)).toEqual(['light', 'dark']);
  });

  it('narrows to one theme and one kind', () => {
    const out = listRoles(tokens, { theme: 'dark', kind: 'radius' });
    expect(out.roles.length).toBeGreaterThan(0);
    for (const role of out.roles) {
      expect(role.kind).toBe('radius');
      expect(Object.keys(role.values)).toEqual(['dark']);
    }
  });

  it('names the themes when the theme is unknown', () => {
    expect(() => listRoles(tokens, { theme: 'sepia' })).toThrow(ToolInputError);
    expect(() => listRoles(tokens, { theme: 'sepia' })).toThrow('Themes: light, dark.');
  });
});

describe('get_token', () => {
  it('accepts the role with or without dashes, or as var()', () => {
    for (const role of ['--accent', 'accent', 'var(--accent)']) {
      expect(getToken(tokens, { role }).name).toBe('--accent');
    }
  });

  it('returns each theme value with its declaration and the contrast rule', () => {
    const out = getToken(tokens, { role: 'text-muted' });
    expect(out.values.map((v) => v.theme)).toEqual(['light', 'dark']);
    expect(out.values[0]!.value).toMatch(/^#[0-9a-f]{6}$/);
    expect(out.values[0]!.declared).toMatch(/^var\(--/);
    expect(out.contrast).toMatchObject({ use: 'small text', min: 7 });
  });

  it('returns null contrast for roles without a rule, and one theme on request', () => {
    const out = getToken(tokens, { role: 'card-radius', theme: 'dark' });
    expect(out.contrast).toBeNull();
    expect(out.values).toHaveLength(1);
  });

  it('suggests close names for an unknown role', () => {
    expect(() => getToken(tokens, { role: 'text-mute' })).toThrow(/Did you mean --text-muted/);
  });
});

describe('check_contrast', () => {
  it('resolves roles in the default theme', () => {
    const out = checkContrast(tokens, { foreground: 'text', background: 'surface' });
    expect(out.theme).toBe('light');
    expect(out.foreground).toMatchObject({ role: '--text', value: '#151a21' });
    expect(out.ratio).toBeGreaterThan(15);
    expect(out.text.pass && out.smallText.pass && out.nonText.pass).toBe(true);
  });

  it('reads the minimums from the tokens file', () => {
    const out = checkContrast(tokens, { foreground: '#767676', background: '#fff' });
    expect(out.text).toMatchObject({ min: 4.5, pass: true });
    expect(out.smallText).toMatchObject({ min: 7, pass: false });
    expect(out.nonText).toMatchObject({ min: 3, pass: true });
    expect(out.smallText.rule).toMatch(/^7:1/);
    expect(out.foreground.role).toBeNull();
  });

  it('mixes a role and a literal colour in a named theme', () => {
    const out = checkContrast(tokens, {
      foreground: '--border-strong',
      background: '#000000',
      theme: 'dark',
    });
    expect(out.theme).toBe('dark');
    expect(out.foreground.role).toBe('--border-strong');
  });

  it('refuses roles that are not colours, and colours with alpha', () => {
    expect(() =>
      checkContrast(tokens, { foreground: 'card-shadow', background: 'surface' }),
    ).toThrow('--card-shadow is a shadow, not a colour.');
    expect(() => checkContrast(tokens, { foreground: '#00000080', background: 'surface' })).toThrow(
      /alpha/,
    );
  });

  it('falls back to WCAG minimums when the file states no rules', () => {
    const bare = fromTokensFile({ ...tokens.file, contrastRules: {} });
    const out = checkContrast(bare, { foreground: '#000', background: '#fff' });
    expect([out.text.min, out.smallText.min, out.nonText.min]).toEqual([4.5, 7, 3]);
  });
});

describe('loadTokens', () => {
  it('explains a file that is not a tokens file', () => {
    expect(() => fromTokensFile({ roles: [] }, 'x.json')).toThrow(
      /x.json is not a design-tokens file/,
    );
  });
});
