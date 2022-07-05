
/* eslint-disable max-len */

import * as jssm              from '../jssm';
import * as fc                from 'fast-check';
import { make_mulberry_rand } from '../jssm_util';

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

        const mulberry = make_mulberry_rand(gen_seed),  // these giant consts are library defaults, see readme
              r_int    = (n: number) => Math.trunc(mulberry() * n);

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
        function n() { return `n${node_cursor++}`; }

        const root1     = n(),
              root2     = n(),
              root_edge = shouldHalt? `${r_edgetype_1way()}>` : `<${r_edgetype_2way()}>`,
              [wsl,wsr] = [ ws(), ws() ];

        has_nodes.push(root1);
        has_nodes.push(root2);

        let machine_string = `${root1}${wsl}${root_edge}${wsr}${root2};`,
            nodes_left     = nodes_added;

        let this_loop = '';
        while (nodes_left) {

          const left         = choose(has_nodes),
                right        = choose(has_nodes);

          let this_count  = r_int(nodes_left-1) + 1,
              prev        = left;

          nodes_left -= this_count;

          while (this_count--) {
            const should_chain = this_count? choose([true, true, false]) : false,
                  new_node     = n(),
                  [wsl,wsr]    = [ ws(), ws() ],
                  arrow        = r_edgetype_1way() + '>';
            this_loop += `${prev}${wsl}${arrow}${wsr}`;
            if (should_chain === false) { this_loop += `${new_node};`; }
            prev       = new_node;
          }
          machine_string += this_loop;

        }

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
