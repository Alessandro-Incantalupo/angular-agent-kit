---
name: migrate-to-signals
description: 'Playbook that moves one existing Angular component to signals: official schematics first, then the hand edits they leave (state fields, ngOnChanges, HttpClient subscriptions, Input/Output pairs, *ngFor tracking, ngAfterViewInit DOM work), then build, tests and grep checks. Use when asked to migrate, modernize or convert a component, directive or its template to signals, signal inputs, model(), signal queries or @if/@for, or to make a component work without zone.js.'
argument-hint: '<path to the component .ts file>'
---

# Migrate a component to signals

Work on one component at a time. The `modern-angular` skill holds the rules and the angular.dev links; this playbook is the order of work. Run commands with the project's own CLI (`npx ng`, `pnpm ng`...).

## 0. Before you edit

1. Read the Angular version from `package.json`. Steps marked **v22** need v22 or later; on older versions keep the alternative given.
2. `git status` must be clean, so the diff shows only this migration.
3. Run the component's tests and the build once, and note any failure that was already there.
4. Find every place that uses the component: search for its selector and class name. Note how parents bind each input and output.

## 1. Let the schematics do the mechanical part

Scope each one to the component's folder with `--path`:

```sh
ng generate @angular/core:signal-input-migration --path <folder>
ng generate @angular/core:output-migration --path <folder>
ng generate @angular/core:signal-queries-migration --path <folder>
ng generate @angular/core:control-flow --path <folder>
```

They update templates, host bindings and TypeScript references. Read their diff before going on. Anything they skip is listed in their output; add `--best-effort-mode` to the input and query migrations only if you will review each change.

## 2. Hand edits the schematics leave

| You find                                                                           | Change it to                                                                                         |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A field shown in the template and assigned later (`loading = false`, `items = []`) | `signal()`; replace assignments with `.set()` / `.update()` and template reads with `name()`         |
| `ngOnChanges` (or a setter) that recomputes a field from inputs                    | `computed()` that reads the inputs; delete the hook                                                  |
| `@Input() x` + `@Output() xChange`, or `input()` + `output()` with the same pair   | one `model()`; parents keep `[(x)]` or `(xChange)`, which `model()` emits implicitly                 |
| `this.http.get(...).subscribe(v => this.x = v)` for display                        | **v22** `httpResource(() => url)`; before v22 `toSignal(...)` in a field                             |
| `subscribe` kept for a side effect                                                 | `.pipe(takeUntilDestroyed())` in the constructor, or `takeUntilDestroyed(this.destroyRef)` elsewhere |
| A `Subject` that only debounces a value from the template                          | a `signal` plus `toSignal(toObservable(sig).pipe(debounceTime(n)), {initialValue})`                  |
| `ngAfterViewInit` touching the DOM (focus, measure)                                | `afterNextRender(() => ...)` in the constructor                                                      |
| `effect` that copies one signal into another                                       | `computed`, or `linkedSignal` when the user can override it                                          |
| `track $index` or `track item` on a list that changes                              | `track item.id`                                                                                      |
| `NgIf`, `NgFor`, `CommonModule` left in `imports`                                  | remove them if nothing else in the template needs them                                               |

Keep behaviour the same. If a change alters behaviour (timing, an event that now fires once instead of twice), say so in your report.

## 3. Check

```sh
ng build                       # strict template type checking catches missed () calls
ng test                        # or the project's test command
grep -nE '@(Input|Output|ViewChild|ViewChildren|ContentChild|ContentChildren)\(' <files>
grep -nE '\*ng(If|For|Switch)|\[ngSwitch\]' <files>
grep -nE '\.subscribe\(' <files>          # each one needs a teardown
grep -nE 'track (\$index|[a-z]+)\s*[;)}]' <files>   # check each is a stable id
grep -nE 'effect\(' <files>               # each one writes to a non-signal API only
```

Every grep hit is either fixed or explained in the report. Then exercise the component once in the running app or a test: under zoneless, a view that does not update means a value still lives in a plain field.

## 4. Report

- The schematics you ran and what they changed.
- Each hand edit, grouped by the table above.
- Parent templates you touched, if any.
- Behaviour changes, and anything left as is on purpose (for example a reactive form kept as is).
- The command output of build and tests.

## Sources

Schematics: [signal inputs](https://angular.dev/reference/migrations/signal-inputs), [outputs](https://angular.dev/reference/migrations/outputs), [signal queries](https://angular.dev/reference/migrations/signal-queries), [control flow](https://angular.dev/reference/migrations/control-flow). Hand edits: [computed](https://angular.dev/guide/signals#computed-signals), [model inputs](https://angular.dev/guide/components/inputs#implicit-change-events), [httpResource](https://angular.dev/guide/http/http-resource#using-httpresource), [takeUntilDestroyed](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed), [toObservable timing](https://angular.dev/ecosystem/rxjs-interop#timing-of-toobservable), [afterNextRender](https://angular.dev/guide/components/lifecycle#aftereveryrender-and-afternextrender), [effects](https://angular.dev/guide/signals/effect#use-cases-for-effects), [track](https://angular.dev/guide/templates/control-flow#why-is-track-in-for-blocks-important), [zoneless notifications](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility).
