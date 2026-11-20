# Async data in signals: resource and httpResource

Both are stable since v22.0 ([`resource` API](https://angular.dev/api/core/resource), [`httpResource` API](https://angular.dev/api/common/http/httpResource)). Before v22 they were experimental (`resource` since v19.0, `httpResource` since v19.2, per the [v21 API page](https://v21.angular.dev/api/core/resource)): on v19 to v21, say so in review instead of treating them as settled.

## httpResource for GET requests

- `httpResource(() => \`/api/users/${id()}\`)` sends a new request whenever a signal it reads changes, and cancels the pending one first ([using httpResource](https://angular.dev/guide/http/http-resource#using-httpresource)).
- It goes through `HttpClient`, so interceptors apply, and it starts eagerly, unlike `HttpClient`, which waits for a subscription ([using httpResource](https://angular.dev/guide/http/http-resource#using-httpresource)).
- Not for mutations: use `HttpClient` directly for `POST`, `PUT` and the like ([using httpResource](https://angular.dev/guide/http/http-resource#using-httpresource)).
- `httpResource.text()`, `.blob()` and `.arrayBuffer()` change the response type ([response types](https://angular.dev/guide/http/http-resource#response-types)).
- Pass `{parse: schema.parse}` to validate the response with Zod or Valibot; the resource takes the parser's output type ([parsing and validation](https://angular.dev/guide/http/http-resource#response-parsing-and-validation)).
- Test it with `provideHttpClientTesting()` and `HttpTestingController`, like any `HttpClient` code ([testing](https://angular.dev/guide/http/http-resource#testing-an-httpresource)).

## resource for any async loader

- `resource({params, loader})`: `params` is reactive; the loader runs whenever it produces a new value ([resources](https://angular.dev/guide/signals/resource)).
- If `params` returns `undefined`, the loader does not run and the status is `'idle'` ([resource loaders](https://angular.dev/guide/signals/resource#resource-loaders)).
- Pass `abortSignal` to `fetch`; a resource aborts the running load when `params` changes ([aborting requests](https://angular.dev/guide/signals/resource#aborting-requests)).
- `reload()` runs the loader again ([reloading](https://angular.dev/guide/signals/resource#reloading)).
- Use `chain(other)` inside `params` when one resource needs another's value; it carries the upstream `loading` and `error` states ([chaining resources](https://angular.dev/guide/signals/resource#chaining-resources)).
- `stream` is for sources that keep sending values (WebSocket, server-sent events) ([streaming resources](https://angular.dev/guide/signals/resource#streaming-resources)).

## Reading a resource safely

- `value()` throws when the status is `'error'`. Guard reads with `hasValue()`, which also narrows out `undefined` ([resource status](https://angular.dev/guide/signals/resource#resource-status), [httpResource](https://angular.dev/guide/http/http-resource#using-httpresource)).
- Statuses: `'idle'`, `'loading'`, `'reloading'`, `'resolved'`, `'error'`, `'local'` ([resource status](https://angular.dev/guide/signals/resource#resource-status)).
- In a template, branch on `hasValue()`, then `error()`, then `isLoading()` ([using httpResource](https://angular.dev/guide/http/http-resource#using-httpresource)).

## With server-side rendering

- An `id` lets the client reuse the value the server loaded. Never set it on data specific to the user who triggered the render ([caching with SSR](https://angular.dev/guide/signals/resource#caching-resource-data-with-ssr)).
