# jssm scaling benchmark results

Generated: 2026-05-28T03:38:16.427Z  
jssm version: 5.132.0

## transition()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |      165885 |
| chain-50    |      174833 |
| chain-200   |      146229 |
| chain-1000  |      109687 |
| dense-10    |      105256 |
| dense-50    |       84456 |
| dense-200   |       59575 |
| hub-50      |      120839 |
| hub-200     |      101875 |
| hooked-200  |       38965 |
| messy-1000  |      123089 |
| messy-5000  |      120637 |

## edges_between()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |      126096 |
| chain-50    |      120781 |
| chain-200   |       96495 |
| chain-1000  |       89424 |
| dense-10    |       65667 |
| dense-50    |       16845 |
| dense-200   |        4153 |
| hub-50      |       34683 |
| hub-200     |       10362 |
| hooked-200  |       10338 |
| messy-1000  |       76878 |
| messy-5000  |       91870 |

## has_state()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |    11922603 |
| chain-50    |    14164988 |
| chain-200   |    13016632 |
| chain-1000  |    13818641 |
| dense-10    |    12306044 |
| dense-50    |    15980950 |
| dense-200   |    16254984 |
| hub-50      |    15083097 |
| hub-200     |    14289779 |
| hooked-200  |    14324338 |
| messy-1000  |    14184053 |
| messy-5000  |    15370959 |

## construct()

| shape       | ops/sec     |
|-------------|------------:|
| chain-10    |        5341 |
| chain-50    |        1718 |
| chain-200   |         570 |
| chain-1000  |         101 |
| dense-10    |        1166 |
| dense-50    |          33 |
| dense-200   |           0 |
| hub-50      |        1644 |
| hub-200     |         389 |
| hooked-200  |         392 |
| messy-1000  |          38 |
| messy-5000  |           4 |
