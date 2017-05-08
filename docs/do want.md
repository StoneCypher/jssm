also what do you want in a state machine api besides

- [ ] specifying the initial edges as 1-dir node edges,
    - [ ] weights,
    - [ ] names,
    - [ ] action names (edge names are unique, action names are unique-to-source,)
    - [ ] the probability of an edge

1. the ability to list
    1. a node's edges (in/out/both,)
    1. whether a node is terminal,
1. to specify for a graph
    1. min/max edge count,
    1. whether to tolerate islands,
    1. whether to links should be 1d/2d/either,
    1. whether the state machine is fixed (not implementing for now,)
    1. whether forcing (making a change outside the edge graph) is permitted (not implementing for now,)
    1. whether names are allowed|disallowed|optional,
    1. whether action names are allowed|disallowed|optional,
1. for non-fixed machines, (not implementing for now,)
    1. to add edges,
    1. to remove edges,
    1. to remove nodes (and thus all the related edges,)
    1. to have a sane way to validate afterwards
1. attached data,
    1. which is transactionally applied,
    1. which is available to all validation hooks,
1. validation hooks on
    1. walking an edge,
    1. entering/exiting a node,
    1. changing data (which can happen with or distinctly from a transition, but always atomically w/ validation),
1. notification hooks on
    1. any change,
    1. enter/exit a node,
    1. walk an edge,
    1. execute a named action,
    1. data change,
    1. init,
    1. non-matching event
1. the ability to generate
    1. flowchart representations
        1. prolly using viz.js (graphviz emscriptened to yerbaschmidt)
    1. uml statechart representations?
    1. sdl representations?
    1. nfa representations? (see comments below, thanks @patater)
    1. drakon representations?
    1. harel statecharts?
1. the ability to
    1. save a state machine state,
    1. load/create from a state machine state,
    1. validate an abstract state machine state,
    1. keep and rewind a state history (thanks @kz),
    1. autocreate an api (that is, action "melt" on machine auto-gets api method equiv `.melt()`)
    1. consume `.dfa` files?
    1. compare two state machines?
1. improved nature of states (all thanks burny who isn't on gh zomg)
    1. states as objects rather than strings
        1. makes inheritance easier
        1. makes heirarachy easier
        1. makes state-associated data easier (eg walking state now has frame#)
        1. makes underlying impl much harder
    1. state subtypes
    1. heirarchal states
        1. triggered by subordinate on transfer callback to superior
        1. "or polling"
    1. multiple concurrent states (keanu mind blown.gif)
1. for convenience,
    1. a fluent api for creation

difference between event and action: if action isn't handled, it's an error; if event, meh
