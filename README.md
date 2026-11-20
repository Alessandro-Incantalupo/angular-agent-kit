# Angular Agent Kit

An Angular team kit for coding agents. It teaches Claude Code, GitHub Copilot and other agents the signal-first Angular that [angular.dev](https://angular.dev) documents, reviews Angular diffs against it, migrates components step by step, and answers design-token questions through a small MCP server.

The same files install three ways: as a Claude Code plugin marketplace, as a GitHub Copilot agent plugin, or with [APM](https://github.com/microsoft/apm) into any harness it supports.

## 30-second demo

Recorded from real runs on 2026-11-20. Progress lines are left out, and `…` marks other cuts. The plugin install used a throwaway project and `--scope project`; the MCP server ran from the packed tarball because the npm package is not published yet.

```console
$ claude plugin marketplace add Alessandro-Incantalupo/angular-agent-kit --scope project
✔ Successfully added marketplace: angular-agent-kit (declared in project settings)
$ claude plugin install angular-agent-kit@angular-agent-kit --scope project
✔ Successfully installed plugin: angular-agent-kit@angular-agent-kit (scope: project)
$ claude plugin details angular-agent-kit
Component inventory
  Skills (2)  migrate-to-signals, modern-angular
  Agents (1)  angular-reviewer.agent
  MCP servers (1)  design-tokens  (tool schemas resolved at runtime; not counted)
…

$ apm install Alessandro-Incantalupo/angular-agent-kit#main --target copilot,claude
  [+] Alessandro-Incantalupo/angular-agent-kit #main @763da782
  |-- 2 agents integrated -> .claude/agents/, .github/agents/
  |-- 2 skill(s) integrated -> .agents/skills/, .claude/skills/
|  [+]  design-tokens -> Copilot, Claude (configured)
[*] Installed 1 APM dependency and 1 MCP server in 2.7s.

$ node packages/design-tokens-mcp/scripts/smoke.ts npx -y ./a.incantalupo-design-tokens-mcp-0.1.0.tgz
tools/list:
  list_roles(theme, kind) -> outputSchema: yes
  get_token(role, theme) -> outputSchema: yes
  check_contrast(foreground, background, theme) -> outputSchema: yes
check_contrast --text-muted on --surface-sunken (dark):
{ "theme": "dark", … "ratio": 13.4, "text": { "min": 4.5, "pass": true, … }, "smallText": { "min": 7, "pass": true, … }, "nonText": { "min": 3, "pass": true, … } }
server stderr:
{"event":"ready","server":"design-tokens-mcp","version":"0.1.0","themes":["light","dark"],"roles":36}
{"event":"tool_call","tool":"check_contrast","args":{"foreground":"string(12)","background":"string(16)","theme":"string(4)"},"ms":0.5,"ok":true}
```

And the review agent on the playbook's own output ([full report](examples/REVIEW-AFTER.md)):

```text
### Bugs
- examples/after/member-list.component.ts:48 · The template reads `members.value().length` outside any guard. […]
  `value()` throws once the request fails, so the "Could not load the members." message may never show […]
  Fix: guard with `hasValue()` […] [angular.dev](https://angular.dev/guide/signals/resource#resource-status)
```

## What's inside

| Piece                         | Where                                                                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `modern-angular` skill        | [`skills/modern-angular`](skills/modern-angular/SKILL.md)              | Signals (`signal`, `computed`, `linkedSignal`, `effect`), `resource` and `httpResource`, zoneless and `OnPush` by default, `@if`/`@for`/`@switch`, standalone components, `input()`/`output()`/`model()`, signal queries, Signal Forms, RxJS interop. A short `SKILL.md` with the rules that hold everywhere, and one reference file per topic. Every rule links to the angular.dev page that states it.           |
| `angular-reviewer` agent      | [`agents/angular-reviewer.agent.md`](agents/angular-reviewer.agent.md) | Reviews an Angular diff, read-only. Reports bugs, risks and modernizations with `file:line`, a fix and the angular.dev link. It checks for effects that copy state, `@for` tracking, subscriptions without cleanup, plain fields that zoneless never refreshes, in-place input mutation under `OnPush`, unguarded `resource.value()` and more ([checklist](skills/modern-angular/references/review-checklist.md)). |
| `migrate-to-signals` playbook | [`skills/migrate-to-signals`](skills/migrate-to-signals/SKILL.md)      | Moves one component: the official schematics first, then a table of hand edits, then build, tests and grep checks, then a report. Shipped as a skill, so it runs as a slash command in Claude Code and Copilot.                                                                                                                                                                                                    |
| `design-tokens` MCP server    | [`packages/design-tokens-mcp`](packages/design-tokens-mcp)             | Read-only, stdio. `list_roles`, `get_token` and `check_contrast` over the tokens of [`@a.incantalupo/design-tokens`](https://github.com/Alessandro-Incantalupo/design-tokens), each with input and output schemas.                                                                                                                                                                                                 |

### Signal Forms

Signal Forms are stable since Angular v22.0 ([`form`](https://angular.dev/api/forms/signals/form) and [`FormField`](https://angular.dev/api/forms/signals/FormField) API pages). They were experimental in v21. The skill covers them and says when a working reactive form should stay as it is.

## Install

The kit targets Angular 22. Rules that need v21 or v22 say so.

### Claude Code

```sh
claude plugin marketplace add Alessandro-Incantalupo/angular-agent-kit
claude plugin install angular-agent-kit@angular-agent-kit
```

Inside a session: `/plugin marketplace add Alessandro-Incantalupo/angular-agent-kit`, then `/plugin install angular-agent-kit@angular-agent-kit`. You get `/angular-agent-kit:modern-angular`, `/angular-agent-kit:migrate-to-signals`, the `angular-agent-kit:angular-reviewer` agent and the `design-tokens` MCP server.

### GitHub Copilot

**VS Code (agent plugins).** Add the marketplace to your settings and install `angular-agent-kit` from the Agent Customizations editor:

```json
{
  "chat.plugins.enabled": true,
  "chat.plugins.marketplaces": ["Alessandro-Incantalupo/angular-agent-kit"]
}
```

**Copilot CLI.**

```sh
copilot plugin marketplace add Alessandro-Incantalupo/angular-agent-kit
copilot plugin install angular-agent-kit@angular-agent-kit
```

**Files in your repository** (any Copilot surface, no plugin support needed): use APM with `--target copilot`, below. It writes `.github/agents/angular-reviewer.agent.md`, the skills under `.agents/skills/`, and the MCP server into `.mcp.json` and `.github/mcp.json`.

### APM (Copilot, Claude Code, Cursor, Codex and more)

```sh
apm install Alessandro-Incantalupo/angular-agent-kit#v0.1.0 --target copilot,claude
```

APM records the commit and a hash of every file in `apm.lock.yaml`. Leave out `--target` to use the harnesses APM detects in your project.

## The design-tokens MCP server

The plugin starts it with `npx -y @a.incantalupo/design-tokens-mcp@0.1.0`. From a clone of this repository:

```sh
pnpm install
pnpm mcp            # node packages/design-tokens-mcp/src/cli.ts, stdio
```

| Tool             | Answers                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `list_roles`     | every role (or one `kind`), with purpose, Tailwind classes and value per theme (or one `theme`)                               |
| `get_token`      | one role in each theme: value, CSS declaration, contrast rule                                                                 |
| `check_contrast` | two hex colours or role names in a theme: WCAG 2 ratio and pass or fail for text (4.5:1), small text (7:1) and non-text (3:1) |

**Logs.** stdout is the protocol. Each call writes one JSON line to stderr with the tool, the type and length of each argument (never the value), the duration and the outcome:

```text
{"event":"ready","server":"design-tokens-mcp","version":"0.1.0","themes":["light","dark"],"roles":36}
{"event":"tool_call","tool":"check_contrast","args":{"foreground":"string(12)","background":"string(16)","theme":"string(4)"},"ms":0.5,"ok":true}
```

A failed call logs `"ok":false` with `"error":"input"` (bad input, answered as a tool error the model can read) or `"error":"internal"` (a bug; the stack trace goes to stderr).

## The migration example

[`examples/before`](examples/before/member-list.component.ts) is a small, realistic component in the old style: `@Input`/`@Output`, `*ngFor` without tracking, an `HttpClient` subscription that sets plain fields, a `Subject` for debouncing that is never unsubscribed, `ngOnChanges` and `ngAfterViewInit`. Under Angular 22 (zoneless, `OnPush` by default) its list never appears, because nothing tells Angular the fields changed.

[`examples/after`](examples/after/member-list.component.ts) is what the `migrate-to-signals` playbook produced when Claude Code ran it on that file, and [`examples/migration.diff`](examples/migration.diff) is the diff. [`examples/RUN.md`](examples/RUN.md) has the agent's report. The run left one bug, a `resource.value()` read without `hasValue()`; the review agent found it ([`examples/REVIEW-AFTER.md`](examples/REVIEW-AFTER.md)), the next commit fixes it, and the playbook now checks for it. [`examples/REVIEW.md`](examples/REVIEW.md) is the same agent on the legacy file. Both versions compile with `ngc` and strict templates in CI (`pnpm typecheck`).

See it on a real codebase: (link added after the dashboard refresh)

## Sources

Everything in the skill and the agent comes from angular.dev, linked per rule. The main pages:

- [Signals](https://angular.dev/guide/signals), [linkedSignal](https://angular.dev/guide/signals/linked-signal), [effects](https://angular.dev/guide/signals/effect), [resources](https://angular.dev/guide/signals/resource), [httpResource](https://angular.dev/guide/http/http-resource)
- [Zoneless](https://angular.dev/guide/zoneless), [skipping component subtrees (OnPush)](https://angular.dev/best-practices/skipping-subtrees)
- [Control flow](https://angular.dev/guide/templates/control-flow), [inputs](https://angular.dev/guide/components/inputs), [outputs](https://angular.dev/guide/components/outputs), [queries](https://angular.dev/guide/components/queries)
- [Signal Forms](https://angular.dev/guide/forms/signals/overview), [RxJS interop](https://angular.dev/ecosystem/rxjs-interop)
- Migrations: [signal inputs](https://angular.dev/reference/migrations/signal-inputs), [outputs](https://angular.dev/reference/migrations/outputs), [signal queries](https://angular.dev/reference/migrations/signal-queries), [control flow](https://angular.dev/reference/migrations/control-flow), [standalone](https://angular.dev/reference/migrations/standalone)

`pnpm validate:links` fetches every angular.dev link in the kit and checks that the page and the `#anchor` exist. CI runs it on every push.

## Development

Node and pnpm versions are pinned in `mise.toml`.

```sh
pnpm install
pnpm check            # Prettier, ESLint, typecheck (incl. the Angular example), Vitest, kit validation
pnpm validate:links   # also fetch every angular.dev link
claude plugin validate .
```

The tests cover the MCP tools, a real stdio round-trip with the SDK client (`tools/list` and `check_contrast`), and the validator. [AGENTS.md](AGENTS.md) has the rules for changing the kit.

## Licence

[MIT](LICENSE)
