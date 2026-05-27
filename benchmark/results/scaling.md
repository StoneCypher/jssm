# jssm scaling benchmark results

Generated: 2026-05-27T06:08:37.322Z  
jssm version: 5.128.0

## transition()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |      123781 |
| chain-50    |      126002 |
| chain-200   |      110200 |
| chain-1000  |       92061 |
| dense-10    |      120381 |
| dense-50    |       92515 |
| dense-200   |       69732 |
| hub-50      |      122397 |
| hub-200     |      112975 |
| hooked-200  |       17493 |
| messy-1000  |      117393 |
| messy-5000  |      115447 |

## edges_between()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |      118473 |
| chain-50    |       84628 |
| chain-200   |      120386 |
| chain-1000  |       86476 |
| dense-10    |       54229 |
| dense-50    |       11718 |
| dense-200   |        4150 |
| hub-50      |       37970 |
| hub-200     |       11704 |
| hooked-200  |       11135 |
| messy-1000  |      104086 |
| messy-5000  |      118097 |

## has_state()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |    13093603 |
| chain-50    |    11065074 |
| chain-200   |    12433066 |
| chain-1000  |     9742003 |
| dense-10    |     8397462 |
| dense-50    |     9783412 |
| dense-200   |     9335030 |
| hub-50      |    11670644 |
| hub-200     |    11813390 |
| hooked-200  |    11942823 |
| messy-1000  |    13291286 |
| messy-5000  |    12120196 |

## construct()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |        5424 |
| chain-50    |        1382 |
| chain-200   |         276 |
| chain-1000  |          52 |
| dense-10    |         759 |
| dense-50    |          22 |
| dense-200   |           0 |
| hub-50      |        1060 |
| hub-200     |         284 |
| hooked-200  |         258 |
| messy-1000  |          25 |
| messy-5000  |           3 |
