# Forms

## Signal Forms

- Status: stable since v22.0 ([`form` API](https://angular.dev/api/forms/signals/form), [`FormField` API](https://angular.dev/api/forms/signals/FormField)). They were experimental in v21 ([v21 `form` API](https://v21.angular.dev/api/forms/signals/form)), so on v21 treat them as a trial.
- They need Angular v21 or later and ship in `@angular/forms/signals` ([overview](https://angular.dev/guide/forms/signals/overview#prerequisites)).
- The model is a `signal`; `form(model)` returns a `FieldTree` that mirrors its shape ([essentials](https://angular.dev/essentials/signal-forms#2-pass-the-form-model-to-form-to-create-a-fieldtree)).
- Bind inputs with `[formField]="loginForm.email"` and import `FormField` in the component ([binding inputs](https://angular.dev/essentials/signal-forms#3-bind-html-inputs-with-formfield-directive), [setup](https://angular.dev/guide/forms/signals/overview#setup)).
- Read state by calling a node: `loginForm.email().value()`; write with `.value.set()`, which also updates the model signal ([reading state](https://angular.dev/essentials/signal-forms#4-read-state-with-fieldtree-signals), [updating values](https://angular.dev/essentials/signal-forms#5-update-values-with-set)).
- Validation rules live in one schema ([why Signal Forms](https://angular.dev/guide/forms/signals/overview#why-signal-forms), [validation](https://angular.dev/guide/forms/signals/validation)).

## When to keep reactive forms

- angular.dev says Signal Forms work best in new applications built with signals, and that reactive forms remain a solid choice in existing apps that use them ([why Signal Forms](https://angular.dev/guide/forms/signals/overview#why-signal-forms), [comparison](https://angular.dev/guide/forms/signals/comparison)).
- A migration to signals does not have to rewrite a working reactive form. Under zoneless, make sure the template is notified when the form changes ([reactive forms in zoneless apps](https://angular.dev/guide/zoneless#reactive-forms-in-zoneless-applications)).
