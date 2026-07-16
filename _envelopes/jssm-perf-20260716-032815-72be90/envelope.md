# jssm envelope: head 67890bfa17d62b64db3b71beacc4ecb7e03b0900 vs base 708d518ccea81d6bfcb7663ba479cfea3876b6ce

5 interleaved samples/side on c8g.medium (medians).

| delta | base ops/s | head ops/s | case |
|---:|---:|---:|---|
| -2.9% | 47977 | 46584 | Compile `a -> b;` using sm |
| -0.8% | 29489 | 29247 | Blind cycle a named-hooked traffic light 100 times by action v2 |
| -0.2% | 37576 | 37494 | Blind cycle an any-transition traffic light 100 times by transition |
| -0.1% | 32468 | 32432 | Blind cycle a basic-hooked traffic light 100 times by action |
| -0.1% | 44455 | 44410 | Post basic hook, 100 cycles by action |
| +0.1% | 33597 | 33634 | Cycle a standard transition tl 100 times by action v2 |
| +0.1% | 38820 | 38873 | Blind cycle a standard-transition hooked light by transition |
| +0.2% | 30681 | 30730 | Blind cycle an exit hooked traffic light 100 times by action |
| +0.2% | 57310 | 57413 | Blind cycle a traffic light 100 times by transition |
| +0.2% | 43898 | 43990 | Post basic hook, 100 cycles by transition |
| +0.2% | 34146 | 34230 | Cycle a main transition tl 100 times by action v2 |
| +0.3% | 32503 | 32589 | Cycle a forced transition tl 100 times by action v2 |
| +0.3% | 62894 | 63076 | Blind cycle a traffic light 100 times by action |
| +0.3% | 41932 | 42054 | Post named hook, 100 cycles by action |
| +0.4% | 44856 | 45029 | Carry an after hook (timer-only, cannot fire in dispatch), 100 cycles by transition |
| +0.4% | 37294 | 37453 | Blind cycle an exit hooked traffic light 100 times by transition |
| +0.5% | 39500 | 39682 | Blind cycle a main-transition hooked light by transition |
| +0.5% | 37169 | 37346 | Cycle a force-transition hooked light 100 times by force_transition v2 |
| +0.5% | 45023 | 45242 | Carry a named hook that cannot fire, 100 cycles by transition v2 |
| +0.5% | 17777 | 17867 | Kitchen sink (15 hooks) 100 times v2 |
| +0.6% | 41237 | 41467 | Blind cycle a basic-hooked traffic light 100 times by transition |
| +0.6% | 33567 | 33773 | Blind cycle a global-action traffic light 100 times by action v2 |
| +0.6% | 36787 | 37024 | Data-carrying basic hook, 100 cycles by transition |
| +0.7% | 43952 | 44254 | Post exit hook, 100 cycles by transition |
| +0.8% | 31443 | 31687 | Blind cycle an enter hooked traffic light 100 times by action |
| +0.9% | 51436 | 51895 | Compile `a -> b;` using .from |
| +1.0% | 44675 | 45133 | Post global action hook, 100 cycles by action |
| +1.1% | 37693 | 38090 | Blind cycle an enter hooked traffic light 100 times by transition |
| +1.1% | 33817 | 34184 | Blind cycle an any-action traffic light 100 times by action |
| +1.1% | 44114 | 44612 | Post entry hook, 100 cycles by transition |
| +38.5% | 526272 | 729080 | Rejected action, 100 calls by action |
