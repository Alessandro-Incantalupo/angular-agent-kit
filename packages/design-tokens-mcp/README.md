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

stdout carries the protocol only. Each tool call writes one JSON line to stderr, with the types and lengths of the arguments but never their values:

```json
{
  "event": "tool_call",
  "tool": "check_contrast",
  "args": { "foreground": "string(11)", "background": "string(8)", "theme": "string(4)" },
  "ms": 0.4,
  "ok": true
}
```

A failed call adds `"ok":false` and `"error":"input"` (bad input, answered as a tool error) or `"error":"internal"` (a bug, with the stack trace on stderr).

## Options

```text
--tokens <file>  A tokens.json in the same format. Default: the one in @a.incantalupo/design-tokens.
--help, --version
```

Node 22.18 or later.

## Licence

MIT
