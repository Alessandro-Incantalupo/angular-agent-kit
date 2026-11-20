# @a.incantalupo/design-tokens-mcp

A read-only [MCP](https://modelcontextprotocol.io) server over stdio that answers questions about the design tokens in [`@a.incantalupo/design-tokens`](https://github.com/Alessandro-Incantalupo/design-tokens): which roles exist, what a role resolves to in each theme, and whether two colours have enough contrast.

```sh
npx -y @a.incantalupo/design-tokens-mcp
```

Any MCP client that starts stdio servers can run it. For example, in `.mcp.json`:

```json
{
  "mcpServers": {
    "design-tokens": {
      "command": "npx",
      "args": ["-y", "@a.incantalupo/design-tokens-mcp@0.1.0"]
    }
  }
}
```

## Tools

| Tool             | Input                                                           | Returns                                                                            |
| ---------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `list_roles`     | `theme?`, `kind?` (`color`, `shadow`, `font`, `radius`, `size`) | the themes, and each role with its purpose, Tailwind classes and value per theme   |
| `get_token`      | `role` (`--text`, `text` or `var(--text)`), `theme?`            | one role's description, contrast rule, and value plus CSS declaration per theme    |
| `check_contrast` | `foreground`, `background` (hex or colour role), `theme?`       | the WCAG 2 ratio (rounded down) and pass or fail for text, small text and non-text |

Every tool declares an input and an output schema and returns `structuredContent`. Unknown roles or themes come back as tool errors that name the closest matches.

The minimums for `check_contrast` come from the tokens file: 4.5:1 for text at 16 px or more, 7:1 for smaller text, 3:1 for edges and indicators.

## Logs

stdout carries the protocol only. It writes one JSON line to stderr at start-up, then one per tool call with the types and lengths of the arguments but never their values. From a real run of `pnpm smoke`:

```text
{"event":"ready","server":"design-tokens-mcp","version":"0.1.0","themes":["light","dark"],"roles":36}
{"event":"tool_call","tool":"check_contrast","args":{"foreground":"string(12)","background":"string(16)","theme":"string(4)"},"ms":0.5,"ok":true}
```

A failed call adds `"ok":false` and `"error":"input"` (bad input, answered as a tool error) or `"error":"internal"` (a bug, with the stack trace on stderr).

## Options

```text
--tokens <file>  A tokens.json in the same format. Default: the one in @a.incantalupo/design-tokens.
--help, --version
```

`pnpm smoke [command...]` (in this folder) starts the server the way a client does, lists the tools and makes one `check_contrast` call. With no command it runs `src/cli.ts`.

Node 22.18 or later.

## Licence

MIT
