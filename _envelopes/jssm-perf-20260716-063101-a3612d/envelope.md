# jssm envelope: head 7b1b062b47c2dbad7468e7a9b70ce8483bc45823 vs base 0758e7411fa79cd4f721e5a9c6b46492392cb299

5 interleaved samples/side on c8g.medium (medians).

| delta | base ops/s | head ops/s | case |
|---:|---:|---:|---|
| -0.1% | 43758 | 43697 | Compile `a -> b;` using sm |
| +0.4% | 48596 | 48811 | Compile `a -> b;` using .from |
| +5.6% | 17716 | 18716 | Kitchen sink (15 hooks) 100 times v2 |
| +8.8% | 29356 | 31947 | Blind cycle a named-hooked traffic light 100 times by action v2 |
| +9.5% | 32513 | 35606 | Cycle a forced transition tl 100 times by action v2 |
| +10.0% | 30541 | 33590 | Blind cycle an exit hooked traffic light 100 times by action |
| +10.3% | 31525 | 34770 | Blind cycle an enter hooked traffic light 100 times by action |
| +10.3% | 33402 | 36846 | Cycle a standard transition tl 100 times by action v2 |
| +10.7% | 34101 | 37747 | Blind cycle an any-action traffic light 100 times by action |
| +10.8% | 33595 | 37234 | Blind cycle a global-action traffic light 100 times by action v2 |
| +11.2% | 33852 | 37636 | Cycle a main transition tl 100 times by action v2 |
| +11.6% | 37396 | 41716 | Cycle a force-transition hooked light 100 times by force_transition v2 |
| +11.9% | 31953 | 35754 | Blind cycle a basic-hooked traffic light 100 times by action |
| +12.6% | 41661 | 46907 | Blind cycle a basic-hooked traffic light 100 times by transition |
| +12.7% | 37987 | 42817 | Blind cycle an enter hooked traffic light 100 times by transition |
| +13.0% | 37471 | 42347 | Blind cycle an any-transition traffic light 100 times by transition |
| +13.0% | 39370 | 44500 | Blind cycle a main-transition hooked light by transition |
| +13.3% | 41838 | 47410 | Post named hook, 100 cycles by action |
| +13.4% | 44299 | 50246 | Post basic hook, 100 cycles by action |
| +13.5% | 45287 | 51418 | Post global action hook, 100 cycles by action |
| +13.9% | 36711 | 41801 | Data-carrying basic hook, 100 cycles by transition |
| +13.9% | 45285 | 51593 | Carry a named hook that cannot fire, 100 cycles by transition v2 |
| +14.3% | 38398 | 43884 | Blind cycle a standard-transition hooked light by transition |
| +14.4% | 43825 | 50136 | Post exit hook, 100 cycles by transition |
| +14.7% | 37300 | 42787 | Blind cycle an exit hooked traffic light 100 times by transition |
| +15.9% | 43543 | 50458 | Post entry hook, 100 cycles by transition |
| +16.2% | 44881 | 52140 | Carry an after hook (timer-only, cannot fire in dispatch), 100 cycles by transition |
| +17.7% | 43047 | 50655 | Post basic hook, 100 cycles by transition |
| +23.7% | 62869 | 77745 | Blind cycle a traffic light 100 times by action |
| +25.0% | 57653 | 72046 | Blind cycle a traffic light 100 times by transition |
| +39.8% | 519737 | 726602 | Rejected action, 100 calls by action |
