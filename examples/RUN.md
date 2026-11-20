# Playbook run

Claude Code ran the `migrate-to-signals` skill on [`after/member-list.component.ts`](after/member-list.component.ts), which started as a copy of [`before/`](before/member-list.component.ts). Below is the agent's report as it printed it, unedited. The file it produced is the commit "docs(examples): migrate after/ with the migrate-to-signals playbook", and [`migration.diff`](migration.diff) is `diff -u before/ after/` at that commit.

```sh
cd examples
claude -p --plugin-dir <the kit> --permission-mode acceptEdits \
  --allowedTools "Bash(npx ng *)" "Bash(npx ngc *)" "Bash(grep *)" "Bash(git status*)" "Bash(git diff*)" \
                 Read "Edit(./after/**)" Glob Grep Skill \
  "/angular-agent-kit:migrate-to-signals after/member-list.component.ts
   Context for this run: [...] the build check is npx ngc -p tsconfig.json [...] pass --path after to every schematic [...]"
```

The kit was loaded from a copy of this repository's plugin files: Claude Code protects files inside a loaded plugin directory from edits, and `examples/` sits inside it.

The run left one bug: the template and a `computed` read `members.value()` without `hasValue()`, and `value()` throws once the request fails. The [`angular-reviewer`](../agents/angular-reviewer.agent.md) agent caught it in the next step ([REVIEW-AFTER.md](REVIEW-AFTER.md)), the fix is the commit after, and the playbook now has a row for it.

---

`after/member-list.component.ts` is migrated. `npx ngc -p tsconfig.json` passes with strict templates and no output. There are no unit tests in this folder, and I did not run the component in a browser.

## Checks
- **Baseline:** I couldn't capture a clean "before" build. The first compound command was blocked, so I didn't see the baseline `ngc` result.
- **Greps:** the only hit is `track member.id` (line 40), which is a stable id. There are no `@Input` or `@Output` decorators, no `*ng*` directives, no `.subscribe(` and no `effect(`.
- **`before/`:** untouched.
- **`REVIEW.md`:** an untracked `examples/REVIEW.md` showed up in `git status`. I didn't create it.

## Schematics run (all with `--path after`)
- **`signal-input-migration`:** migrated 2 of 3 inputs. `teamId` became `input.required<number>()` and `showInactive` became `input(false)`. It skipped `selectedId`, which I handled by hand.
- **`output-migration`:** migrated 1 of 1. `selectedIdChange` became `output<number>()`.
- **`signal-queries-migration`:** migrated 1 of 2. The `ViewChild` for `search` became `viewChild.required`. I didn't use `--best-effort-mode`.
- **`control-flow`:** `*ngIf` and `*ngFor` became `@if` and `@for`. It also dropped `NgIf` and `NgFor` from `imports`. It left `track member`, which I fixed.

## Hand edits
- **Input and output pair:** `@Input() selectedId` and `selectedIdChange` became one `model<number | null>(null)`. The parent keeps `[(selectedId)]`. `select()` calls `selectedId.set(...)`.
- **State fields:** `members`, `visibleMembers`, `loading`, `error`, the `query` field and the `ngOnChanges`/`ngOnInit` hooks are gone. The class no longer implements any lifecycle interface.
- **Data loading:** the `HttpClient` subscribe became `httpResource<Member[]>(() => `/api/teams/${teamId()}/members`, { defaultValue: [] })`. `loading` is now `members.isLoading()`. `error` is a `computed` that returns the same message.
- **Filtering:** `visibleMembers` is a `computed` over `members.value()`, `showInactive()` and the debounced query.
- **Debounce:** the `Subject` became a `rawQuery` signal piped through `toObservable`, `debounceTime(200)` and `toSignal({ initialValue: '' })`.
- **Focus:** `ngAfterViewInit` became `afterNextRender(...)` in the constructor.
- **Track:** `track member` became `track member.id`.
- **Parent templates:** none touched, because there are none here.

## Behaviour changes
- **Reloads:** the old code kept the previous `members` while loading a new team and after an error. With `defaultValue: []`, the list and the "N of M shown" count read as empty during a reload or error. The `@if` guards already hide the list in those states, so only the count differs.
- **Request timing:** the resource fires when `teamId` is set, including at creation. Before, the request ran in `ngOnChanges` after the first input binding. In practice that is the same moment.
- **Request cancellation:** a `teamId` change now cancels the in-flight request. The old code let both requests finish, and the last response to arrive won.
- **Debounce on first render:** the first filter result is computed immediately from the empty query. The old code filtered on the first load, so the visible result is the same.
- **`HttpClient` provider:** `httpResource` needs `provideHttpClient()` in the app, as `HttpClient` did before.

Nothing was committed.
