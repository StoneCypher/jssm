
import { array_box_if_string } from '../jssm_util';





const testData = [
  [ 0,         0         ],
  [ true,      true      ],
  [ "a",       ["a"]     ],
  [ ["a"],     ["a"]     ],
  [ [],        []        ],
  [ undefined, undefined ]
];





describe('array_box_if_string/1', () => {

  testData.map( ([src, dest]) =>
    test(`${JSON.stringify(src)} generates ${JSON.stringify(dest)}`, () =>
      expect( array_box_if_string(src) )
        .toEqual(dest) ) );

});

// stochable
