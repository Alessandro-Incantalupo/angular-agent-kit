# Signals: state, derived state and effects

## Choose the primitive

| You need                                                                               | Use                                                | Source                                                                                                |
| -------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| A value you set directly                                                               | `signal(initial)`, then `.set()` or `.update()`    | [Writable signals](https://angular.dev/guide/signals#writable-signals)                                |
| A value computed from other signals                                                    | `computed(() => ...)`                              | [Computed signals](https://angular.dev/guide/signals#computed-signals)                                |
| A value derived from other signals that the user can also overwrite                    | `linkedSignal(() => ...)`                          | [linkedSignal](https://angular.dev/guide/signals/linked-signal)                                       |
| To push signal state into a non-signal API (storage, canvas, a chart library, logging) | `effect(() => ...)`                                | [Use cases for effects](https://angular.dev/guide/signals/effect#use-cases-for-effects)               |
| To touch the DOM after Angular rendered                                                | `afterRenderEffect`                                | [Side effects on DOM elements](https://angular.dev/guide/signals/effect#side-effects-on-dom-elements) |
| Async data                                                                             | `resource` or `httpResource` (see `async-data.md`) | [Resources](https://angular.dev/guide/signals/resource)                                               |

## computed

- Lazy and memoized: the derivation runs on the first read and is cached until a dependency changes, so filtering a large array in a `computed` is fine ([lazily evaluated and memoized](https://angular.dev/guide/signals#computed-signals-are-both-lazily-evaluated-and-memoized)).
- Dependencies are dynamic: only signals read during the last run are tracked ([dynamic dependencies](https://angular.dev/guide/signals#computed-signal-dependencies-are-dynamic)).
- A `computed` is read-only; calling `.set()` on it is a compile error ([not writable](https://angular.dev/guide/signals#computed-signals-are-not-writable-signals)).

## linkedSignal

- Use it when a piece of state must reset or adjust when its source changes but the user can still set it, such as a selected option that must stay valid ([linkedSignal](https://angular.dev/guide/signals/linked-signal)).
- The `{source, computation}` form receives the previous value, so you can keep the user's choice if it still exists. Give the generic types explicitly when you use `previous` ([previous state](https://angular.dev/guide/signals/linked-signal#accounting-for-previous-state)).
- A custom `set` option can write back to the source of truth instead ([customizing the set operation](https://angular.dev/guide/signals/linked-signal#customizing-the-set-operation)).

## effect

- Effects are the last API to reach for. If an effect copies one signal into another, move the source of truth up and use `computed` or `linkedSignal` ([use cases](https://angular.dev/guide/signals/effect#use-cases-for-effects)).
- Propagating state through effects can cause `ExpressionChangedAfterItHasBeenChecked` errors, infinite circular updates or extra change detection cycles ([when not to use effects](https://angular.dev/guide/signals/effect#use-cases-for-effects)).
- Effects run at least once, track what they read, and run asynchronously during change detection ([effects](https://angular.dev/guide/signals/effect)).
- Create them in an injection context, usually the constructor, or pass `{injector}` ([injection context](https://angular.dev/guide/signals/effect#injection-context)).
- Cancel long work with `onCleanup`, which runs before the next run and on destroy ([cleanup functions](https://angular.dev/guide/signals/effect#effect-cleanup-functions)).
- Effects created in a component are destroyed with it; root effects live as long as the app ([destroying effects](https://angular.dev/guide/signals/effect#destroying-effects)).
- `afterRenderEffect` without a phase runs in `mixedReadWrite`, which can add reflows; name the phase (`earlyRead`, `write`, `mixedReadWrite`, `read`) ([render phases](https://angular.dev/guide/signals/effect#render-phases)).

## Tracking

- Reactive contexts are effects, `computed`, `linkedSignal`, a resource's `params` and template rendering ([reactive contexts](https://angular.dev/guide/signals#reactive-contexts)).
- `untracked(signal)` or `untracked(() => ...)` reads without creating a dependency, including inside code you call from an effect ([reading without tracking](https://angular.dev/guide/signals#reading-without-tracking-dependencies)).
- Tracking stops at the first `await`. Read every signal before it ([async operations](https://angular.dev/guide/signals#reactive-context-and-async-operations)).

## Exposing state from a service

- Keep the writable signal private and expose `asReadonly()`. It does not stop deep mutation of the value inside ([readonly signals](https://angular.dev/guide/signals#converting-writable-signals-to-readonly)).
- Signals compare with `Object.is` by default; pass `{equal}` to change that, for example to skip updates for equal arrays ([equality functions](https://angular.dev/guide/signals#signal-equality-functions)). The corollary: replace objects and arrays (`update(list => [...list, item])`) rather than mutating them in place.
