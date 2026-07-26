# jssm-iife

The **browser-global (IIFE)** build of [jssm](https://www.npmjs.com/package/jssm), for `<script>` tags and CDN use — no bundler, no module loader, no build step.

```html
<script src="https://unpkg.com/jssm-iife@6.0.0-alpha.12/dist/jssm.iife.js"></script>
<script>
  const light = jssm.sm`red -> green -> yellow -> red;`;
  light.transition('green');
</script>
```

The bundle attaches a single global, `jssm`.

**Pin the version**, as above, rather than loading a floating `@latest` — a CDN URL without a version silently changes under you. For anything user-facing, also add Subresource Integrity so a compromised CDN cannot serve you different code:

```html
<script src="https://unpkg.com/jssm-iife@6.0.0-alpha.12/dist/jssm.iife.js"
        integrity="sha384-<hash for this exact version>"
        crossorigin="anonymous"></script>
```

The hash is per-version; generate it with `openssl dgst -sha384 -binary dist/jssm.iife.js | openssl base64 -A` against the file the CDN serves.

## Why this package exists

As of v6 the main `jssm` package ships a single ESM build. The browser-global and CommonJS formats were not dropped — they moved here and to [`jssm-cjs`](https://www.npmjs.com/package/jssm-cjs), so an ESM consumer no longer downloads three copies of the same library.

## It does not depend on `jssm`

Necessarily. An IIFE exists to run where there is no resolver at all — nothing in a bare `<script>` tag could follow a dependency edge. The bundle carries everything it needs.

Consequence: **do not load both this and a module build expecting shared state.** They are separate copies, so an object from one will not satisfy an `instanceof` from the other.

## Types

TypeScript declarations ship in this package, for editors and bundlers that want them even for a global build. There is no `@types/jssm-iife` and there never will be.

## License

MIT
