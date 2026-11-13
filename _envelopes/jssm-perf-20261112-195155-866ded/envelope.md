# jssm envelope: head 10ae1eeeeacca1460c0dcd8cd124d0f0b6354e6f vs base ab203e6dd25e3dd2cdee249ddaa1c082007d9527

6 interleaved samples/side on c8g.medium (medians).

| delta | base ops/s | head ops/s | case |
|---:|---:|---:|---|
| -17.9% | 619990 | 509203 | Rejected action, 100 calls by action |
| -10.3% | 42173 | 37812 | Compile `a -> b;` using sm |
| -5.6% | 48544 | 45828 | Compile `a -> b;` using .from |
| -5.2% | 47008 | 44556 | Blind cycle a basic-hooked traffic light 100 times by transition |
| -5.1% | 43858 | 41610 | Blind cycle a standard-transition hooked light by transition |
| -4.9% | 41529 | 39483 | Data-carrying basic hook, 100 cycles by transition |
| -3.3% | 18694 | 18071 | Kitchen sink (15 hooks) 100 times v2 |
| -1.6% | 43805 | 43100 | Blind cycle a main-transition hooked light by transition |
| -1.4% | 71648 | 70677 | Blind cycle a traffic light 100 times by transition |
| -1.3% | 42009 | 41467 | Cycle a force-transition hooked light 100 times by force_transition v2 |
| -1.0% | 77675 | 76905 | Blind cycle a traffic light 100 times by action |
| -1.0% | 42514 | 42103 | Blind cycle an any-transition traffic light 100 times by transition |
| -0.9% | 52007 | 51519 | Carry a named hook that cannot fire, 100 cycles by transition v2 |
| -0.8% | 50340 | 49952 | Post exit hook, 100 cycles by transition |
| -0.7% | 50861 | 50487 | Post basic hook, 100 cycles by transition |
| -0.7% | 51894 | 51548 | Carry an after hook (timer-only, cannot fire in dispatch), 100 cycles by transition |
| -0.6% | 42350 | 42080 | Blind cycle an exit hooked traffic light 100 times by transition |
| -0.5% | 51901 | 51632 | Post global action hook, 100 cycles by action |
| -0.5% | 50304 | 50043 | Post entry hook, 100 cycles by transition |
| -0.5% | 50768 | 50527 | Post basic hook, 100 cycles by action |
| -0.3% | 47538 | 47418 | Post named hook, 100 cycles by action |
| -0.1% | 42796 | 42758 | Blind cycle an enter hooked traffic light 100 times by transition |
| +1.0% | 35787 | 36131 | Cycle a forced transition tl 100 times by action v2 |
| +1.3% | 37034 | 37513 | Cycle a standard transition tl 100 times by action v2 |
| +1.6% | 34544 | 35102 | Blind cycle a basic-hooked traffic light 100 times by action |
| +2.8% | 36008 | 37011 | Blind cycle a global-action traffic light 100 times by action v2 |
| +3.3% | 32715 | 33794 | Blind cycle an exit hooked traffic light 100 times by action |
| +3.6% | 31224 | 32360 | Blind cycle a named-hooked traffic light 100 times by action v2 |
| +5.8% | 36288 | 38387 | Cycle a main transition tl 100 times by action v2 |
| +6.0% | 33410 | 35431 | Blind cycle an enter hooked traffic light 100 times by action |
| +6.9% | 36301 | 38819 | Blind cycle an any-action traffic light 100 times by action |
