# Deno

`Warning: Deno support is newly underway.  The local instructions work.  Module publishing stuff has to be fixed.`

Deno does not require installation.  (However, if you're going to alter the library and submit a PR, installing in NPM then running `npm run build` is necessary.)

In Deno, it is generally preferred to load modules from the official module system.  However, you can also load from a local build (which can be useful if you're modifying the library,) or from the Github repo directly.

&nbsp;

## From the Deno module service

***This is very probably what you want to do***.

The most common usage is probably to match one or more methods off of the module:

```typescript
import { sm } from "https://deno.land/x/jssm@5.90.0";

const TrafficLight = sm`Red => Green => Yellow => Red;`;
```

You can also bulk import the entire module:

```typescript
import * as jssm from "https://deno.land/x/jssm@5.90.0";

const TrafficLight = jssm.sm`Red => Green => Yellow => Red;`;
```

Please note the version number at the end of the URL.  Whereas not required, it's good practice; without it, you'll get the current major, which if years later may have breaking changes.

&nbsp;

&nbsp;

## Loading locally

This is typically useful if you are bundling, or if you're modifying the library.  This way, you can get the local copy, rather than hitting the network, which might mean getting a local build, or just not leaning so heavily into `deno.land/x` for every automated build.

```typescript
import { sm } from "./dist/deno/jssm.deno-esm.js";

const TrafficLight = sm`Red => Green => Yellow => Red;`;
```

Or, the whole module:

```typescript
import * as jssm from "./dist/deno/jssm.deno-esm.js";
```

&nbsp;

&nbsp;

## Loading directly from Github

This is rarely useful, but could be if you want to validate a source against the official Github, or want to make certain that you're getting the current build regardless of middleman services, or if you're just new to the machine and want to try it out.

This might be useful in immediate diagnostic practice, but this is not recommended in the long term, as the target URL is not guaranteed by either the author or Github to be stable, and if this URL gets hit heavily GH can disable access:

```typescript
import { sm } from "https://raw.githubusercontent.com/StoneCypher/jssm/main/dist/deno/jssm.deno-esm.js";

const TrafficLight = sm`Red => Green => Yellow => Red;`;
```

Or, to bind the whole module,

```typescript
import * as jssm from "https://raw.githubusercontent.com/StoneCypher/jssm/main/dist/deno/jssm.deno-esm.js";

const TrafficLight = jssm.sm`Red => Green => Yellow => Red;`;
```
