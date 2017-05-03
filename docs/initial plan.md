```
.create({
 ?name  : '',
 ?state : '',
 ?data  : {},
 ?nodes : [''],
 ?valid : () || [()] => a,r ,
  edges : [
    { from       : '',
      to         : '',
     ?likelihood : 0.0 .. 1.0,
     ?name       : '',
     ?valid      : () || [()] => a,r
    }
  ],

 ?locked    : bool = false,
 ?min_exits : integer,
 ?max_exits : integer

})

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
