import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as z from 'zod';

/** The npm export that holds the tokens this server reads by default. */
export const DEFAULT_TOKENS_SPECIFIER = '@a.incantalupo/design-tokens/tokens.json';

export const ROLE_KINDS = ['color', 'shadow', 'font', 'radius', 'size'] as const;
export type RoleKind = (typeof ROLE_KINDS)[number];

const roleSchema = z.object({
  name: z.string().startsWith('--'),
  kind: z.enum(ROLE_KINDS),
  description: z.string(),
  tailwind: z.array(z.string()),
  contrast: z
    .object({
      use: z.string(),
      min: z.number(),
      on: z.array(z.string()),
    })
    .optional(),
});

const themeSchema = z.object({
  selector: z.string(),
  default: z.boolean().optional(),
  roles: z.record(z.string(), z.object({ value: z.string(), declared: z.string() })),
});

/** The parts of tokens.json this server uses. Other keys are ignored. */
const tokensFileSchema = z.object({
  contrastRules: z.record(z.string(), z.string()),
  roles: z.array(roleSchema).min(1),
  themes: z.record(z.string(), themeSchema),
});

export type Role = z.infer<typeof roleSchema>;
export type TokensFile = z.infer<typeof tokensFileSchema>;

export interface Tokens {
  file: TokensFile;
  /** Theme names in file order. */
  themes: string[];
  /** The theme marked `default`, or the first one. */
  defaultTheme: string;
  roles: Map<string, Role>;
}

/** Path of tokens.json inside the installed design-tokens package. */
export function defaultTokensPath(): string {
  return fileURLToPath(import.meta.resolve(DEFAULT_TOKENS_SPECIFIER));
}

/** Reads and checks a tokens.json file. Throws with a readable message when it does not fit. */
export function loadTokens(path: string = defaultTokensPath()): Tokens {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read tokens from ${path}: ${(error as Error).message}`, {
      cause: error,
    });
  }
  return fromTokensFile(raw, path);
}

export function fromTokensFile(raw: unknown, source = 'tokens.json'): Tokens {
  const parsed = tokensFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${source} is not a design-tokens file: ${z.prettifyError(parsed.error)}`);
  }
  const file = parsed.data;
  const themes = Object.keys(file.themes);
  if (themes.length === 0) throw new Error(`${source} has no themes.`);
  const defaultTheme = themes.find((name) => file.themes[name]?.default) ?? themes[0]!;
  return {
    file,
    themes,
    defaultTheme,
    roles: new Map(file.roles.map((role) => [role.name, role])),
  };
}
