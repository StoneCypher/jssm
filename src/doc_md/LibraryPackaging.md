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
const { sm } = require('jssm');


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





&nbsp;

## In the browser

Well, it depends?

If you're bundling something from node already, like React, Vue, or Angular,
then just pull it in there and treat it like the node solution above.

Raw javascript project?  You can either [grab the IIFE bundle manually](https://github.com/StoneCypher/jssm/blob/main/dist/jssm.es5.iife.js)
(277k single line of JS,) or just as easily [pull it from cdn](https://cdn.jsdelivr.net/npm/jssm/dist/jssm.es5.iife.min.js) (or [site](https://www.jsdelivr.com/package/npm/jssm)).

Of course, we don't want CDN in production, but that's a great way to just get
running.  That's what we used in the previous tutorial.