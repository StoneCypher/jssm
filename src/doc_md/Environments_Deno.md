# Deno

(Looking for a different environment?  See {@page Environments_Browser.md the browser page}.)

Deno reads npm packages directly, so jssm needs no special build and no separate registry entry.  Use an `npm:` specifier:

```typescript
import { sm } from "npm:jssm@6";

const TrafficLight = sm`Red => Green => Yellow => Red;`;
```

Or bind the whole module:

```typescript
import * as jssm from "npm:jssm@6";

const TrafficLight = jssm.sm`Red => Green => Yellow => Red;`;
```

Pin the major, as above.  Without it you will follow whatever the current major is, which may carry breaking changes later.

&nbsp;

&nbsp;

## With a `deno.json`

If you would rather write a bare specifier, map it once:

```json
{
  "imports": {
    "jssm": "npm:jssm@6"
  }
}
```

```typescript
import { sm } from "jssm";
```

Deno also reads `package.json` directly, so an existing Node project generally works without changes.

&nbsp;

&nbsp;

## A note on `deno.land/x`

Older documentation pointed at `https://deno.land/x/jssm@5.89.1/jssm.js`, and jssm shipped a dedicated Deno build to feed it.

That build is gone as of v6, for two reasons.  It had become a byte-for-byte copy of the ESM build — Deno no longer needs anything special — and `deno.land/x` is now **read-only**, so no new module or version can be published there by anyone.

Existing pins keep working.  `deno.land/x/jssm@5.89.1` remains available and immutable, so nothing that already imports it breaks.  But it is frozen at that version forever; use `npm:jssm` for anything current.

The successor registry is [JSR](https://jsr.io).  jssm does not publish there yet — see StoneCypher/fsl#1970.
