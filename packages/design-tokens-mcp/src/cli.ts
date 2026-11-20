#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { parseArgs } from 'node:util';
import { createServer, SERVER_NAME, SERVER_VERSION } from './server.ts';
import { defaultTokensPath, loadTokens } from './tokens.ts';

const USAGE = `${SERVER_NAME} ${SERVER_VERSION}

Read-only MCP server (stdio) for design tokens.

Usage: ${SERVER_NAME} [--tokens <tokens.json>]

  --tokens <file>  A tokens.json in the @a.incantalupo/design-tokens format.
                   Default: the one inside the installed package.
  --help           This text.
  --version        The version.

Each tool call is logged to stderr as one JSON line: tool, argument types, duration.`;

const { values } = parseArgs({
  options: {
    tokens: { type: 'string' },
    help: { type: 'boolean' },
    version: { type: 'boolean' },
  },
});

if (values.help) {
  console.log(USAGE);
} else if (values.version) {
  console.log(SERVER_VERSION);
} else {
  const path = values.tokens ?? defaultTokensPath();
  const tokens = loadTokens(path);
  serveStdio(() => createServer(tokens));
  process.stderr.write(
    `${JSON.stringify({
      event: 'ready',
      server: SERVER_NAME,
      version: SERVER_VERSION,
      themes: tokens.themes,
      roles: tokens.roles.size,
    })}\n`,
  );
}
