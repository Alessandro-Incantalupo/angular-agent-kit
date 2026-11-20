# Templates: built-in control flow

## @if

- `@if (cond) { } @else if (other) { } @else { }` replaces `*ngIf` ([@if](https://angular.dev/guide/templates/control-flow#conditionally-display-content-with-if-else-if-and-else)).
- `@if (expr; as name)` keeps a long expression's result for the block ([referencing the result](https://angular.dev/guide/templates/control-flow#referencing-the-conditional-expressions-result)).

## @for and track

- `@for (item of items; track item.id) { }` ([@for](https://angular.dev/guide/templates/control-flow#repeat-content-with-the-for-block)).
- Track a property that uniquely identifies the item (`id`, `uuid`). Use `$index` only for static collections. Tracking the item itself (`track item`) compares references and is the slowest option for changing lists ([why track matters](https://angular.dev/guide/templates/control-flow#why-is-track-in-for-blocks-important)).
- `$index`, `$count`, `$first`, `$last`, `$even` and `$odd` are always available and can be aliased with `let` ([contextual variables](https://angular.dev/guide/templates/control-flow#contextual-variables-in-for-blocks)).
- `@empty` renders when the list has no items ([@empty](https://angular.dev/guide/templates/control-flow#providing-a-fallback-for-for-blocks-with-the-empty-block)).
- `@for` reuses views: when a tracked object is changed in place, Angular updates bindings instead of recreating the element, unlike `*ngFor` with `trackBy` ([view reuse](https://angular.dev/reference/migrations/control-flow#for-view-reuse)). Check components that relied on being recreated.

## @switch

- Cases compare with `===` and do not fall through; consecutive `@case` lines share a block ([@switch](https://angular.dev/guide/templates/control-flow#conditionally-display-content-with-the-switch-block)).
- `@default never;` makes the template type checker fail when a union member has no case. It works on variables, not on a signal call: assign the signal to a `@let` first ([exhaustive type checking](https://angular.dev/guide/templates/control-flow#exhaustive-type-checking)).

## Migrating

`ng generate @angular/core:control-flow` converts `*ngIf`, `*ngFor` and `*ngSwitch` ([control flow migration](https://angular.dev/reference/migrations/control-flow)). Afterwards, read every `track` it wrote: a list that changes needs a unique id, per the rule above.
