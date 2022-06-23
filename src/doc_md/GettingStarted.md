# Getting Started

There's a tutorial on {@page WhatAreStateMachines.md what state machines are}
elsewhere; this page is on using this library.

Like many modern Javascript libraries, JSSM is available in many builds, on NPM,
on Github Packages, and from CDN.  JSSM is packaged as an `es6 module` for
modern node, modern browsers, and packagers; as a `commonjs module` for node
back to 2018 and older bundlers; and as an `iife` for classic browsers.  JSSM
also ships with typescript support, and full documentation.

Generally, you should be able to use the system you're used to, in whatever
environment you're used to - be that `include` or `require` or a `<script>` tag,
in node, browser, typescript, deno, es6 environments, es5 environments, modern
stuff, ancient stuff, whatever - and it should ***Just Work*** &trade;.

This tutorial works from CDN.  The next tutorial goes over how to work with
various environments, builds, and so on.





&nbsp;

&nbsp;

# Just getting going from CDN

To start with, let's do things the sloppy, "just run already" way.  We'll load
the library directly in the HTML, from CDN.
```html
<!doctype html>
<html>

  <head>

    <script type="text/javascript"
            src="https://cdn.jsdelivr.net/npm/jssm/dist/jssm.es5.iife.min.js">
    </script>

  </head>

</html>
```

At this point, you can already play with the library, in the developer console.

<div class="youtube-embed"><iframe src="http://www.youtube.com/embed/hIezzLrVvRQ?html5=1" frameborder="0" allowfullscreen></iframe></div>





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

<div class="youtube-embed"><iframe src="http://www.youtube.com/embed/qG5UQs13kBo?html5=1" frameborder="0" allowfullscreen></iframe></div>





&nbsp;


&nbsp;

# Wiring up the machine to the UI

Next, let's have the machine and the UI interact a bit.

The first block of code, where we worked in the console, could be written like
this instead:

```javascript
const TrafficLight = window.jssm.sm`
  Red 'next' => Green 'next' => Yellow 'next' => Red;
`;
```

We'll add a simple "hook," which means the state machine will call functions you
provide when things happen.  In this case, we'll call the hook whenever any
state is entered.

```javascript
TrafficLight.hook_all_entry()
```



