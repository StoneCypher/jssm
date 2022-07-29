# Feature Comparison

A quick look at what machines offer what functionality, across the 16 most
popular FSMs on NPM at the time of writing.  Updates and extensions are
encouraged.

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
    <td>1</td>
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
    <th colspan="2">Count</th>
    <td>3</td>
    <td>1</td>
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
    <td>13</td>
    <td>10</td>
    <td>11</td>
    <td>10</td>
    <td>1</td>
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
    <td>1</td>
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
    <td>24</td>
    <td>18</td>
    <td>13</td>
    <td>12</td>
    <td>3</td>
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

## Updates

Mistake?  Something out of date?  New row or column needed?

[Please let us know.](https://github.com/StoneCypher/fsl/issues/new?assignees=&labels=&template=feature-requesting-template.md&title=Change%20needed%20to%20Feature%20Comparison%20Matrix:&body=Please%20detail%20the%20necessary%20changes%20here&labels=Cleanup,Collected+propaganda,Competititon,Documentation,Help+sidebar,Other+environments,Publicity+and+Visibility)
