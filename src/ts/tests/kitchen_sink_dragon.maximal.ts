
/* eslint-disable max-len */

import * as jssm              from '../jssm';
import * as fc                from 'fast-check';
import { gen_splitmix32 } from '../jssm_util';

const sm = jssm.sm;

// loopable generator starts with a single node, and adds chains, such that any
// chain is all new nodes, starts from an existing node, and ends at an existing
// node.  this creates graphs with no chance of collision, which will always
// have at least one forward path for any node.

// non-loopable generator generates semi-stars.  pick any node, add a chain from
// it, and leave the end hanging.  it is guaranteed that any graph generated
// will terminate, and if the walk length is longer than the node added count,
// that the termination will be located.





// class AtomArb extends fc.NextArbitrary<T> {

//   generate(mrng, biasFactor): NextValue<T> {
//     mrng.
//   }

// };





const max_walk_length = 1500,
      nodes_added     = 100,
      max_loop_length = 20;





// the

let nth = 0;

describe('Test all the things', () => {

  fc.assert(
    fc.property(

      fc.boolean(),
      fc.nat(),

      (shouldHalt: boolean, gen_seed: number) => {

        const rand  = gen_splitmix32(gen_seed),
              r_int = (n: number) => Math.trunc(rand() * n);

        function choose(arr) {
          if (!(Array.isArray(arr))) { throw new TypeError(`choose only takes arrays, not '${typeof arr}'s`); }
          if (arr.length === 0)      { throw new RangeError(`choose cannot choose from an empty array`); }
          return arr[ r_int(arr.length) ];
        }

        function ws() {
          let random_whitespace = '';
          while (r_int(3) < 1) { random_whitespace += choose([' ', ' ', ' ', '\t', '\r', '\n', '\r\n']); }
          return random_whitespace;
        }

        function r_edgetype_1way() { return choose(['-', '-', '-', '-', '-', '=', '=', '~']); }
        function r_edgetype_2way() { return choose(['-', '-', '-', '-', '-', '=', '=', '~', '-', '-', '-', '-', '-', '=', '=', '~', '-=', '=-', '-~', '~-', '=~', '~-' ]); }

        const has_nodes: string[] = [];

        let node_cursor = 0;
        const n = () => `n${node_cursor++}`;

        const root1 = n(),
              root2 = n();

        has_nodes.push(root1, root2);

        // One-way root edge for the halting (semi-star) case keeps the graph
        // a DAG; two-way for the non-halting (loopable) case gives both roots
        // an out-edge from the start.
        const edges: string[] = [
          shouldHalt
            ? `${root1}${ws()}${r_edgetype_1way()}>${ws()}${root2};`
            : `${root1}${ws()}<${r_edgetype_2way()}>${ws()}${root2};`,
        ];

        let nodes_left = nodes_added;
        while (nodes_left) {

          const chain_len = r_int(nodes_left - 1) + 1;
          nodes_left -= chain_len;

          let prev = choose(has_nodes);
          const fresh: string[] = [];
          for (let c = 0; c < chain_len; c++) {
            const node = n();
            fresh.push(node);
            edges.push(`${prev}${ws()}${r_edgetype_1way()}>${ws()}${node};`);
            prev = node;
          }

          // loopable: close back to an existing node so no new node is a
          // sink — every node keeps an exit and the walk cannot halt.
          // semi-star: leave the last new node hanging as a terminal sink.
          if (!shouldHalt) {
            edges.push(`${prev}${ws()}${r_edgetype_1way()}>${ws()}${choose(has_nodes)};`);
          }

          has_nodes.push(...fresh);

        }

        const machine_string = edges.join('');

        let machine;
        try {
          machine = jssm.from(machine_string);
        } catch (e) {
          throw new Error(`Could not parse: \`${machine_string}\``);
        }

        let halted       = true,
            not_finished = true,
            walk_length  = max_walk_length;

        let exits = machine.list_exits();

        while (exits.length && not_finished) {

          if (walk_length <= 0) {
            halted       = false;
            not_finished = false;
          }

          const this_exit = choose(exits);
          machine.force_transition(this_exit);
          --walk_length;
          exits = machine.list_exits();

        }

        const sh = `${shouldHalt? '' : 'no '}halt`;

        test(`${`#${nth++}`.padStart(3)}: ${shouldHalt? 'must ' : '  no-'}halt: ${machine_string.substring(0,25)}`, () => expect(halted).toBe(shouldHalt) );

      }
    )
  );

});
