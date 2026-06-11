# jssm scaling benchmark results

Generated: 2026-06-11T20:23:15.426Z  
jssm version: 5.143.0

## transition()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |      179784 |
| chain-50    |      150759 |
| chain-200   |      144941 |
| chain-1000  |      119426 |
| dense-10    |      171620 |
| dense-50    |      127966 |
| dense-200   |       81408 |
| hub-50      |      159836 |
| hub-200     |      138761 |
| hooked-200  |       48597 |
| messy-1000  |      161726 |
| messy-5000  |      168198 |

## edges_between()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |      145515 |
| chain-50    |      164521 |
| chain-200   |      143823 |
| chain-1000  |      102227 |
| dense-10    |       74777 |
| dense-50    |       15366 |
| dense-200   |        5532 |
| hub-50      |       43260 |
| hub-200     |       13738 |
| hooked-200  |       12443 |
| messy-1000  |      109144 |
| messy-5000  |      115205 |

## has_state()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |    14997809 |
| chain-50    |    14122002 |
| chain-200   |    14560439 |
| chain-1000  |    14439204 |
| dense-10    |    12162345 |
| dense-50    |    11943303 |
| dense-200   |    11599651 |
| hub-50      |    13842090 |
| hub-200     |    11810439 |
| hooked-200  |    10700991 |
| messy-1000  |    11702390 |
| messy-5000  |    14378775 |

## construct()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |        8015 |
| chain-50    |        2098 |
| chain-200   |         589 |
| chain-1000  |         121 |
| dense-10    |        1509 |
| dense-50    |          42 |
| dense-200   |           0 |
| hub-50      |        1459 |
| hub-200     |         390 |
| hooked-200  |         283 |
| messy-1000  |          40 |
| messy-5000  |           4 |
