# jssm envelope: head c9975786a5317d7bb58a883f201598072c4a5526 vs base eafe53fa586ec23eda9d5422d4220dc5d3f969d7

5 interleaved samples/side on c8g.medium (medians).

| delta | base ops/s | head ops/s | case |
|---:|---:|---:|---|
| -7.3% | 44983 | 41679 | Data-carrying basic hook, 100 cycles by transition |
| -7.2% | 40610 | 37690 | Cycle a main transition tl 100 times by action v2 |
| -6.5% | 39912 | 37335 | Blind cycle a global-action traffic light 100 times by action v2 |
| -6.3% | 40322 | 37772 | Blind cycle an any-action traffic light 100 times by action |
| -5.7% | 36791 | 34701 | Blind cycle an enter hooked traffic light 100 times by action |
| -5.6% | 35559 | 33563 | Blind cycle an exit hooked traffic light 100 times by action |
| -5.5% | 47902 | 45247 | Blind cycle a main-transition hooked light by transition |
| -5.1% | 37618 | 35697 | Blind cycle a basic-hooked traffic light 100 times by action |
| -5.0% | 33814 | 32137 | Blind cycle a named-hooked traffic light 100 times by action v2 |
| -4.6% | 44168 | 42141 | Blind cycle an enter hooked traffic light 100 times by transition |
| -3.8% | 43719 | 42057 | Cycle a force-transition hooked light 100 times by force_transition v2 |
| -3.5% | 36926 | 35645 | Cycle a forced transition tl 100 times by action v2 |
| -3.1% | 43931 | 42562 | Blind cycle an any-transition traffic light 100 times by transition |
| -3.0% | 43939 | 42639 | Blind cycle an exit hooked traffic light 100 times by transition |
| -2.7% | 52268 | 50863 | Compile `a -> b;` using .from |
| -1.9% | 48457 | 47530 | Blind cycle a basic-hooked traffic light 100 times by transition |
| -1.9% | 53503 | 52484 | Carry an after hook (timer-only, cannot fire in dispatch), 100 cycles by transition |
| -1.8% | 53643 | 52656 | Carry a named hook that cannot fire, 100 cycles by transition v2 |
| -1.7% | 732013 | 719621 | Rejected action, 100 calls by action |
| -1.6% | 19124 | 18811 | Kitchen sink (15 hooks) 100 times v2 |
| -1.6% | 52144 | 51326 | Post global action hook, 100 cycles by action |
| -1.1% | 37385 | 36990 | Cycle a standard transition tl 100 times by action v2 |
| -0.6% | 78492 | 78039 | Blind cycle a traffic light 100 times by action |
| +0.1% | 50793 | 50862 | Post basic hook, 100 cycles by action |
| +0.5% | 47332 | 47584 | Post named hook, 100 cycles by action |
| +0.6% | 45169 | 45436 | Compile `a -> b;` using sm |
| +0.9% | 71510 | 72139 | Blind cycle a traffic light 100 times by transition |
| +1.0% | 43683 | 44112 | Blind cycle a standard-transition hooked light by transition |
| +1.4% | 49877 | 50578 | Post entry hook, 100 cycles by transition |
| +1.7% | 50291 | 51144 | Post basic hook, 100 cycles by transition |
| +2.6% | 49319 | 50584 | Post exit hook, 100 cycles by transition |
