# Deno

I was not able to make this work on Deno.

Originally, I tried pointing `deno.land` at the typescript source directory.
However, Deno requires file extensions in Typescript, which Typescript forbids.

Subsequently, I tried pointing `deno.land` at the es6 build directory.  However,
Deno requires extensions in Node, and Typescript refuses to emit them.

Afterwards, I tried loading the es5 minified CJS, because there would be no
file references in a single file.  However, this causes Deno to crash with a
stack overflow, on a relatively small file that works correctly in Netscape
Navigator 4 as well as current Chrome.  I have tried this against
`deno 1.23 on windows`, `deno 1.23 on ubuntu`, `deno 1.16 on ubuntu`, and
`deno 1.0 on ubuntu`, even when following the CJS instructions.

I really wanted this to be available to Deno, and it seems like it's one inch
from it, but I wasn't able to tie the loop.

I suspect that there is actually some way to pull this off, and that a
sufficiently domain-sophisticated person could probably one-sentence an answer.

***I would greatly appreciate assistance.***  However, I am not willing to
become Deno-centric, and I am not willing to use codemods to service non-deno
users.



&nbsp;

&nbsp;

## So why is it still up?

I can't find a deprecation mechanism.

I would appreciate advice.
