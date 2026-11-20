# AGENTS.md

This repository is an Angular kit for coding agents. The kit files sit at the root so the repository is itself the plugin: `skills/`, `agents/`, `.claude-plugin/`, `.mcp.json` and `apm.yml`. The MCP server lives in `packages/design-tokens-mcp`, and the migration example in `examples/`.

## Rules for the kit files

- Every rule in `skills/` comes from angular.dev and carries a link to the page (with the `#anchor`) that says it. No other sources: no blog posts, books or courses. `pnpm validate` rejects links to other hosts.
- When angular.dev changes, change the rule and its link together. `pnpm validate:links` fetches every link and checks the page and the anchor exist (angular.dev answers 200 even for unknown pages, so the title is checked too).
- `SKILL.md` stays short: rules that hold everywhere, then a table that points to `references/`. Every reference file must be named in `SKILL.md`.
- Agent files end in `.agent.md` (Copilot reads only those) and do not set `tools`, because tool names differ between Claude Code and Copilot. Restrict with `disallowedTools` instead.
- `apm.yml` stays metadata-only. Dependencies or an `.apm/` folder would make APM ignore the plugin layout.
- One version for the kit: `.claude-plugin/plugin.json` and `apm.yml` change together. When the MCP server's version changes, update the pin in `.mcp.json`.

## The MCP server

- Read-only. Tools return `structuredContent` that matches their `outputSchema`.
- stdout is the protocol. Logs go to stderr, one JSON line per call, with argument types and lengths only, never the values.
- Run it from the repository with `pnpm mcp`.

## Before you call a change done

```sh
pnpm check            # lint, typecheck (incl. the Angular example with strict templates), tests, kit validation
pnpm validate:links   # also fetches every angular.dev link (cached for 7 days in .cache/)
```

Never run `npm publish` or create a release tag: the maintainer does both.
