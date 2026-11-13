# jssm envelope: head 10ae1eeeeacca1460c0dcd8cd124d0f0b6354e6f vs base ab203e6dd25e3dd2cdee249ddaa1c082007d9527

3 interleaved samples/side on c8g.medium (medians).

| delta | base ops/s | head ops/s | case |
|---:|---:|---:|---|
| -7.5% | 42758 | 39547 | Compile `a -> b;` using sm |
| -6.6% | 48868 | 45665 | Compile `a -> b;` using .from |
| -5.7% | 44331 | 41808 | Blind cycle a standard-transition hooked light by transition |
| -3.5% | 18792 | 18143 | Kitchen sink (15 hooks) 100 times v2 |
| -2.2% | 42476 | 41521 | Cycle a force-transition hooked light 100 times by force_transition v2 |
| -2.2% | 43047 | 42085 | Blind cycle an exit hooked traffic light 100 times by transition |
| -2.0% | 52816 | 51776 | Carry an after hook (timer-only, cannot fire in dispatch), 100 cycles by transition |
| -1.9% | 72596 | 71246 | Blind cycle a traffic light 100 times by transition |
| -1.7% | 33965 | 33388 | Blind cycle a named-hooked traffic light 100 times by action v2 |
| -1.3% | 39717 | 39196 | Cycle a standard transition tl 100 times by action v2 |
| -1.1% | 40819 | 40374 | Cycle a main transition tl 100 times by action v2 |
| -1.0% | 51386 | 50882 | Post basic hook, 100 cycles by transition |
| -1.0% | 50404 | 49924 | Post entry hook, 100 cycles by transition |
| -0.9% | 43353 | 42967 | Blind cycle an enter hooked traffic light 100 times by transition |
| -0.6% | 78095 | 77637 | Blind cycle a traffic light 100 times by action |
| -0.5% | 52039 | 51762 | Post global action hook, 100 cycles by action |
| -0.5% | 45197 | 44971 | Blind cycle a main-transition hooked light by transition |
| -0.5% | 52277 | 52022 | Carry a named hook that cannot fire, 100 cycles by transition v2 |
| -0.5% | 40360 | 40167 | Blind cycle a global-action traffic light 100 times by action v2 |
| -0.5% | 50709 | 50469 | Post exit hook, 100 cycles by transition |
| -0.4% | 40549 | 40375 | Data-carrying basic hook, 100 cycles by transition |
| -0.3% | 38287 | 38180 | Cycle a forced transition tl 100 times by action v2 |
| -0.3% | 36597 | 36505 | Blind cycle a basic-hooked traffic light 100 times by action |
| -0.2% | 45809 | 45733 | Blind cycle a basic-hooked traffic light 100 times by transition |
| -0.1% | 50601 | 50534 | Post basic hook, 100 cycles by action |
| -0.1% | 35644 | 35625 | Blind cycle an exit hooked traffic light 100 times by action |
| +0.4% | 42433 | 42587 | Blind cycle an any-transition traffic light 100 times by transition |
| +0.6% | 47091 | 47383 | Post named hook, 100 cycles by action |
| +1.3% | 36435 | 36906 | Blind cycle an enter hooked traffic light 100 times by action |
| +6.1% | 37842 | 40149 | Blind cycle an any-action traffic light 100 times by action |
| +35.7% | 518367 | 703209 | Rejected action, 100 calls by action |
