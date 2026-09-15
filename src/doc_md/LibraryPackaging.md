# Lol, JavaScript library packaging

If you're new to the mess that is JS packaging, let's make it simple.  Ish.





&nbsp;

## Under Node.js

In the console, once, install the library:

```
npm install --save jssm
```

Now, to use it in your code:

```javascript
import { sm } from 'jssm';


// TL is a _T_raffic _L_ight
const TL = sm`
  Red 'next' => Green 'next' => Yellow 'next' => Red;
`;

TL.state();               // Red
TL.transition('Green');   // true
TL.state();               // Green
TL.transition('Red');     // false - green can't go to red, only yellow
TL.state();               // Green
TL.action('next');        // true
TL.state();               // Yellow
```

### If you need `require()`

The `jssm` package is ESM only as of 6.0.  It declares `"type": "module"`, and
its `exports` map offers one main build, `dist/jssm.es6.mjs`, with no separate
CommonJS entry.  The CommonJS build is published as its own package instead:

```
npm install --save jssm-commonjs
```

```javascript
const { sm } = require('jssm-commonjs');
```

That is the supported `require()` path, and it is what a CommonJS consumer
should install.  It is self-contained — it does not depend on the main package
— and the API is the same, so every example on this page works unchanged after
that one swap.

The 5.x `Machine` class lives behind a second entry, for code that constructed
machines with `new`:

```javascript
const { Machine } = require('jssm-commonjs/compat');
```





&nbsp;

## In the browser

Well, it depends?

If you're bundling something from node already, like React, Vue, or Angular,
then just pull it in there and treat it like the node solution above.

Raw javascript project?  Then you want the browser-global build, which as of
6.0 is its own package, `jssm-iife`.  The file you want is its only script,
`dist/jssm.iife.js` — one minified file that attaches the global `jssm`.
You can either `npm install jssm-iife` and copy that file out of
`node_modules`, or just as easily [pull it from cdn](https://cdn.jsdelivr.net/npm/jssm-iife@6/dist/jssm.iife.js)
(or [site](https://www.jsdelivr.com/package/npm/jssm-iife)).

(In 5.x this build shipped inside the `jssm` package as
`dist/jssm.es5.iife.js`.  The main package no longer carries it, so that path
404s on 6.x.)

Of course, we don't want CDN in production, but that's a great way to just get
running.  That's what we used in the previous tutorial.

Drawing the machine is a third package again, `jssm-viz`; see
{@page Visualization.md Visualization}.