# Review run

The `angular-reviewer` agent, run by Claude Code on the commit that added [`before/member-list.component.ts`](before/member-list.component.ts). This is the agent's report as it printed it, unedited.

```sh
claude -p --plugin-dir <this repository> --agent angular-agent-kit:angular-reviewer \
  --allowedTools "Bash(git show*)" "Bash(git diff*)" "Bash(git log*)" Read Glob Grep Skill \
  "Review commit 8c0a913 (git show 8c0a913), which adds examples/before/member-list.component.ts. The workspace is Angular 22.3.0 (examples/package.json)."
```

---

## Angular review: commit 8c0a913, `examples/before/member-list.component.ts` (Angular 22.3.0)

This file is the "before" half of the migrate-to-signals example, so the legacy patterns look intentional. I reviewed it as written. The bugs below are real, but they may be what the example is meant to show.

### Bugs
- examples/before/member-list.component.ts:69 · The `search$.pipe(debounceTime(200)).subscribe(...)` call never ends. A `Subject` never completes, so the subscription outlives the component. Fix: add `takeUntilDestroyed(this.destroyRef)` to the pipe, or turn the search into a signal and use `toObservable`/`toSignal`. [angular.dev](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)
- examples/before/member-list.component.ts:70-71, 102-104, 107-108 · The plain fields `query`, `visibleMembers`, `members`, `loading` and `error` are shown in the template. They are assigned inside `subscribe` callbacks. The component sets no `changeDetection`, so it gets the v22 `OnPush` default, and zoneless is the default since v21. Nothing tells Angular to refresh the view after the debounce fires or after the HTTP response arrives, so the list stays on "Loading members…". The `(click)` handler at line 93 is fine, because template listeners do notify. Fix: make these signals (`members`, `loading`, `error`, `query` as `signal`, `visibleMembers` as `computed`). [angular.dev](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility)

### Risks
- examples/before/member-list.component.ts:100 · `http.get(...).subscribe` has no teardown. HttpClient completes on its own, so this is not a leak. A second `teamId` change can still let an older response overwrite a newer one. check: if the example is meant to stay simple, ignore this. Otherwise use `httpResource` or `toSignal` with `switchMap`. [angular.dev](https://angular.dev/guide/http/http-resource)
- examples/before/member-list.component.ts:40 · `*ngFor` has no `trackBy`. This is the same problem as `@for` without a stable track, and it shows up as lost DOM state and slow re-renders. Fix: use `@for (member of visibleMembers(); track member.id)`. [angular.dev](https://angular.dev/guide/templates/control-flow#why-is-track-in-for-blocks-important)

### Modernize
- examples/before/member-list.component.ts:35-46 (and `imports: [NgFor, NgIf]` at line 28) · `*ngIf` and `*ngFor` should become `@if` and `@for`. Then drop `NgFor` and `NgIf` from the imports. [angular.dev](https://angular.dev/reference/migrations/control-flow)
- examples/before/member-list.component.ts:52-55 · `@Input` and `@Output` should become `input()` and `input.required()`. The `selectedId` and `selectedIdChange` pair should become `model()`. [angular.dev](https://angular.dev/guide/components/inputs#model-inputs)
- examples/before/member-list.component.ts:57, 84-86 · `@ViewChild` plus `ngAfterViewInit` focus should become `viewChild()` and `afterNextRender`. Handle `undefined` when you read the query. [angular.dev](https://angular.dev/guide/components/queries)
- examples/before/member-list.component.ts:75-81 and 113-117 · `ngOnChanges` fills `visibleMembers`. This should be a `computed` over `members`, `query`, `showInactive` and `selectedId`. [angular.dev](https://angular.dev/guide/signals#computed-signals)

### Outside the diff
- examples/angular.json:13 and examples/tsconfig.json:20 · Both point at `after/member-list.component.ts`, which this commit does not add. The `after` file is in the working tree now, so a build from this commit alone would fail. check: it may arrive in a later commit.

Checked: 4 files, 4 hunks (the component in depth, plus `angular.json`, `package.json` and `tsconfig.json`). No findings in `examples/package.json`: its versions match 22.3.0 and it only lists devDependencies. No findings in `examples/tsconfig.json`, apart from the `after` reference noted above.
