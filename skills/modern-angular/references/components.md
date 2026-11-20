# Components: standalone, inputs, outputs, model, queries

## Standalone

- Components are standalone by default since v19: add them straight to another component's `imports`. Older components may carry `standalone: false` ([imports in @Component](https://angular.dev/guide/components#imports-in-the-component-decorator)).
- `ng generate @angular/core:standalone` converts declarations, removes needless NgModules and switches to standalone bootstrap, one mode per run ([standalone migration](https://angular.dev/reference/migrations/standalone)).

## Inputs

- `value = input(0)` returns a read-only `InputSignal`; read it as `this.value()` in code and `value()` in templates ([reading inputs](https://angular.dev/guide/components/inputs#reading-inputs)).
- `input<T>()` without a default is `T | undefined`; `input.required<T>()` is not, and a missing binding fails the build ([required inputs](https://angular.dev/guide/components/inputs#required-inputs)).
- `input()` may only be called in a property initializer of a component or directive ([inputs](https://angular.dev/guide/components/inputs)).
- Transforms must be pure, statically analyzable functions ([input transforms](https://angular.dev/guide/components/inputs#input-transforms)).
- An `ngOnChanges` that only recomputes a field from inputs becomes a `computed` that reads the inputs (follows from [reading inputs](https://angular.dev/guide/components/inputs#reading-inputs) and [computed](https://angular.dev/guide/signals#computed-signals)).

## Outputs

- `closed = output<void>()` returns an `OutputEmitterRef`; call `.emit()` ([outputs](https://angular.dev/guide/components/outputs)).
- Outputs do not bubble through the DOM ([outputs](https://angular.dev/guide/components/outputs)).
- Use camelCase names without an `on` prefix ([choosing event names](https://angular.dev/guide/components/outputs#choosing-event-names)).
- To emit from an Observable, use `outputFromObservable` ([output interop](https://angular.dev/ecosystem/rxjs-interop/output-interop)).

## Two-way binding with model()

- `value = model(0)` is an input the component can also write with `set` or `update`; the change flows back through `[(value)]` ([model inputs](https://angular.dev/guide/components/inputs#model-inputs)).
- It creates an implicit `valueChange` output, emitted on every `set` or `update` ([implicit change events](https://angular.dev/guide/components/inputs#implicit-change-events)).
- The parent can bind a signal (`[(value)]="volume"`, the instance, not `volume()`) or a plain property ([model inputs](https://angular.dev/guide/components/inputs#model-inputs), [plain properties](https://angular.dev/guide/components/inputs#two-way-binding-with-plain-properties)).
- Model inputs take no transforms ([customizing model inputs](https://angular.dev/guide/components/inputs#customizing-model-inputs)).
- Use `model()` when the component exists to change a value, such as a custom form control ([when to use model inputs](https://angular.dev/guide/components/inputs#when-to-use-model-inputs)).
- A pair `@Input() x` + `@Output() xChange` is the decorator form of the same contract, so it maps to one `model()`.

## Queries

- `viewChild`, `viewChildren`, `contentChild` and `contentChildren` return signals that stay up to date ([view queries](https://angular.dev/guide/components/queries#view-queries), [content queries](https://angular.dev/guide/components/queries#content-queries)).
- A single-result query is `undefined` when nothing matches, for example inside a false `@if`. `viewChild.required()` drops `undefined` and errors if nothing matches ([required queries](https://angular.dev/guide/components/queries#required-queries)).
- Do not write state into children or parents through queries; keep one source of truth ([common query pitfalls](https://angular.dev/guide/components/queries#common-query-pitfalls)).
- DOM work on a queried element that must wait for render goes in `afterNextRender` ([afterEveryRender and afterNextRender](https://angular.dev/guide/components/lifecycle#aftereveryrender-and-afternextrender)).

## Official schematics

Run them before hand edits; they update templates and TypeScript references too.

| Change                                | Command                                              | Source                                                                    |
| ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `@Input` to `input()`                 | `ng generate @angular/core:signal-input-migration`   | [signal inputs](https://angular.dev/reference/migrations/signal-inputs)   |
| `@Output` to `output()`               | `ng generate @angular/core:output-migration`         | [outputs](https://angular.dev/reference/migrations/outputs)               |
| Decorator queries to signal queries   | `ng generate @angular/core:signal-queries-migration` | [signal queries](https://angular.dev/reference/migrations/signal-queries) |
| `*ngIf`/`*ngFor`/`ngSwitch` to blocks | `ng generate @angular/core:control-flow`             | [control flow](https://angular.dev/reference/migrations/control-flow)     |
| NgModules to standalone               | `ng generate @angular/core:standalone`               | [standalone](https://angular.dev/reference/migrations/standalone)         |

The input and query migrations accept `--path` and `--best-effort-mode` ([signal input options](https://angular.dev/reference/migrations/signal-inputs#configuration-options)).
