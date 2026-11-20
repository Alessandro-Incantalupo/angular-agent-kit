import * as z from 'zod';
import { contrastRatio, isHexColor, parseHex } from './contrast.ts';
import { ROLE_KINDS, type Role, type Tokens } from './tokens.ts';

/** A tool input that cannot be answered, such as an unknown role. Reported to the client as a tool error. */
export class ToolInputError extends Error {}

/* ------------------------------------------------------------------ schemas */

const themeName = z
  .string()
  .min(1)
  .max(64)
  .describe('Theme name, for example "light" or "dark". list_roles shows the available themes.');

const roleName = z
  .string()
  .min(1)
  .max(80)
  .describe(
    'Role name with or without the leading dashes: "--text-muted", "text-muted" or "var(--text-muted)".',
  );

export const listRolesInput = z.object({
  theme: themeName.optional().describe('Only show values for this theme. Omit for every theme.'),
  kind: z.enum(ROLE_KINDS).optional().describe('Only roles of this kind.'),
});

export const listRolesOutput = z.object({
  themes: z.array(z.string()).describe('Every theme in the tokens file.'),
  defaultTheme: z.string(),
  roles: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(ROLE_KINDS),
      description: z.string(),
      tailwind: z.array(z.string()).describe('Tailwind classes that read this role.'),
      values: z.record(z.string(), z.string()).describe('Resolved value per theme.'),
    }),
  ),
});

export const getTokenInput = z.object({
  role: roleName,
  theme: themeName.optional().describe('Only this theme. Omit for every theme.'),
});

export const getTokenOutput = z.object({
  name: z.string(),
  kind: z.enum(ROLE_KINDS),
  description: z.string(),
  tailwind: z.array(z.string()),
  contrast: z
    .object({
      use: z.string().describe('The contrast rule this role is held to.'),
      min: z.number(),
      on: z.array(z.string()).describe('Backgrounds it is checked against.'),
    })
    .nullable(),
  values: z.array(
    z.object({
      theme: z.string(),
      value: z.string().describe('Resolved value, for example a hex colour.'),
      declared: z
        .string()
        .describe('What the CSS declares, for example var(--palette-neutral-900).'),
    }),
  ),
});

const colorOrRole = z
  .string()
  .min(1)
  .max(80)
  .describe('A #rgb or #rrggbb colour, or a colour role name such as "--text" or "surface".');

export const checkContrastInput = z.object({
  foreground: colorOrRole.describe('Text or mark colour: a hex colour or a colour role.'),
  background: colorOrRole.describe('Background colour: a hex colour or a colour role.'),
  theme: themeName
    .optional()
    .describe('Theme used to resolve role names. Defaults to the default theme.'),
});

const checkResult = z.object({
  min: z.number().describe('Minimum ratio for this use.'),
  pass: z.boolean(),
  rule: z.string().describe('The rule as the tokens file states it.'),
});

const resolvedColor = z.object({
  input: z.string(),
  role: z.string().nullable().describe('The role name, or null for a literal colour.'),
  value: z.string().describe('The hex colour that was measured.'),
});

export const checkContrastOutput = z.object({
  theme: z.string(),
  foreground: resolvedColor,
  background: resolvedColor,
  ratio: z
    .number()
    .describe(
      'WCAG 2 contrast ratio, rounded down to 2 decimals so it never reads better than it is.',
    ),
  text: checkResult,
  smallText: checkResult,
  nonText: checkResult,
});

export type ListRolesInput = z.infer<typeof listRolesInput>;
export type ListRolesOutput = z.infer<typeof listRolesOutput>;
export type GetTokenInput = z.infer<typeof getTokenInput>;
export type GetTokenOutput = z.infer<typeof getTokenOutput>;
export type CheckContrastInput = z.infer<typeof checkContrastInput>;
export type CheckContrastOutput = z.infer<typeof checkContrastOutput>;

/* ------------------------------------------------------------------ helpers */

/** Contrast uses in tokens.json, with the ratios used when the file states none. */
const CONTRAST_USES = [
  { key: 'text', rule: 'text', fallback: 4.5 },
  { key: 'smallText', rule: 'small text', fallback: 7 },
  { key: 'nonText', rule: 'non-text', fallback: 3 },
] as const;

function minimumFor(tokens: Tokens, rule: string, fallback: number): { min: number; rule: string } {
  const text = tokens.file.contrastRules[rule];
  const match = text?.match(/^\s*(\d+(?:\.\d+)?)\s*:\s*1/);
  return match
    ? { min: Number(match[1]), rule: text! }
    : { min: fallback, rule: `${fallback}:1 (${rule})` };
}

function normalizeRoleName(input: string): string {
  const bare = input
    .trim()
    .replace(/^var\(\s*/, '')
    .replace(/\s*\)$/, '')
    .replace(/^-*/, '');
  return `--${bare}`;
}

/** Edit distance between two short strings, for "did you mean" hints. */
function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length]!;
}

/** Up to three role names that look like the input: contain it, or differ by a few letters. */
function closest(input: string, names: Iterable<string>, count = 3): string[] {
  const needle = input.replace(/^-+/, '');
  return [...names]
    .map((name) => {
      const bare = name.replace(/^-+/, '');
      const score = bare.includes(needle) ? 0 : distance(needle, bare);
      return { name, score };
    })
    .filter((s) => s.score <= Math.max(2, Math.floor(needle.length / 3)))
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, count)
    .map((s) => s.name);
}

function findRole(tokens: Tokens, input: string): Role {
  const role = tokens.roles.get(normalizeRoleName(input));
  if (role) return role;
  const hints = closest(normalizeRoleName(input), tokens.roles.keys());
  const tail = hints.length
    ? ` Did you mean ${hints.join(', ')}?`
    : ' Call list_roles to see them.';
  throw new ToolInputError(`Unknown role "${input}".${tail}`);
}

function checkTheme(tokens: Tokens, theme: string | undefined): string[] {
  if (theme === undefined) return tokens.themes;
  if (!tokens.themes.includes(theme)) {
    throw new ToolInputError(`Unknown theme "${theme}". Themes: ${tokens.themes.join(', ')}.`);
  }
  return [theme];
}

function valueIn(tokens: Tokens, theme: string, role: string): { value: string; declared: string } {
  const entry = tokens.file.themes[theme]?.roles[role];
  if (!entry) throw new ToolInputError(`Theme "${theme}" does not set ${role}.`);
  return entry;
}

/* -------------------------------------------------------------------- tools */

export function listRoles(tokens: Tokens, input: ListRolesInput): ListRolesOutput {
  const themes = checkTheme(tokens, input.theme);
  const roles = [...tokens.roles.values()]
    .filter((role) => !input.kind || role.kind === input.kind)
    .map((role) => ({
      name: role.name,
      kind: role.kind,
      description: role.description,
      tailwind: role.tailwind,
      values: Object.fromEntries(
        themes.flatMap((theme) => {
          const entry = tokens.file.themes[theme]?.roles[role.name];
          return entry ? [[theme, entry.value]] : [];
        }),
      ),
    }));
  return { themes: tokens.themes, defaultTheme: tokens.defaultTheme, roles };
}

export function getToken(tokens: Tokens, input: GetTokenInput): GetTokenOutput {
  const role = findRole(tokens, input.role);
  const themes = checkTheme(tokens, input.theme);
  return {
    name: role.name,
    kind: role.kind,
    description: role.description,
    tailwind: role.tailwind,
    contrast: role.contrast ?? null,
    values: themes.map((theme) => ({ theme, ...valueIn(tokens, theme, role.name) })),
  };
}

function resolveColor(tokens: Tokens, theme: string, input: string) {
  if (isHexColor(input)) return { input, role: null, value: input.trim().toLowerCase() };
  if (input.trim().startsWith('#')) {
    throw new ToolInputError(
      `"${input}" is not a #rgb or #rrggbb colour. Colours with alpha are not measured.`,
    );
  }
  const role = findRole(tokens, input);
  if (role.kind !== 'color') {
    throw new ToolInputError(`${role.name} is a ${role.kind}, not a colour.`);
  }
  const { value } = valueIn(tokens, theme, role.name);
  if (!isHexColor(value)) {
    throw new ToolInputError(
      `${role.name} resolves to "${value}" in ${theme}, which is not a hex colour.`,
    );
  }
  return { input, role: role.name, value: value.toLowerCase() };
}

export function checkContrast(tokens: Tokens, input: CheckContrastInput): CheckContrastOutput {
  const [theme] = checkTheme(tokens, input.theme ?? tokens.defaultTheme) as [string];
  const foreground = resolveColor(tokens, theme, input.foreground);
  const background = resolveColor(tokens, theme, input.background);
  const exact = contrastRatio(parseHex(foreground.value), parseHex(background.value));
  const checks = Object.fromEntries(
    CONTRAST_USES.map(({ key, rule, fallback }) => {
      const { min, rule: text } = minimumFor(tokens, rule, fallback);
      return [key, { min, pass: exact >= min, rule: text }];
    }),
  ) as Pick<CheckContrastOutput, 'text' | 'smallText' | 'nonText'>;
  return { theme, foreground, background, ratio: Math.floor(exact * 100) / 100, ...checks };
}
