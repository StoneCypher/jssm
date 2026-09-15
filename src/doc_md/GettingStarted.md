# Getting Started

There's a tutorial on {@page WhatAreStateMachines.md what state machines are}
elsewhere; this page is on using this library.

Like many modern Javascript libraries, JSSM is available on NPM and from CDN.
As of 6.0 the formats are split across packages rather than bundled into one:

| You want | Install | What it is |
|---|---|---|
| `import` in modern node, modern browsers, or a bundler | `jssm` | The main package, an ES module.  Ships TypeScript typings. |
| `require()` in node or an older bundler | `jssm-commonjs` | A self-contained CommonJS build. |
| a plain `<script>` tag in a browser | `jssm-iife` | A self-contained browser global named `jssm`. |

So you should still be able to use the system you're used to, in whatever
environment you're used to — be that `import` or `require` or a `<script>` tag,
in node, browser, typescript, Deno, a bundler, whatever — you just pick the
package that matches, and it should ***Just Work*** &trade;.

This tutorial works from CDN.  The next tutorial goes over how to work with
various environments, builds, and so on.  There are also dedicated environment
pages for {@page Environments_Browser.md the browser} and
{@page Environments_Deno.md Deno} (which reads the npm packages directly — 6.0
dropped the separate `deno.land/x` build, and that page explains why).





&nbsp;

&nbsp;

# Just getting going from CDN

To start with, let's do things the sloppy, "just run already" way.  We'll load
the library directly in the HTML, from CDN.  A classic `<script>` tag wants the
browser-global build, which is the `jssm-iife` package:
```html
<!doctype html>
<html>

  <head>

    <script type="text/javascript"
            src="https://cdn.jsdelivr.net/npm/jssm-iife@6/dist/jssm.iife.js">
    </script>

  </head>

</html>
```

At this point, you can already play with the library, in the developer console.
The tag attaches one global, `jssm`, so it's `jssm.sm` — or
`const { sm } = jssm;` once at the top of your own script.

<div class="youtube-embed"><iframe src="//www.youtube.com/embed/hIezzLrVvRQ?html5=1" frameborder="0" allowfullscreen></iframe></div>





&nbsp;

&nbsp;

# Let's make it visible

First, we need a toy traffic light.  Here's some HTML structure:

```html
<!doctype html>
<html>

  <head>
    <title>Traffic light example</title>
  </head>

  <body>

    <table id="light" class="light_off">
      <tr><td id="red"><span></span></td></tr>
      <tr><td id="yellow"><span></span></td></tr>
      <tr><td id="green"><span></span></td></tr>
    </table>

  </body>

</html>
```

And a bit of CSS to get it to look just so:

```html
    <style type="text/css">

      #light    { border-collapse: collapse; }  /* don't separate cells */
      #light td { border: 2px solid #e3a31d; }  /* mildly darker orange border around cells */

      #light span {
        height        : 4em;              /* size the lightbulb */
        width         : 4em;              /* size the lightbulb */
        border        : 2px solid black;  /* looks weird without an edge */
        border-radius : 50%;              /* make it round */
        display       : inline-block;     /* so that it will lay out margins correctly */
        margin        : 0.5em;            /* space around bulb */
      }

      #red    span { background-color: #300; } /* very dark when not lit */
      #yellow span { background-color: #220; }
      #green  span { background-color: #030; }

      .light_red    #red    span { background-color: #F00; } /* bright when lit */
      .light_yellow #yellow span { background-color: #EE0; }
      .light_green  #green  span { background-color: #0F0; }

      td { background-color: #FCC550; } /* that yellow-slightly-orange frame */

    </style>
```

We'll also add a bit of Javascript to make it usable.

```html
<script type="text/javascript">

  function light(what) {
    if (['red','yellow','green','off'].includes(what)) {
      document.getElementById('light').className = `light_${what}`;
    }
  }

</script>
```

End result should look a bit like this:

<div class="youtube-embed"><iframe src="//www.youtube.com/embed/qG5UQs13kBo?html5=1" frameborder="0" allowfullscreen></iframe></div>





&nbsp;

&nbsp;

# Wiring up the machine to the UI

Next, let's have the machine and the UI interact a bit.

If you pull the CSS out from the previous example into a file called `tl.css`,
and self-host the library instead of loading it from CDN (copy
`node_modules/jssm-iife/dist/jssm.iife.js` next to your page), you're left with
this:

```html
<!doctype html>
<html>

  <head>

    <link rel="stylesheet" type="text/css" href="tl.css" />

    <script type="text/javascript"
            src="./jssm.iife.js"></script>

    <script type="text/javascript">

      function set_color(what) {
        if (['red','yellow','green','off'].includes(what)) {
          document.getElementById('light').className = `light_${what}`;
        }
      }

      window.onload = () => {

        const traffic_light = sm`
          Red 'next' => Green 'next' => Yellow 'next' => Red;
        `;

      };

    </script>

  </head>

</html>
```

We'll add a simple "hook," which means the state machine will call functions you
provide when things happen.  In this case, we'll call the hook whenever any
state is entered.

Hooks take an object which includes, among other things, the state being
transitioned `from` and the state being transitioned `to`.  In this example, the
latter is exactly what we want, so, we'll just destructure it right off.

```javascript
traffic_light.hook_any_transition( ({ to }) => set_color(to) );
```

We will also, since we're working in the console for now, we'll export the
variable onto `window` so that we can use it easily in the console.

```javascript
window.tl = traffic_light;
```

Both these lines go at the end of `onload`, which now looks like this:

```javascript
window.onload = () => {

  const traffic_light = window.jssm.sm`
    red 'next' => green 'next' => yellow 'next' => red;
  `;

  traffic_light.hook_any_transition( ({to}) => set_color(to) );
  window.tl = traffic_light;

};
```

And now, they're linked.

<div class="youtube-embed"><iframe src="//www.youtube.com/embed/1Js2-AYaXus?html5=1" frameborder="0" allowfullscreen></iframe></div>





&nbsp;

&nbsp;

# Adding buttons to the UI

Of course, we wouldn't have users use the console; let's have some widgets wired
up.  Also, while we're at it, let's decide what to do about the light being
`off`.

Realistically, a light can turn off - the power can go out, they can down it for
maintenance, it might be new, et cetera; so, a practical machine should cover
being turned off.  Let's also.

Our new machine:

```javascript
const traffic_light = sm`
  off 'enable' -> red;
  red 'next' => green 'next' => yellow 'next' => red;
  [red yellow green] 'disable' -> off;
`;
```

We've a convention here.  Putting several names in `[]` square brackets makes a
"list," and when we make an arrow from the list, it actually makes a distinct
arrow for each element in the list.  So, the line

```fsl
[red yellow green] 'disable' -> off;
```

actually makes *three* transitions, and gives them all the same action.

The state machine will now start in `off`, because unless you specify otherwise,
the first named state is assumed to be the starting state.

We'll need to add two labelled containers to our UI - one for the available
actions, and one for the available transitions.  Those might initially just be
empty `<div>`s, and look like this:

```html
<div id="avail_actions"></div>
<div id="avail_transitions"></div>
```

Which actions and transitions are available at any given time on this machine
change, and we don't want to have to manage knowing what's going on, so we'll
just dynamically create and destroy whatever the machine says is available
currently, on each transition.

To update the action buttons, list the actions exiting the current state with
`machine.list_exit_actions()`:

```javascript
function update_action_buttons() {

  const container = document.getElementById('avail_actions');
  container.innerHTML = '';

  traffic_light.list_exit_actions().forEach( ea => {
    const newButton     = document.createElement('button');
    newButton.innerHTML = ea;
    newButton.onclick   = () => traffic_light.action(ea);
    container.appendChild(newButton);
  } );

}
```

And almost identical, to update the transition buttons, list the relevant
exiting transitions with `machine.list_exits()`:

```javascript
function update_transition_buttons() {

  const container = document.getElementById('avail_transitions');
  container.innerHTML = '';

  traffic_light.list_exits().forEach( et => {
    const newButton     = document.createElement('button');
    newButton.innerHTML = et;
    newButton.onclick   = () => traffic_light.action(et);
    container.appendChild(newButton);
  } );

}
```

Finally, we call both updates in an entry hook, as well as when the
webpage is being set up initially:

```javascript
  traffic_light.hook_entry( () => {
    update_action_buttons();
    update_transition_buttons();
  } );
```

```javascript
window.onload = () => {
  // ...
  update_action_buttons();
  update_transition_buttons();
};
```
