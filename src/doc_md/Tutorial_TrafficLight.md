# Tutorial: A four-state traffic light

A short walkthrough that builds a four-state traffic light from scratch:
the three colors plus an **Off** state.  By the end you will have used
all three of jssm's arrow types (`->`, `=>`, `~>`), named actions, and
the array-notation shortcut for collapsing repeated edges.

At any time, you can take the code and put it into the
[graph explorer](https://stonecypher.github.io/jssm-viz-demo/graph_explorer.html)
to mess with it as you see fit.



&nbsp;

&nbsp;

## 0: Lights always have an off state

Our light will start in the **Off** `state`, with the ability to switch to
the **Red** `state`.

Since that's a normal, not-notable thing, we'll just make it a regular
`-> legal transition`.

```fsl
Off -> Red;
```

We will give that `transition` an `action`, and call it **TurnOn**.

```fsl
Off 'TurnOn' -> Red;
```

So far, our machine is simple:

![](https://raw.githubusercontent.com/StoneCypher/jssm/main/src/assets/traffic%20light%20quick%20start%20tutorial/Off%20To%20Red.png)



&nbsp;

&nbsp;

## 1: Traffic lights have a three-color cycle

The main path of a traffic light is cycling from **Green** to **Yellow**,
then to **Red**, then back again.  Because this is the main path, we'll
mark these steps `=> main transition`s.

```fsl
Off 'TurnOn' -> Red => Green => Yellow => Red;
```

We will give those all the same action name, **Proceed**, indicating "next
color" without needing to know what we're currently on.

```fsl
Off 'TurnOn' -> Red 'Proceed' => Green 'Proceed' => Yellow 'Proceed' => Red;
```

Machine's still pretty simple:

![](https://raw.githubusercontent.com/StoneCypher/jssm/main/src/assets/traffic%20light%20quick%20start%20tutorial/Off%20To%20RGY.png)



&nbsp;

&nbsp;

## 2: Traffic lights can be shut down

We'd also like to be able to turn this light back off.  Because that's
expected to be a rarity, we'll require that it be a `~> forced transition`.

We could write

```fsl
Off 'TurnOn' -> Red 'Proceed' => Green 'Proceed' => Yellow 'Proceed' => Red;
Red ~> Off;
Yellow ~> Off;
Green ~> Off;
```

But that takes a lot of space even with this short list, so, instead we'll
use the array notation

```fsl
Off 'TurnOn' -> Red 'Proceed' => Green 'Proceed' => Yellow 'Proceed' => Red;
[Red Yellow Green] ~> Off;
```

And we'd like those all to have the action **TurnOff**, so

```fsl
Off 'TurnOn' -> Red 'Proceed' => Green 'Proceed' => Yellow 'Proceed' => Red;
[Red Yellow Green] 'TurnOff' ~> Off;
```

Machine's still not too bad:

![](https://raw.githubusercontent.com/StoneCypher/jssm/main/src/assets/traffic%20light%20quick%20start%20tutorial/Off%20To%20From%20RGY.png)



&nbsp;

&nbsp;

## What's next

That's the bulk of the language.  There are other features (hooks,
validators, styling, history, data) but you now know how to write a state
machine.

- [Tutorial: building an ATM state machine](Tutorial_ATM.md) — a longer
  walkthrough that exercises more of the language
- [Language reference](LanguageReference.md) — the full DSL
- [Catalog of example machines](ExampleMachines.md)
- [Generated API reference](https://stonecypher.github.io/jssm/docs/)
