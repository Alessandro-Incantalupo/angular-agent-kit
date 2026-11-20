---
name: modern-angular
description: 'Writes and reviews Angular v20+ code in the signal-first style that angular.dev documents: signal, computed, linkedSignal, effect, resource and httpResource; zoneless change detection and OnPush as the default; @if, @for and @switch with a good track; standalone components; input(), output(), model() and signal queries; Signal Forms; RxJS interop (toSignal, takeUntilDestroyed). Use when writing or changing an Angular component, directive or service, converting decorators or *ngFor/*ngIf to the new APIs, deciding between computed, linkedSignal and effect, fetching data into signals, a view does not update after zone.js is removed, or reviewing an Angular diff.'
---

# Modern Angular

Every rule here comes from angular.dev and links to the page that says it. The facts were checked against Angular 22.3 (November 2026). When a project pins an older major, read the angular.dev page for that version before you apply a rule (the archived docs live at `v<major>.angular.dev`).

## Rules that hold everywhere

1. State lives in signals. Derive with `computed`, never by copying in an `effect` ([effects guide](https://angular.dev/guide/signals/effect#use-cases-for-effects)).
2. A template reads a signal by calling it: `count()`. That read is what tells Angular to refresh the view ([signals in OnPush components](https://angular.dev/guide/signals#reading-signals-in-onpush-components)).
3. Assume zoneless. It is the default since v21, so a plain field assigned in a callback never refreshes the view ([zoneless guide](https://angular.dev/guide/zoneless#enabling-zoneless-in-an-application)).
4. New code uses `input()`, `output()`, `model()` and `viewChild()`. The decorators still work, but angular.dev recommends the functions for new code ([inputs](https://angular.dev/guide/components/inputs#declaring-inputs-with-the-input-decorator), [outputs](https://angular.dev/guide/components/outputs#declaring-outputs-with-the-output-decorator), [queries](https://angular.dev/guide/components/queries#decorator-based-queries)).
5. Templates use `@if`, `@for` and `@switch`. Every `@for` tracks a stable id ([control flow](https://angular.dev/guide/templates/control-flow#why-is-track-in-for-blocks-important)).
6. Every subscription you open by hand ends with the component: `takeUntilDestroyed()`, or use `toSignal` ([takeUntilDestroyed](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)).

## Pick the reference

| Task                                                               | Read                                                                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Local state, derived values, `linkedSignal`, `effect`, `untracked` | `references/signals.md`                                                                   |
| Loading data into signals: `resource`, `httpResource`              | `references/async-data.md`                                                                |
| Inputs, outputs, two-way binding, queries, standalone imports      | `references/components.md`                                                                |
| `@if`, `@for`, `@switch`, `track`, `@empty`                        | `references/templates.md`                                                                 |
| Zoneless, `OnPush` by default, what notifies Angular, tests        | `references/zoneless.md`                                                                  |
| Forms: Signal Forms or reactive forms                              | `references/forms.md`                                                                     |
| Observables next to signals: `toSignal`, `toObservable`, cleanup   | `references/rxjs-interop.md`                                                              |
| Reviewing a diff: the traps, with severity                         | `references/review-checklist.md`                                                          |
| Moving an existing component over                                  | the `migrate-to-signals` skill, and the official schematics in `references/components.md` |

## Before you call Angular code done

- `ng build` (or the project's build) passes with strict templates.
- No `effect` writes a signal that a `computed` could derive.
- No plain class field is shown in a template and changed later.
- No `subscribe(` without `takeUntilDestroyed`, `toSignal` or an explicit `DestroyRef` callback.
