import { McpServer } from '@modelcontextprotocol/server';
import { createRequire } from 'node:module';
import type { Tokens } from './tokens.ts';
import {
  checkContrast,
  checkContrastInput,
  checkContrastOutput,
  getToken,
  getTokenInput,
  getTokenOutput,
  listRoles,
  listRolesInput,
  listRolesOutput,
  ToolInputError,
} from './tools.ts';

export const SERVER_NAME = 'design-tokens-mcp';
export const SERVER_VERSION: string = (
  createRequire(import.meta.url)('../package.json') as { version: string }
).version;

/** One line of the call log. Values are never logged: only each argument's type and length. */
export interface CallLogLine {
  event: 'tool_call';
  tool: string;
  args: Record<string, string>;
  ms: number;
  ok: boolean;
  error?: 'input' | 'internal';
}

export type Logger = (line: CallLogLine) => void;

/** Writes one JSON line per call to stderr. stdout carries the protocol and must stay clean. */
export const stderrLogger: Logger = (line) => {
  process.stderr.write(`${JSON.stringify(line)}\n`);
};

/** `{ role: "string(10)", theme: "string(4)" }`: enough to see how a tool is called, nothing a user typed. */
export function argsShape(args: unknown): Record<string, string> {
  if (!args || typeof args !== 'object') return {};
  return Object.fromEntries(
    Object.entries(args as Record<string, unknown>).map(([key, value]) => [
      key,
      typeof value === 'string'
        ? `string(${value.length})`
        : Array.isArray(value)
          ? 'array'
          : typeof value,
    ]),
  );
}

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export interface ServerOptions {
  log?: Logger;
}

export function createServer(
  tokens: Tokens,
  { log = stderrLogger }: ServerOptions = {},
): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  /** Runs a tool, logs the call, and turns ToolInputError into a tool error the model can read. */
  function run<T extends Record<string, unknown>>(tool: string, args: unknown, work: () => T) {
    const started = performance.now();
    const finish = (ok: boolean, error?: CallLogLine['error']) =>
      log({
        event: 'tool_call',
        tool,
        args: argsShape(args),
        ms: Math.round((performance.now() - started) * 10) / 10,
        ok,
        ...(error ? { error } : {}),
      });
    try {
      const result = work();
      finish(true);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      const known = error instanceof ToolInputError;
      finish(false, known ? 'input' : 'internal');
      const text = known ? error.message : 'The tool failed unexpectedly. See the server log.';
      if (!known)
        process.stderr.write(`${SERVER_NAME}: ${(error as Error).stack ?? String(error)}\n`);
      return { content: [{ type: 'text' as const, text }], isError: true };
    }
  }

  server.registerTool(
    'list_roles',
    {
      title: 'List design token roles',
      description:
        'Lists the roles components use (surface, text, accent, border...), each with its kind, purpose, Tailwind classes and resolved value per theme. Pass theme to see one theme, kind to filter (color, shadow, font, radius, size).',
      inputSchema: listRolesInput,
      outputSchema: listRolesOutput,
      annotations: READ_ONLY,
    },
    (args) => run('list_roles', args, () => listRoles(tokens, args)),
  );

  server.registerTool(
    'get_token',
    {
      title: 'Get a role per theme',
      description:
        "Returns one role's description, Tailwind classes, contrast rule and its value in each theme (or in the theme you name), including what the CSS declares.",
      inputSchema: getTokenInput,
      outputSchema: getTokenOutput,
      annotations: READ_ONLY,
    },
    (args) => run('get_token', args, () => getToken(tokens, args)),
  );

  server.registerTool(
    'check_contrast',
    {
      title: 'Check contrast',
      description:
        'Measures the WCAG 2 contrast ratio of two colours, each a hex colour or a colour role resolved in a theme, and says whether it passes for text (16 px and up), small text and non-text marks such as borders and focus rings.',
      inputSchema: checkContrastInput,
      outputSchema: checkContrastOutput,
      annotations: READ_ONLY,
    },
    (args) => run('check_contrast', args, () => checkContrast(tokens, args)),
  );

  return server;
}
