# Fight yourself.

I'm going to assume you have `node` installed already.  If not, go read a thing and install it.  Come back when you're done.

Your roles:

1. Developer
2. Local user, or lUser for short
3. Devops.

The developer will write the initial function.  

The lUser will find creative ways to use it incorrectly.  When stuck, the lUser will just add a bug to the function (try to do this less often.)  

The developer will then come in, add tests that catch the situation, then modify the function to prevent the problem.

Devops is a rare role.  It involves automation.  It makes robots do your job for you.  It makes testing far, far less painful.

----

&nbsp;

&nbsp;

# Setting up the env

You begin as `developer`.  We'll set up the environment.

Go make a repo on github for `learning_testing` or something like that.  We use `github actions` here, so you *should* do this from `github` at the get go, not some alternative like gitlab, where you'll need to start converting my instructions.  It's fine to be on gitlab, but learn where the instructions were written, then convert, not all at once.

[I'm making one alongside the tutorial, to make sure my instructions are only somewhat bullshit.](https://github.com/StoneCypher/tutorial_learn_testing)

When you create the repo, add the README, and set `.gitgnore` to node.  License is up to you, but cool kids use MIT.  If your account is free, make it public so that you still have access to actions.  If your account is paid, do what you like about privacy.

Now pull that repo locally.  There's your dev env.

Now pull up a console and inhabit that directory.  All remaining instructions assume you're there.

Notice there's a file inside called `.gitignore`.  It's there because you created it when creating the repo, and it's full of common sense defaults for a `node` style environment.  That prevents you from committing your installed modules, and other stuff that doesn't belong in a repo.  Other files you don't want ever committed can be added there.  We'll do that for the coverage stuff later.

We'll start with an `npm` project.

    npm init
    (fill out questions as you see fit; i would set version to 0.1.0 but you do you)

I don't know how new you are, but what `npm init` actually does is write a config to disk called `package.json`.  We're gonna use that a lot here.  On windows, `type package.json`.  On Mac, linux, or windows git bash, `cat package.json`.  Those should display the contents of the file.  It should look like this:

Cool.  We have an empty project.  We'll need to `install` it.

    npm install
    git add . && git commit -m "0.1.0 npm init and npm install" && git push origin


`npm install` reads that config, makes a directory called `node_modules` that all the installed libraries live in, installs any that the project calls for (currently none,) validates some stuff, runs any scripts it was told to (also currently none,) and bails.

----

&nbsp;

&nbsp;

# Test rig time

Now, set up a test rig.  Doesn't really matter which one.  If you're on some platform and it has an integrated testing library, eg `vite` and `vitest` or whatever, use that.  Otherwise, fuck it, `jest` isn't very good, but it's easy to get running, so get in, kid, we're using `jest`.

    npm install --save-dev jest

I'm also just gonna provide a `jest` config to save time, because it's not very important and I don't feel like writing a `jest` tutorial right now.  You can actually use `jest` entirely without a config; it has reasonable defaults.  But, I wanted you to see what a regular one looks like.

    module.exports = {
    
      testEnvironment            : 'node',
    
      moduleFileExtensions       : ['js'],
      coveragePathIgnorePatterns : ["/node_modules/", "/src/js/tests/"],
      testMatch                  : ['**/*.spec.js'],
    
      verbose                    : false,
      collectCoverage            : true,
      coverageDirectory          : "coverage/spec/",
    
      coverageThreshold : {
        global : {
          branches   : 5,
          functions  : 5,
          lines      : 5,
          statements : 5,
        },
      },
    
      collectCoverageFrom: ["src/js/**/.js"],
    
      reporters: [
    
        ['default',             {}],
    
        ['jest-json-reporter2', {
          outputDir: './coverage/spec',
          outputFile: 'metrics.json',
          fullOutput: false 
        }]
    
      ]
    
    };

Explaining the config, in short:

`testenvironment: node` means "Put the standard `node` globals in reach when testing."

`coveragePathIgnorePatterns` is there to prevent `jest` from trying to test your libraries, or to test your tests.

`testMatch` is our choice of filename pattern, by which `jest` can tell that this specific js file is a test file.  `**` means "any subdirectory or chain of subdirectories."  `**/*.spec.js` says "any file at any depth from here, whose name ends `.spec.js`."  In my own repos, I sometimes have different kinds of tests, and keep them under different extension collections this way.

> Neckbeard sidebar: `foo.spec.js`, and unit vs specification
>
> Why is it called `spec`?
>
> People think this is "unit testing," and they will call it that, and expect it to mean this.  This is even called a "unit testing tool."
>
> That's bullshit.  There's no unit being tested here.  This is "specification testing."
>
> A unit is when an entire device has been described that's exchangeable, and you want to verify the compatability standard.  If you're a car maker, and there's a standard set of plugs to hook up a radio, the unit would be the set of signals those plugs can send and receive.
>
> It's a unit testing tool because it could test a unit.  We're not using it that way.  We're writing specs.  If you bash something with a rock or a crowbar, you're "hammering."

The `coverage` stuff gives you the tools to see which of your code is and is not being tested.  This is really important.  We'll come back to this.

The `coverageThreshold`s are ridiculous.  They say you pass if just five percent of your code is tested.  In my own code, I have those set to ninety.  I always run at 100% coverage, but if it's non-passing at 100 then it's hard to develop, because the code you're in the middle of writing breaks the tests.  I cranked it way down to 5% so that it won't blow up constantly while you're getting started.  Once your coverage is higher, you should increase these numbers.

The reporters - default is the one in console that's giving you that nice little ASCII table, and `jest-json-reporter2` also writes coverage numbers into the coverage directory.  It's a pain in the ass to get multiple reporters running in jest in parallel, so just leave that be.

Incidentally, we need to install that reporter.

    npm install --save-dev jest-json-reporter2

In theory, your testing environment is now complete.  You can pretty much just install those two libraries and copy pasta that config, and you're in a reasonable state to go, in the future.

----

&nbsp;

&nbsp;

# Write some damn code

You continue as `developer`.

Now, write a simple function.  I mean simple.  Just return the square of the number, or something like that.

    function square(x) { return x*x; }

    export { square };

Simple enough, right?

Now, the layout of our source and our filename doesn't technically really matter, but for the configs we're doing it has to match whatever the configs say.  So for this tutorial, make a directory `./src/js`, and save the code in there as `index.js`.

----

&nbsp;

&nbsp;

# Almost to the first goal: a running test

So, cool, we're nearly there, it turns out.  We just need a simple test, to test our beans.

