# Review of the migration

The `angular-reviewer` agent, run by Claude Code on the playbook's commit (`a66aa41`). This is the agent's report as it printed it, unedited. Its "check" note is answered by the [resource status table](https://angular.dev/guide/signals/resource#resource-status): `value()` throws in the `'error'` state, and Angular 22.3's `ResourceImpl` returns the default value only while loading or idle, so the fix was applied.

```sh
claude -p --plugin-dir <the kit> --agent angular-agent-kit:angular-reviewer \
  --allowedTools "Bash(git show*)" "Bash(git diff*)" "Bash(git log*)" Read Glob Grep Skill \
  "Review commit a66aa41 (git show a66aa41 -- examples/after), which migrates examples/after/member-list.component.ts to signals. The workspace is Angular 22.3.0 (examples/package.json)."
```

---

## Angular review: commit a66aa41, `examples/after/member-list.component.ts` (Angular 22.3.0)

### Bugs
- examples/after/member-list.component.ts:48 · The template reads `members.value().length` outside any guard. `visibleMembers` (line 72) also calls `members.value()`. `value()` throws once the request fails, so the "Could not load the members." message may never show, because the same render throws first. This is the error path the old `error` string handled. Check: the checklist says `value()` throws in the error state, and I haven't confirmed whether `defaultValue: []` changes that. Fix: guard with `hasValue()`, for example `members.hasValue() ? members.value() : []` in `visibleMembers`. Use `members.hasValue() ? members.value().length : 0` in the template, or move the count inside the `@if (!members.isLoading() && !error())` block. [angular.dev](https://angular.dev/guide/signals/resource#resource-status)

Checked: 1 file, 6 hunks (the `.md` and `.diff` files in the commit are docs, so I skipped them). No findings in:
- The inputs, `model()` and `viewChild.required` + `afterNextRender` focus.
- `@for` with `track member.id`.
- The debounced `toSignal(toObservable(...))`, which is created once in a field initializer.
- The removal of `ngOnChanges` and the manual subscriptions.
