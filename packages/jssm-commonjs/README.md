# jssm-commonjs

The **CommonJS** build of [jssm](https://www.npmjs.com/package/jssm), for consumers that `require()` rather than `import`.

```js
const { sm } = require('jssm-commonjs');

const light = sm`red -> green -> yellow -> red;`;
light.transition('green');
```

## Why this package exists

As of v6 the main `jssm` package ships a single ESM build. The CommonJS and browser-global formats were not dropped — they moved here and to [`jssm-iife`](https://www.npmjs.com/package/jssm-iife), so an ESM consumer no longer downloads three copies of the same library.

## It does not depend on `jssm`

Deliberately. `require()` of an ESM-only package is exactly what the Node versions still needing CommonJS cannot do, so a thin re-export would fail for the audience this package serves. It carries its own complete build instead.

Consequence: **do not install both `jssm` and `jssm-commonjs` expecting shared state.** They are separate copies, so an object from one will not satisfy an `instanceof` from the other. Pick the format your project uses.

## Types

TypeScript declarations ship in this package. There is no `@types/jssm-commonjs` and there never will be.

## License

MIT
