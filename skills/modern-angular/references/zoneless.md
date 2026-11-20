# Zoneless change detection and OnPush

## The defaults

- Zoneless is the default since v21. Check that nothing calls `provideZoneChangeDetection`. On v20, add `provideZonelessChangeDetection()` at bootstrap ([enabling zoneless](https://angular.dev/guide/zoneless#enabling-zoneless-in-an-application)).
- `OnPush` is the default change detection strategy since v22. `ChangeDetectionStrategy.Default` is deprecated in favour of `Eager` ([skipping subtrees](https://angular.dev/best-practices/skipping-subtrees#using-onpush), [ChangeDetectionStrategy](https://angular.dev/api/core/ChangeDetectionStrategy)).
- Remove `zone.js` and `zone.js/testing` from the `polyfills` of the build and test targets, then the dependency ([removing ZoneJS](https://angular.dev/guide/zoneless#removing-zonejs)).

## What tells Angular to refresh

Without zone.js, Angular refreshes a view only after one of these ([requirements](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility)):

- `ChangeDetectorRef.markForCheck()` (the `async` pipe calls it),
- `ComponentRef.setInput`,
- a signal read in a template is updated,
- a bound template or host listener runs,
- a view marked dirty by one of the above is attached.

So a plain field assigned inside `subscribe`, `setTimeout`, a promise or a third-party callback no longer shows up on screen. Hold that value in a signal (or use `toSignal`, `httpResource`), which is the fix the docs give for tests too ([TestBed](https://angular.dev/guide/zoneless#using-zoneless-in-testbed)).

## OnPush assumptions to drop

`OnPush` checks a component when ([using OnPush](https://angular.dev/best-practices/skipping-subtrees#using-onpush)):

- a bound input gets a new value (compared with `Object.is`, so mutating an input object in place is not a new value),
- an event is handled in it or its children,
- it is marked for check,
- a signal its template reads changes; then only the components that read it refresh.

Code that worked because zone.js ran change detection after every event or timer, such as a parent mutating an array that a child shows, breaks here.

## NgZone APIs

- `NgZone.onMicrotaskEmpty`, `onUnstable` and `onStable` never emit, and `isStable` is always `true`. Replace waits with `afterNextRender` or `afterEveryRender`, or a DOM API such as `MutationObserver` ([remove NgZone observables](https://angular.dev/guide/zoneless#remove-ngzoneonmicrotaskempty-ngzoneonunstable-ngzoneisstable-or-ngzoneonstable)).
- `NgZone.run` and `runOutsideAngular` are compatible; leave them in libraries ([same section](https://angular.dev/guide/zoneless#remove-ngzoneonmicrotaskempty-ngzoneonunstable-ngzoneisstable-or-ngzoneonstable)).

## Server-side rendering

- Register async work that must finish before serialization with `PendingTasks` (`run`, or `add` plus cleanup), or `pendingUntilEvent()` for an Observable ([PendingTasks](https://angular.dev/guide/zoneless#pendingtasks-for-server-side-rendering-ssr)).

## Reactive forms

- `setValue`, `patchValue` and `FormArray.push` do not schedule change detection. Connect the form observables to `markForCheck()` or mirror the state in signals ([reactive forms in zoneless apps](https://angular.dev/guide/zoneless#reactive-forms-in-zoneless-applications)).

## Tests

- `TestBed` is zoneless by default. Prefer `await fixture.whenStable()` over `fixture.detectChanges()`; `TestBed` throws `ExpressionChangedAfterItHasBeenCheckedError` when a template value changed without a notification ([TestBed](https://angular.dev/guide/zoneless#using-zoneless-in-testbed)).
- `provideCheckNoChangesConfig({exhaustive: true, interval})` finds bindings that changed without a notification; it is in developer preview ([debug-mode check](https://angular.dev/guide/zoneless#debug-mode-check-to-ensure-updates-are-detected)).
