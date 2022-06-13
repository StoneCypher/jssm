# Example Machines

This is a table of example machines.





&nbsp;

&nbsp;

<div class="rot_th_tab">

## Useful machines

| Name | # | <span class="rot">Edge&nbsp;kinds</span> | <span class="rot">Actions</span> | <span class="rot">Hooks</span> | <span class="rot">Properties</span> | <span class="rot">Data</span> |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| <a href="#lightswitch">Light switch</a> | 2 | | &#x2705; | | |
| <a href="#trafficlight">Traffic light</a> | 4 | &#x2705; | &#x2705; | | | |
| <a href="#trafficintersection">Traffic intersection</a> | 7 | &#x2705; | &#x2705; | &#x2705; | &#x2705; | | |
| <a href="#mealyvendingmachine">Mealy vending machine</a> | - | | &#x2705; | &#x2705; | | |
| <a href="#moorevendingmachine">Moore vending machine</a> | - | | &#x2705; | &#x2705; | | &#x2705; |
| <a href="#tcpip">TCP/IP</a> | 12 | | &#x2705; | | | |

</div>





&nbsp;

&nbsp;

<div class="rot_th_tab">

## Documentary machines

| Name | # | <span class="rot">Edge&nbsp;kinds</span> | <span class="rot">Actions</span> | <span class="rot">Hooks</span> | <span class="rot">Properties</span> | <span class="rot">Data</span> |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| <a href="#statesofmatter">States of matter</a> | 4 | | &#x2705; | | &#x2705; | |

</div>





&nbsp;

&nbsp;

<div class="rot_th_tab">

## Comedy machines

| Name | # | <span class="rot">Edge&nbsp;kinds</span> | <span class="rot">Actions</span> | <span class="rot">Hooks</span> | <span class="rot">Properties</span> | <span class="rot">Data</span> |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| <a href="#punjabinametheory">Punjabi name theory</a> | - | | | | | |

</div>



&nbsp;

&nbsp;

&nbsp;

# Useful Machines

<a name="useful"></a><a href="#top">Back to top</a>

&nbsp;

## Light switch

<a name="lightswitch"></a>

Pretty obvious two-stater.  Starts in `Off`; switches back and forth on
`toggle`.

```fsl
Off 'toggle' <=> 'toggle' On;
```

&nbsp;

&nbsp;

## Traffic light

<a name="trafficlight"></a>

Pretty obvious two-stater.  Starts in `Off`; turns on with `enable`; when on,
cycles on `next`, or back to `Off` with `disable`.  Does not offer `enable` or
`disable` when not appropriate.

```fsl
Off 'enable' -> Red;
Red 'next' => Green 'next' => Yellow 'next' => Red;
[Red Yellow Green] 'disable' ~> Off;
```

&nbsp;

&nbsp;

## Traffic intersection

<a name="trafficintersection"></a>

Offers six states - red yellow green for north, and the same for east.  Shows
red in the unnamed direction.  Guarantees four-light sync at all times.

```fsl
Off 'enable' -> GreenNorth;

GreenNorth 'next' => YellowNorth 'next' => RedNorth 'next' =>
GreenEast 'next'  => YellowEast  'next' => RedEast  'next' =>
GreenNorth;

[GreenNorth YellowNorth RedNorth GreenEast YellowEast RedEast] 'disable' ~> Off;
```

&nbsp;

&nbsp;

## TCP/IP

<a name="tcpip"></a>

TCP/IP, essentially the foundation of the internet, is fundamentally defined as
a state machine and currently codified on
[page 22 of RFC793](https://datatracker.ietf.org/doc/html/rfc793).

A TCP/IP socket both starts and ends in `Closed`.

```fsl
Closed 'Passive open'      -> Listen;
Closed 'Active Open / SYN' -> SynSent;

Listen 'Close'         -> Closed;
Listen 'Send / SYN'    -> SynSent;
Listen 'SYN / SYN+ACK' -> SynRcvd;

SynSent 'Close'         -> Closed;
SynSent 'SYN / SYN+ACK' -> SynRcvd;
SynSent 'SYN+ACK / ACK' -> Established;

SynRcvd 'Timeout / RST' -> Closed;
SynRcvd 'Close / FIN'   -> FinWait1;
SynRcvd 'ACK'           -> Established;

Established 'Close / FIN' -> FinWait1;
Established 'FIN / ACK'   -> CloseWait;

FinWait1 'FIN / ACK'     -> Closing;
FinWait1 'FIN+ACK / ACK' -> TimeWait;
FinWait1 'ACK / Nothing' -> FinWait2;

FinWait2  'FIN / ACK'   -> TimeWait;
Closing   'ACK'         -> TimeWait;
TimeWait  'Up to 2*MSL' -> Closed;
CloseWait 'Close / FIN' -> LastAck;

LastAck 'ACK' -> Closed;
```

&nbsp;

&nbsp;

&nbsp;

# Comedy Machines

<a name="comedy"></a><a href="#top">Back to top</a>

&nbsp;

## Punjabi Name Theory

<a name="punjabinametheory"></a>
