
self-self transitions are valid

multiple transitions from a->b are not valid

all data changes go to .nextData for validation on next transition (self-self transition if in-place)

```
.create({
 ?name  : '',
  state : '',
 ?data  : {},
 ?nodes : [''],
 ?valid : () || [()] => a,r ,
  edges : [
    { from       : '',
      to         : '',
     ?name       : '',
     ?valid      : () || [()] => a,r,  // validate this edge's transition; usually about data
     ?likelihood : 0.0 .. 1.0,         // for stoch modelling
     ?usual      : ''                  // most common exit, for graphing; likelihood overrides
    }
  ],

//?locked        : bool = true,
 ?min_exits     : integer,
 ?max_exits     : integer,
 ?allow_islands : false,
 ?allow_force   : false

})



// .node.add_edge
// .node.remove_edge
// .node.remove
// .node.finalizeChanges

.transitions()                                    -> [{ to: '', ?name: '' }]
.isTerminal() = () => .transitions().length === 0 -> bool

.hook.changing_from(state, f)                 -> accept, reject
.hook.changing_to(nextState, f)               -> accept, reject
.hook.changing_from_to(fromState, toState, f) -> accept, reject
.hook.changing(f)                             -> accept, reject

.hook.changed_from(wasState, f)
.hook.changed_to(state, f)
.hook.changed_from_to(wasState, state, f)
.hook.changed(f)

.hook.data_changing(from, to/*, diff */) -> accept, reject
.hook.data_changed(to/*, diff */)
```
