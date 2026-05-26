# jssm scaling benchmark results

Generated: 2026-05-26T18:40:08.621Z  
jssm version: 5.128.0

## transition()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |      137705 |
| chain-50    |      112111 |
| chain-200   |       89493 |
| chain-1000  |       75764 |
| dense-10    |      102472 |
| dense-50    |       73531 |
| dense-200   |       57512 |
| hub-50      |       69399 |
| hub-200     |       68880 |
| hooked-200  |       10624 |
| messy-1000  |       60156 |
| messy-5000  |       71413 |

## edges_between()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |       52628 |
| chain-50    |       17257 |
| chain-200   |        4317 |
| chain-1000  |        1212 |
| dense-10    |        6905 |
| dense-50    |         291 |
| dense-200   |          11 |
| hub-50      |        6683 |
| hub-200     |        2290 |
| hooked-200  |        2621 |
| messy-1000  |         307 |
| messy-5000  |          21 |

## has_state()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |     9646313 |
| chain-50    |     8449577 |
| chain-200   |    10390372 |
| chain-1000  |    13466981 |
| dense-10    |    11980982 |
| dense-50    |    13721568 |
| dense-200   |     5249840 |
| hub-50      |    11855610 |
| hub-200     |     9304001 |
| hooked-200  |    10867239 |
| messy-1000  |    14419948 |
| messy-5000  |    13945619 |

## construct()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |        5456 |
| chain-50    |        1968 |
| chain-200   |         359 |
| chain-1000  |          93 |
| dense-10    |         917 |
| dense-50    |          23 |
| dense-200   |           0 |
| hub-50      |         567 |
| hub-200     |         170 |
| hooked-200  |         133 |
| messy-1000  |          13 |
| messy-5000  |           2 |
