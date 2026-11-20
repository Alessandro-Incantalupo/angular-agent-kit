# RxJS next to signals

All of these come from `@angular/core/rxjs-interop`.

## toSignal

- `toSignal(obs$, {initialValue})` subscribes at once and unsubscribes when the component or service that called it is destroyed ([toSignal](https://angular.dev/ecosystem/rxjs-interop#create-a-signal-from-an-rxjs-observable-with-tosignal)).
- It creates a subscription each call: call it once per Observable and reuse the signal ([toSignal](https://angular.dev/ecosystem/rxjs-interop#create-a-signal-from-an-rxjs-observable-with-tosignal)).
- It needs an injection context, or an explicit `injector` ([injection context](https://angular.dev/ecosystem/rxjs-interop#injection-context)).
- Without `initialValue` the signal starts as `undefined`; `requireSync` is for Observables that emit synchronously ([initial values](https://angular.dev/ecosystem/rxjs-interop#initial-values)).

## toObservable

- `toObservable(sig)` emits through an effect, after the signal settles: several quick `set` calls give one emission ([timing](https://angular.dev/ecosystem/rxjs-interop#timing-of-toobservable)).
- This makes `toSignal(toObservable(query).pipe(debounceTime(200)), {initialValue: ''})` a short way to debounce a signal.

## Cleaning up subscriptions

- `takeUntilDestroyed()` unsubscribes when the component or directive is destroyed. Outside an injection context pass a `DestroyRef` ([takeUntilDestroyed](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)).
- `inject(DestroyRef).onDestroy(fn)` replaces `ngOnDestroy` for other teardown ([DestroyRef](https://angular.dev/guide/components/lifecycle#destroyref)).

## Outputs

- `outputFromObservable(obs$)` turns an Observable into an output; `outputToObservable(ref)` goes the other way ([output interop](https://angular.dev/ecosystem/rxjs-interop/output-interop)).
