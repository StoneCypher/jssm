# Feature Comparison

A quick look at what machines offer what functionality, across the 16 most
popular FSMs on NPM at the time of writing.  Updates and extensions are
encouraged.

Definitions and a change link follow the tables.

<div class="frot_th_tab">

<table id="feature_comparison">
  <tr class="faketitle">
    <td colspan="18">Language features</td>
  </tr>
  <tr class="headings">
    <th class="tablenotch" colspan="2"></th>
    <th><span class="rot">jssm</span></th>
    <th><span class="rot">XState</span></th>
    <th><span class="rot">javascript-state-machine</span></th>
    <th><span class="rot">machina</span></th>
    <th><span class="rot">finity</span></th>
    <th><span class="rot">fsm-iterator</span></th>
    <th><span class="rot">fsm-as-promised</span></th>
    <th><span class="rot">stately.js</span></th>
    <th><span class="rot">state-machine</span></th>
    <th><span class="rot">node-state</span></th>
    <th><span class="rot">fsm-event</span></th>
    <th><span class="rot">fsm</span></th>
    <th><span class="rot">stent</span></th>
    <th><span class="rot">robot3</span></th>
    <th><span class="rot">mood</span></th>
    <th><span class="rot">grammar-graph</span></th>
  </tr>
  <tr>
    <th>States</th>
    <th>16</th>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
  </tr>
  <tr>
    <th>Transitions</th>
    <th>14</th>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Actions</th>
    <th>11</th>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Data</th>
    <th>6</th>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>TypeScript data</th>
    <th>2</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>General hooks</th>
    <th>7</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Specific hooks</th>
    <th>10</th>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Post-hooks</th>
    <th>4</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Hook rejection</th>
    <th>4</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Transactions</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Extending machines</th>
    <th>3</th>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Machine composition</th>
    <th>3</th>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Dynamic graphs</th>
    <th>2</th>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Properties</th>
    <th>3</th>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Methods</th>
    <th>2</th>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Weighted edges</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Heirarchical states</th>
    <th>3</th>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>State groups</th>
    <th>2</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
  </tr>
  <tr>
    <th>Timeouts</th>
    <th>4</th>
    <td>⌚</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Immediates</th>
    <th>1</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Error hooks</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Input/output tape</th>
    <th>1</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
  </tr>
  <tr>
    <th>Tape validator</th>
    <th>1</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
  </tr>
  <tr>
    <th>Termination</th>
    <th>6</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
  </tr>
  <tr>
    <th>Async transitions</th>
    <th>4</th>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Event emitter</th>
    <th>3</th>
    <td>⌚</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Random walks</th>
    <th>2</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
  </tr>
  <tr>
    <th>Serialization</th>
    <th>2</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Factories</th>
    <th>4</th>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Named instances</th>
    <th>2</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Automatic API</th>
    <th>1</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th colspan="2">Count</th>
    <td>19</td>
    <td>13</td>
    <td>10</td>
    <td>11</td>
    <td>10</td>
    <td>2</td>
    <td>8</td>
    <td>6</td>
    <td>7</td>
    <td>5</td>
    <td>4</td>
    <td>5</td>
    <td>4</td>
    <td>12</td>
    <td>4</td>
    <td>6</td>
  </tr>
  <tr class="faketitle">
    <td colspan="18">Notations</td>
  </tr>
  <tr class="headings">
    <th class="tablenotch" colspan="2"></th>
    <th><span class="rot">jssm</span></th>
    <th><span class="rot">XState</span></th>
    <th><span class="rot">javascript-state-machine</span></th>
    <th><span class="rot">machina</span></th>
    <th><span class="rot">finity</span></th>
    <th><span class="rot">fsm-iterator</span></th>
    <th><span class="rot">fsm-as-promised</span></th>
    <th><span class="rot">stately.js</span></th>
    <th><span class="rot">state-machine</span></th>
    <th><span class="rot">node-state</span></th>
    <th><span class="rot">fsm-event</span></th>
    <th><span class="rot">fsm</span></th>
    <th><span class="rot">stent</span></th>
    <th><span class="rot">robot3</span></th>
    <th><span class="rot">mood</span></th>
    <th><span class="rot">grammar-graph</span></th>
  </tr>
  <tr>
    <th>String DSL</th>
    <th>3</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Wildcards</th>
    <th>1</th>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Stripes</th>
    <th>0</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Cycles</th>
    <th>0</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Kinds</th>
    <th>0</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>State spread</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Complex labels</th>
    <th>0</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th colspan="2">Count</th>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>1</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr class="faketitle">
    <td colspan="18">API</td>
  </tr>
  <tr class="headings">
    <th class="tablenotch" colspan="2"></th>
    <th><span class="rot">jssm</span></th>
    <th><span class="rot">XState</span></th>
    <th><span class="rot">javascript-state-machine</span></th>
    <th><span class="rot">machina</span></th>
    <th><span class="rot">finity</span></th>
    <th><span class="rot">fsm-iterator</span></th>
    <th><span class="rot">fsm-as-promised</span></th>
    <th><span class="rot">stately.js</span></th>
    <th><span class="rot">state-machine</span></th>
    <th><span class="rot">node-state</span></th>
    <th><span class="rot">fsm-event</span></th>
    <th><span class="rot">fsm</span></th>
    <th><span class="rot">stent</span></th>
    <th><span class="rot">robot3</span></th>
    <th><span class="rot">mood</span></th>
    <th><span class="rot">grammar-graph</span></th>
  </tr>
  <tr>
    <th>In-place extrapolation</th>
    <th>1</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
  </tr>
  <tr>
    <th>Graph reflection API</th>
    <th>7</th>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
  </tr>
  <tr>
    <th>History</th>
    <th>4</th>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>State histograms</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th colspan="2">Count</th>
    <td>3</td>
    <td>2</td>
    <td>2</td>
    <td>0</td>
    <td>1</td>
    <td>1</td>
    <td>1</td>
    <td>0</td>
    <td>1</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>2</td>
  </tr>
  <tr class="faketitle">
    <td colspan="18">Docs, Support, and Community</td>
  </tr>
  <tr class="headings">
    <th class="tablenotch" colspan="2"></th>
    <th><span class="rot">jssm</span></th>
    <th><span class="rot">XState</span></th>
    <th><span class="rot">javascript-state-machine</span></th>
    <th><span class="rot">machina</span></th>
    <th><span class="rot">finity</span></th>
    <th><span class="rot">fsm-iterator</span></th>
    <th><span class="rot">fsm-as-promised</span></th>
    <th><span class="rot">stately.js</span></th>
    <th><span class="rot">state-machine</span></th>
    <th><span class="rot">node-state</span></th>
    <th><span class="rot">fsm-event</span></th>
    <th><span class="rot">fsm</span></th>
    <th><span class="rot">stent</span></th>
    <th><span class="rot">robot3</span></th>
    <th><span class="rot">mood</span></th>
    <th><span class="rot">grammar-graph</span></th>
  </tr>
  <tr>
    <th>Defined lifecycle</th>
    <th>4</th>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Detailed errors</th>
    <th>2</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Extend existing objects</th>
    <th>2</th>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Defined start states</th>
    <th>6</th>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Probabilistic starts</th>
    <th>2</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
  </tr>
  <tr>
    <th>In-source debugger</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Browser debugger</th>
    <th>2</th>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Compiler</th>
    <th>0</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Cross-compiler</th>
    <th>0</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Graph renderer</th>
    <th>4</th>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Visual styling</th>
    <th>2</th>
    <td>✅</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Manual</th>
    <th>5</th>
    <td>✅</td>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>API samples</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Demo videos</th>
    <th>2</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Tutorial videos</th>
    <th>2</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Chat community</th>
    <th>3</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Example library</th>
    <th>2</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th colspan="2">Count</th>
    <td>13</td>
    <td>8</td>
    <td>6</td>
    <td>2</td>
    <td>1</td>
    <td>1</td>
    <td>2</td>
    <td>0</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>2</td>
    <td>2</td>
    <td>0</td>
    <td>1</td>
  </tr>
  <tr class="faketitle">
    <td colspan="18">Testing</td>
  </tr>
  <tr class="headings">
    <th class="tablenotch" colspan="2"></th>
    <th><span class="rot">jssm</span></th>
    <th><span class="rot">XState</span></th>
    <th><span class="rot">javascript-state-machine</span></th>
    <th><span class="rot">machina</span></th>
    <th><span class="rot">finity</span></th>
    <th><span class="rot">fsm-iterator</span></th>
    <th><span class="rot">fsm-as-promised</span></th>
    <th><span class="rot">stately.js</span></th>
    <th><span class="rot">state-machine</span></th>
    <th><span class="rot">node-state</span></th>
    <th><span class="rot">fsm-event</span></th>
    <th><span class="rot">fsm</span></th>
    <th><span class="rot">stent</span></th>
    <th><span class="rot">robot3</span></th>
    <th><span class="rot">mood</span></th>
    <th><span class="rot">grammar-graph</span></th>
  </tr>
  <tr>
    <th>100% test coverage</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Fuzz testing</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Mutation testing</th>
    <th>0</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>i18n testing</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th colspan="2">Count</th>
    <td>3</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr class="faketitle">
    <td colspan="18">Tools</td>
  </tr>
  <tr class="headings">
    <th class="tablenotch" colspan="2"></th>
    <th><span class="rot">jssm</span></th>
    <th><span class="rot">XState</span></th>
    <th><span class="rot">javascript-state-machine</span></th>
    <th><span class="rot">machina</span></th>
    <th><span class="rot">finity</span></th>
    <th><span class="rot">fsm-iterator</span></th>
    <th><span class="rot">fsm-as-promised</span></th>
    <th><span class="rot">stately.js</span></th>
    <th><span class="rot">state-machine</span></th>
    <th><span class="rot">node-state</span></th>
    <th><span class="rot">fsm-event</span></th>
    <th><span class="rot">fsm</span></th>
    <th><span class="rot">stent</span></th>
    <th><span class="rot">robot3</span></th>
    <th><span class="rot">mood</span></th>
    <th><span class="rot">grammar-graph</span></th>
  </tr>
  <tr>
    <th>Live editor</th>
    <th>2</th>
    <td>✅</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>CLI</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>VS Code Extension</th>
    <th>1</th>
    <td>❌</td>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Github Action</th>
    <th>0</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>URL live-paste</th>
    <th>1</th>
    <td>✅</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Linter</th>
    <th>0</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th>Minifier</th>
    <th>0</th>
    <td>⌚</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <th colspan="2">Count</th>
    <td>3</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr class="faketitle">
    <td colspan="18">Totals</td>
  </tr>
  <tr class="headings">
    <th class="tablenotch" colspan="2"></th>
    <th><span class="rot">jssm</span></th>
    <th><span class="rot">XState</span></th>
    <th><span class="rot">javascript-state-machine</span></th>
    <th><span class="rot">machina</span></th>
    <th><span class="rot">finity</span></th>
    <th><span class="rot">fsm-iterator</span></th>
    <th><span class="rot">fsm-as-promised</span></th>
    <th><span class="rot">stately.js</span></th>
    <th><span class="rot">state-machine</span></th>
    <th><span class="rot">node-state</span></th>
    <th><span class="rot">fsm-event</span></th>
    <th><span class="rot">fsm</span></th>
    <th><span class="rot">stent</span></th>
    <th><span class="rot">robot3</span></th>
    <th><span class="rot">mood</span></th>
    <th><span class="rot">grammar-graph</span></th>
  </tr>
  <tr>
    <th colspan="2">Language features</th>
    <td>19</td>
    <td>14</td>
    <td>10</td>
    <td>11</td>
    <td>10</td>
    <td>2</td>
    <td>8</td>
    <td>6</td>
    <td>7</td>
    <td>5</td>
    <td>4</td>
    <td>5</td>
    <td>4</td>
    <td>12</td>
    <td>4</td>
    <td>6</td>
  </tr>
  <tr>
    <th colspan="2">Notations</th>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>1</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <th colspan="2">API</th>
    <td>3</td>
    <td>2</td>
    <td>2</td>
    <td>0</td>
    <td>1</td>
    <td>1</td>
    <td>1</td>
    <td>0</td>
    <td>1</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>2</td>
  </tr>
  <tr>
    <th colspan="2">Docs/support</th>
    <td>13</td>
    <td>8</td>
    <td>6</td>
    <td>2</td>
    <td>1</td>
    <td>1</td>
    <td>2</td>
    <td>0</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>2</td>
    <td>2</td>
    <td>0</td>
    <td>1</td>
  </tr>
  <tr>
    <th colspan="2">Testing</th>
    <td>3</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <th colspan="2">Tools</th>
    <td>3</td>
    <td>2</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr class="sums">
    <th colspan="2">Sum totals</th>
    <td>43</td>
    <td>26</td>
    <td>18</td>
    <td>13</td>
    <td>12</td>
    <td>4</td>
    <td>11</td>
    <td>6</td>
    <td>10</td>
    <td>6</td>
    <td>6</td>
    <td>5</td>
    <td>6</td>
    <td>14</td>
    <td>4</td>
    <td>9</td>
  </tr>
</table>

</div>





&nbsp;

&nbsp;

## Definitions

By section:





&nbsp;

&nbsp;

###

<dl>

  <dt><a name="states"></a>States</dt>
  <dd>
    The bread and butter of a state machine - the states that the machine is
    permitted to occupy.  It's hard to understand what a state machine that
    didn't support states would actually be.  On a traffic light, we probably
    have <tt>red</tt>, <tt>yellow</tt>, <tt>green</tt>, and <tt>off</tt>.
  </dd>

  <dt><a name="transitions"></a>Transitions</dt>
  <dd>
    A machine that supports transitions allows you to specify which state to
    move to directly.  Almost all machines support transitions.  A handful of
    machines do not (usually by only supporting actions instead.)  These are
    often called <syn>go</syn>, <syn>switch</syn>, <syn>change</syn>,
    <syn>state</syn>, <syn>set</syn>, or <syn>assign</syn>.
  </dd>

  <dt><a name="actions"></a>Actions</dt>
  <dd>
    Actions are things that can be done, from a given state.  These are distinct
    from transitions, which specify the end goal, by being a label specifying
    what's being done, instead; since these are also not part of the input or
    output alphabets, these are effectively a layer of indirection on behavior.
    What's useful here is the names can be repeated from different starting
    points.  To progress in our traffic light without actions, we need to know
    what color we're on to ask for the successor by title; with actions, we can
    just teach each color the idea of <tt>next</tt>.  Actions are sometimes
    called <syn>tasks</syn>, <syn>raise</syn>, <syn>signal</syn>,
    <syn>event</syn>, or <syn>do</syn>.  In some machines these are mandatory;
    in FSL they are optional.
  </dd>

  <dt><a name="data"></a>Data</dt>
  <dd>
    Data is the difference between a Mealy and a Moore machine - data support
    means you can track more than just states.  In a vending machine, having no
    data means you need states for every valid sum of coin values (one for five
    cents, one for ten cents, etc;) having data means you just track
    a number for what's already contained.  Some machines call this
    <syn>context</syn>, or occasionally <syn>input</syn>.
  </dd>

  <dt><a name="typescript_data"></a>TypeScript data</dt>
  <dd>
    We say the machine supports TypeScript data if the machine's data object
    type is customizable, is exposed to TypeScript, and can be enforced by
    TypeScript.  In this way, the machine's data is fully part of the TypeScript
    system.
  </dd>

  <dt><a name="general_hooks"></a>General hooks</dt>
  <dd>
    Hooks allow you to specify a function that gets called because of something
    that happened.  Support for general hooks means that you can establish a
    hook on general or global events, such as "any transition" or "any event."
  </dd>

  <dt><a name="specific_hooks"></a>Specific hooks</dt>
  <dd>
    Support for specific hooks means that you can establish a hook on particular
    states, transitions, or actions.
  </dd>

  <dt><a name="post_hooks"></a>Post-hooks</dt>
  <dd>
    Posthooks fire after a transition is complete, rather than before, and the
    data passed to the posthook reflects the later configuration.  If you wanted
    to make an editor that visualized states' actions with buttons, you'd need
    to use posthooks, not hooks, so that the buttons were for what state they're
    now on, rather than the ones in the previous configuration.
  </dd>

  <dt><a name="hook_rejection"></a>Hook rejection</dt>
  <dd>
    Support for hook rejection means that a given hook is allowed to deny a
    given behavior.  An example is a state machine representing a user
    interface, which has a data member representing whether the user is logged
    in, and which disallows switching to the personal profile when not. Hooks
    that reject are sometimes called <syn>guards</syn>, and were called
    <syn>guards</syn> in earlier versions of this machine.
  </dd>

  <dt><a name="transactions"></a>Transactions</dt>
  <dd>
    In a transactional FSM, everything is transactional - if any hook in a
    process rejects, none of the other transformations that would have taken
    place do, and everything is rolled back to the end result of the last
    successful transition.
  </dd>

  <dt><a name="extending_machines"></a>Extending machines</dt>
  <dd>
    Support for extending machines means that an existing machine can be
    augmented in place, while keeping its state and any data intact.  This is
    distinct from changing the source that made a machine and recompiling it;
    machine extension works on instances, not definitions.
  </dd>

  <dt><a name="machine_composition"></a>Machine composition</dt>
  <dd>
    Machine composition is either the combination of two machines, or the
    subordination of one machine to another using internal mechanisms.  This is
    distinct from putting something together externally using hooks.
  </dd>

  <dt><a name="dynamic_graphs"></a>Dynamic graphs</dt>
  <dd>
    In a machine which supports dynamic graphs, the structure of the machine can
    be changed while it is running, either in its states, its transitions, or
    its actions.
  </dd>

  <dt><a name="properties"></a>Properties</dt>
  <dd>
    Support for properties means that states can and may be required to express
    named values.  This can obviate repetitive switching to make decisions based
    on the state outside, and unify the behavior of things depending on machines
    under the machines' specification.  A traffic light state machine's light
    color states might have properties regarding whether you may drive, or
    whether to go slowly.
  </dd>

  <dt><a name="methods"></a>Methods</dt>
  <dd>
    Support for methods means that states may express named functions.  Consider
    a state machine representing a network connection, which might be online or
    offline; it might express a lookup function which falls back to a local
    cache outside the presence of a network connection, but queries a backend
    when connected.  This feature, when used fully, makes a state machine
    equivalent to <syn>Strategy Pattern</syn>.
  </dd>

  <dt><a name="weighted_edges"></a>Weighted edges</dt>
  <dd>
    In a machine with weighted edges, transitions can be randomized, and some
    probabilities may be stronger than others.  This allows machines to directly
    model simple probabilities, or probability meshes when used with random
    walks.  Use of this feature makes a state machine equivalent to a <syn>First
    Order Markhov Chain</syn>.
  </dd>

  <dt><a name="heirarchical_states"></a>Heirarchical states</dt>
  <dd>
    Heirarchical states are a major approach to reducing the number of
    transitions in a machine, by allowing them to source from or target groups
    of states rather than individual states, frequently reducing a typical
    edge count from <tt>o(n^2)</tt> from state count down towards <tt>o(n)</tt>
    from group count.  In an FSM representing a microwave, all states except
    <tt>idle</tt> will have an action for <tt>cancel</tt>, which could be
    reduced to the non-idle heirarchy.  A limitation of heirarchies is that they
    generally cannot overlap, and groups frequently need to overlap.
  </dd>

  <dt><a name="state_groups"></a>State groups</dt>
  <dd>
    Another method of reducing transition count is to allow the definition of
    arbitrary lists of states, and to treat them as heirarchical groups are
    treated, as valid source and endpoints.  This is slightly more laborious,
    but also more flexible, and can be used to implement heirarchical FSMs
    directly.
  </dd>

  <dt><a name="timeouts"></a>Timeouts</dt>
  <dd>
    A state with a timeout will, if unchanged and unacted, switch of its own
    volition to another state after a specified amount of time.  Any transition
    or action automatically ends this timer.  This is extremely helpful when
    implementing protocols, network behavior, enemy agent AI, or timed
    element demonstrations.
  </dd>

  <dt><a name="immediates"></a>Immediates</dt>
  <dd>
    In a machine with support for immediates, after a relevant transition,
    action, or hook to a target state, a new transition will automatically occur
    to a successor state with no delay.  The most common uses for immediates are
    merging groups of paths and hooking the groups on the way through, inserting
    things into history, coursing during parsing and random construction, or
    construction of transfer states for things that wouldn't otherwise be
    allowed, such as multiple actions that (eventually) have the same source and
    destination states.
  </dd>

  <dt><a name="error_hooks"></a>Error hooks</dt>
  <dd>
    An error hook is a hook that's called when an error fires.  Errors are
    distinct from refusals - asking to switch to a state that isn't allowed, or
    one that doesn't exist, are refusals, and should not fire this hook.  Errors
    are for when you ask for things that don't make sense, such as a string with
    an opening quote but not a closing quote.  Errors of that form are
    relatively rare in finite state machines, but can be important when dealing
    with data, dynamic graphs, or combined machines.
  </dd>

  <dt><a name="input_output_tape"></a>Input/output tape</dt>
  <dd>
    This is the formal classical finite state machine
    <tt>(Σ,Γ,S,s<sub>0</sub>,𝛿,F)</tt> from the textbooks, which is defined as
    two alphabets, one set of transformations, an initial state, and two token
    streams.  From this worldview on finite state machines, the input alphabet
    <tt>Σ</tt> is the things that are allowed to be on the input tape; the
    output alphabet is the your state list by default, but could be changed by
    your hooks; the set of states <tt>S</tt> is just the states you've defined;
    the set of transformations <tt>𝛿</tt> is your transitions, accepts an input
    symbol (from the tape) if Moore and also some <syn>data</syn> if Mealy; and
    the two streams are the input tape and the output tape.  If you'd like to
    write a FSM as an acceptor or a validator, typically you would use these
    tape facilities.  These tend to be found in parsing, iteration, and utility
    oriented machines.  If you are only using the input tape and a halting state
    (by example, a machine that checks if the input is a number,) you create an
    <syn>acceptor</syn>; if you use the output tape to produce a transformed set
    of symbols (by example, an upper-casing machine,) you have instead made a
    <syn>transducer</syn>.  Support for tape is quite rare, despite being high
    value.
  </dd>

  <dt><a name="tape_validator"></a>Tape validator</dt>
  <dd>
    A machine with tape validation has API to repeatedly use the same machine
    to validate a set of inputs through tape, without making the user implement
    the feed machinery repeatedly.  These are found almost exclusively in
    parsing oriented machines.
  </dd>

  <dt><a name="termination"></a>Termination</dt>
  <dd>
    Machine support for termination implies that a machine pays attention to
    when a state has no valid exits, frequently offering hooks or callbacks to
    let the machine user know that a machine has finalized.  This is typically
    found in parsing and validation oriented machines.
  </dd>

  <dt><a name="async_transitions"></a>Async transitions</dt>
  <dd>
    Asynchronous transitions in machines typically mean that transitions may not
    be instantaneous, and that the result of a transition may be a callback,
    promise, or generator, instead of an immediately reflected change.  This
    approach has tradeoffs.  On the upside, the number of states being tracked
    is often significantly lower, and as such, the transition count quite a bit
    lower.  On the other hand, this means that state machines may become locked
    and unavailable, introducing concurrency concerns, and requiring an api for
    mechanisms like <tt>is_changing</tt>.  An alternative approach is to
    maintain the instantaneous API, and have states representing things
    underway, which is closer to the fundamental nature of an FSM, single
    threaded, and more precise, but also more verbose.
  </dd>

  <dt><a name="event_emitter"></a>Event emitter</dt>
  <dd>
    An event emitter emits Javascript events for transitions, actions, and so
    forth, as a convenient alternative way to notify the outside world besides
    hooks.  As many Javascript tools consume events, this can remove a lot of
    dispatch boilerplate.
  </dd>

  <dt><a name="random_walks"></a>Random walks</dt>
  <dd>
    Random walks allow you to wander over the possibilities in your state
    machine.  Some state machines, like the canonical weather example, are well
    suited to using this directly; in others, this is a great way to validate
    that everything in your machine is reachable in a certain depth
    (particularly valuable for machines which represent user interfaces.)  This
    is also frequently a constituent piece of generating state heatmaps.
  </dd>

  <dt><a name="serialization"></a>Serialization</dt>
  <dd>
    Serialization permits you to take the current state of a machine (with or
    without its definition, with or without history, always with data) into a
    string format which is safe for storage, and can be reliably unpacked again
    later.  This is highly useful for save states, database storage, things
    moving through queues, and state exchange.
  </dd>

  <dt><a name="factories"></a>Factories</dt>
  <dd>
    Factories allow you to create new instances of the same machine with other
    configurations quickly and easily, and make it straightforward to map a
    container as a set of configurations for new machines, or to treat a machine
    specification as a generator.  Factories are useful when the same machine
    will be used in large numbers.  An example would be the people in a game
    like Roller Coaster Tycoon - every time a new customer enters the park, the
    factory should spin off a new Person with a set of random preferences,
    clothes, money, and so forth.
  </dd>

  <dt><a name="named_instances"></a>Named instances</dt>
  <dd>
    When re-using a machine frequently, such as with a factory method or a
    generator, it is often useful to name the instances so that you can tell
    them apart.  By example, this can be useful when making network connections,
    parsing files in parallel, or when state machines represent assets in a
    system, such as the people and objects in a video game.  As the number of
    machines you manage grows, so too grows the value of naming instances.
  </dd>

  <dt><a name="automatic_api"></a>Automatic API</dt>
  <dd>
    In a machine with an automatic API, transitions and/or actions are
    automatically added to the object's method namespace as functions, so that
    you don't need to call an indirection like <tt>.action('foo')</tt>, but
    instead just <tt>.foo()</tt>.  This can be complex - one may need a slugging
    function, and collisions might become a problem.  However, this can also
    yield more readable and usable machines, when done skillfully.
  </dd>

</dl>





&nbsp;

&nbsp;

## Updates

Mistake?  Something out of date?  New row or column needed?

[Please let us know.](https://github.com/StoneCypher/fsl/issues/new?assignees=&labels=&template=feature-requesting-template.md&title=Change%20needed%20to%20Feature%20Comparison%20Matrix:&body=Please%20detail%20the%20necessary%20changes%20here&labels=Cleanup,Collected+propaganda,Competititon,Documentation,Help+sidebar,Other+environments,Publicity+and+Visibility)
