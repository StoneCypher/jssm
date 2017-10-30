'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;
/* eslint-disable max-len */

(0, _avaSpec.describe)('cycle strategies', async function (_it) {

  var is_v = function is_v(str, v, it) {
    return it(_avaSpec.test, function (t) {
      return t.deepEqual(v, jssm.parse(str));
    });
  };

  (0, _avaSpec.describe)('basic cycle', async function (it) {
    is_v('[a b c] -> +1;', [{ from: ['a', 'b', 'c'], key: 'transition', se: { kind: '->', to: { key: 'cycle', value: 1 } } }], it);
  });

  (0, _avaSpec.describe)('negative cycle', async function (it) {
    is_v('[a b c] -> -1;', [{ from: ['a', 'b', 'c'], key: 'transition', se: { kind: '->', to: { key: 'cycle', value: -1 } } }], it);
  });

  (0, _avaSpec.describe)('nullary cycle', async function (it) {
    is_v('[a b c] -> +0;', [{ from: ['a', 'b', 'c'], key: 'transition', se: { kind: '->', to: { key: 'cycle', value: 0 } } }], it);
  });

  (0, _avaSpec.describe)('wide cycle', async function (it) {
    is_v('[a b c] -> +2;', [{ from: ['a', 'b', 'c'], key: 'transition', se: { kind: '->', to: { key: 'cycle', value: 2 } } }], it);
  });

  (0, _avaSpec.describe)('reverse basic cycle', async function (it) {
    is_v('+1 <- [a b c];', [{ from: { key: 'cycle', value: 1 }, key: 'transition', se: { kind: '<-', to: ['a', 'b', 'c'] } }], it);
  });

  (0, _avaSpec.describe)('reverse negative cycle', async function (it) {
    is_v('-1 <- [a b c];', [{ from: { key: 'cycle', value: -1 }, key: 'transition', se: { kind: '<-', to: ['a', 'b', 'c'] } }], it);
  });

  (0, _avaSpec.describe)('reverse nullary cycle', async function (it) {
    is_v('+0 <- [a b c];', [{ from: { key: 'cycle', value: 0 }, key: 'transition', se: { kind: '<-', to: ['a', 'b', 'c'] } }], it);
  });

  (0, _avaSpec.describe)('reverse wide cycle', async function (it) {
    is_v('+2 <- [a b c];', [{ from: { key: 'cycle', value: 2 }, key: 'transition', se: { kind: '<-', to: ['a', 'b', 'c'] } }], it);
  });

  (0, _avaSpec.describe)('bidi basic cycle', async function (it) {
    is_v('+1 <- [a b c] -> +1;', [{ from: { key: 'cycle', value: 1 }, key: 'transition', se: { kind: '<-', se: { kind: '->', to: { key: 'cycle', value: 1 } }, to: ['a', 'b', 'c'] } }], it);
  });

  (0, _avaSpec.describe)('bidi negative cycle', async function (it) {
    is_v('-1 <- [a b c] -> -1;', [{ from: { key: 'cycle', value: -1 }, key: 'transition', se: { kind: '<-', se: { kind: '->', to: { key: 'cycle', value: -1 } }, to: ['a', 'b', 'c'] } }], it);
  });

  (0, _avaSpec.describe)('bidi basic/negative cycle', async function (it) {
    is_v('+1 <- [a b c] -> -1;', [{ from: { key: 'cycle', value: 1 }, key: 'transition', se: { kind: '<-', se: { kind: '->', to: { key: 'cycle', value: -1 } }, to: ['a', 'b', 'c'] } }], it);
  });

  (0, _avaSpec.describe)('bidi nullary cycle', async function (it) {
    is_v('+0 <- [a b c] -> +0;', [{ from: { key: 'cycle', value: 0 }, key: 'transition', se: { kind: '<-', se: { kind: '->', to: { key: 'cycle', value: 0 } }, to: ['a', 'b', 'c'] } }], it);
  });

  (0, _avaSpec.describe)('bidi wide cycle', async function (it) {
    is_v('+2 <- [a b c] -> -2;', [{ from: { key: 'cycle', value: 2 }, key: 'transition', se: { kind: '<-', se: { kind: '->', to: { key: 'cycle', value: -2 } }, to: ['a', 'b', 'c'] } }], it);
  });

  /*
    describe('full parse of 2-step cycle', async it => {
      it('[a b] -> +1;', t => t.deepEqual(
        sm`[a b] -> +1;`.list_edges(),
        [{"from":"a","to":"b","kind":"legal","forced_only":false,"main_path":false},
         {"from":"b","to":"a","kind":"legal","forced_only":false,"main_path":false}]
      ));
    });
  
  /*
    describe('full parse of 5-step cycle', async it => {
      it('[a b c d e] -> +1;', t => t.deepEqual(
        sm`[a b] -> +1;`.list_edges(),
        [{"from":"a","to":"b","kind":"legal","forced_only":false,"main_path":false},
         {"from":"b","to":"c","kind":"legal","forced_only":false,"main_path":false},
         {"from":"c","to":"d","kind":"legal","forced_only":false,"main_path":false},
         {"from":"d","to":"e","kind":"legal","forced_only":false,"main_path":false},
         {"from":"e","to":"a","kind":"legal","forced_only":false,"main_path":false}]
      ));
  
    describe('full parse of 5-step reverse cycle', async it => {
      it('[a b c d e] -> -1;', t => t.deepEqual(
        sm`[a b] -> +1;`.list_edges(),
        [{"from":"a","to":"e","kind":"legal","forced_only":false,"main_path":false},
         {"from":"b","to":"a","kind":"legal","forced_only":false,"main_path":false},
         {"from":"c","to":"b","kind":"legal","forced_only":false,"main_path":false},
         {"from":"d","to":"c","kind":"legal","forced_only":false,"main_path":false},
         {"from":"e","to":"d","kind":"legal","forced_only":false,"main_path":false}]
      ));
    });
  
    describe('full parse of 5-step two-step cycle (star)', async it => {
      it('[a b c d e] -> +2;', t => t.deepEqual(
        sm`[a b] -> +1;`.list_edges(),
        [{"from":"a","to":"c","kind":"legal","forced_only":false,"main_path":false},
         {"from":"b","to":"d","kind":"legal","forced_only":false,"main_path":false},
         {"from":"c","to":"e","kind":"legal","forced_only":false,"main_path":false},
         {"from":"d","to":"a","kind":"legal","forced_only":false,"main_path":false},
         {"from":"e","to":"b","kind":"legal","forced_only":false,"main_path":false}]
      ));
    });
  */
  (0, _avaSpec.describe)('illegal fractional cycle throws', async function (it) {
    it('throws', function (t) {
      return t.throws(function () {
        jssm.parse('[a b c] -> +2.5;');
      });
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9jeWNsZXMuanMiXSwibmFtZXMiOlsianNzbSIsInJlcXVpcmUiLCJzbSIsIl9pdCIsImlzX3YiLCJzdHIiLCJ2IiwiaXQiLCJ0IiwiZGVlcEVxdWFsIiwicGFyc2UiLCJmcm9tIiwia2V5Iiwic2UiLCJraW5kIiwidG8iLCJ2YWx1ZSIsInRocm93cyJdLCJtYXBwaW5ncyI6Ijs7QUFHQTs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFBQSxJQUNNQyxLQUFPRixLQUFLRSxFQURsQjtBQUpBOztBQVdBLHVCQUFTLGtCQUFULEVBQTZCLGdCQUFNQyxHQUFOLEVBQWE7O0FBRXhDLE1BQU1DLE9BQU8sU0FBUEEsSUFBTyxDQUFDQyxHQUFELEVBQU1DLENBQU4sRUFBU0MsRUFBVDtBQUFBLFdBQWdCQSxrQkFBUztBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWUgsQ0FBWixFQUFlTixLQUFLVSxLQUFMLENBQVdMLEdBQVgsQ0FBZixDQUFMO0FBQUEsS0FBVCxDQUFoQjtBQUFBLEdBQWI7O0FBRUEseUJBQVMsYUFBVCxFQUF3QixnQkFBTUUsRUFBTixFQUFZO0FBQ2xDSCxTQUFLLGdCQUFMLEVBQXVCLENBQUMsRUFBQ08sTUFBTSxDQUFDLEdBQUQsRUFBSyxHQUFMLEVBQVMsR0FBVCxDQUFQLEVBQXNCQyxLQUFLLFlBQTNCLEVBQXlDQyxJQUFJLEVBQUNDLE1BQU0sSUFBUCxFQUFhQyxJQUFJLEVBQUNILEtBQUssT0FBTixFQUFlSSxPQUFPLENBQXRCLEVBQWpCLEVBQTdDLEVBQUQsQ0FBdkIsRUFBbUhULEVBQW5IO0FBQ0QsR0FGRDs7QUFJQSx5QkFBUyxnQkFBVCxFQUEyQixnQkFBTUEsRUFBTixFQUFZO0FBQ3JDSCxTQUFLLGdCQUFMLEVBQXVCLENBQUMsRUFBQ08sTUFBTSxDQUFDLEdBQUQsRUFBSyxHQUFMLEVBQVMsR0FBVCxDQUFQLEVBQXNCQyxLQUFLLFlBQTNCLEVBQXlDQyxJQUFJLEVBQUNDLE1BQU0s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ICovXG5cbmltcG9ydCB7dGVzdCwgZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QganNzbSA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyksXG4gICAgICBzbSAgID0ganNzbS5zbTtcblxuXG5cblxuXG5kZXNjcmliZSgnY3ljbGUgc3RyYXRlZ2llcycsIGFzeW5jIF9pdCA9PiB7XG5cbiAgY29uc3QgaXNfdiA9IChzdHIsIHYsIGl0KSA9PiBpdCh0ZXN0LCB0ID0+IHQuZGVlcEVxdWFsKHYsIGpzc20ucGFyc2Uoc3RyKSkpO1xuXG4gIGRlc2NyaWJlKCdiYXNpYyBjeWNsZScsIGFzeW5jIGl0ID0+IHtcbiAgICBpc192KCdbYSBiIGNdIC0+ICsxOycsIFt7ZnJvbTogWydhJywnYicsJ2MnXSwga2V5OiAndHJhbnNpdGlvbicsIHNlOiB7a2luZDogJy0+JywgdG86IHtrZXk6ICdjeWNsZScsIHZhbHVlOiAxfX19XSwgaXQpO1xuICB9KTtcblxuICBkZXNjcmliZSgnbmVnYXRpdmUgY3ljbGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXNfdignW2EgYiBjXSAtPiAtMTsnLCBbe2Zyb206IFsnYScsJ2InLCdjJ10sIGtleTogJ3RyYW5zaXRpb24nLCBzZToge2tpbmQ6ICctPicsIHRvOiB7a2V5OiAnY3ljbGUnLCB2YWx1ZTogLTF9fX1dLCBpdCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdudWxsYXJ5IGN5Y2xlJywgYXN5bmMgaXQgPT4ge1xuICAgIGlzX3YoJ1thIGIgY10gLT4gKzA7JywgW3tmcm9tOiBbJ2EnLCdiJywnYyddLCBrZXk6ICd0cmFuc2l0aW9uJywgc2U6IHtraW5kOiAnLT4nLCB0bzoge2tleTogJ2N5Y2xlJywgdmFsdWU6IDB9fX1dLCBpdCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd3aWRlIGN5Y2xlJywgYXN5bmMgaXQgPT4ge1xuICAgIGlzX3YoJ1thIGIgY10gLT4gKzI7JywgW3tmcm9tOiBbJ2EnLCdiJywnYyddLCBrZXk6ICd0cmFuc2l0aW9uJywgc2U6IHtraW5kOiAnLT4nLCB0bzoge2tleTogJ2N5Y2xlJywgdmFsdWU6IDJ9fX1dLCBpdCk7XG4gIH0pO1xuXG5cbiAgZGVzY3JpYmUoJ3JldmVyc2UgYmFzaWMgY3ljbGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXNfdignKzEgPC0gW2EgYiBjXTsnLCBbe2Zyb206IHtrZXk6ICdjeWNsZScsIHZhbHVlOiAxfSwga2V5OiAndHJhbnNpdGlvbicsIHNlOiB7a2luZDogJzwtJywgdG86IFsnYScsJ2InLCdjJ119fV0sIGl0KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3JldmVyc2UgbmVnYXRpdmUgY3ljbGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXNfdignLTEgPC0gW2EgYiBjXTsnLCBbe2Zyb206IHtrZXk6ICdjeWNsZScsIHZhbHVlOiAtMX0sIGtleTogJ3RyYW5zaXRpb24nLCBzZToge2tpbmQ6ICc8LScsIHRvOiBbJ2EnLCdiJywnYyddfX1dLCBpdCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdyZXZlcnNlIG51bGxhcnkgY3ljbGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXNfdignKzAgPC0gW2EgYiBjXTsnLCBbe2Zyb206IHtrZXk6ICdjeWNsZScsIHZhbHVlOiAwfSwga2V5OiAndHJhbnNpdGlvbicsIHNlOiB7a2luZDogJzwtJywgdG86IFsnYScsJ2InLCdjJ119fV0sIGl0KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3JldmVyc2Ugd2lkZSBjeWNsZScsIGFzeW5jIGl0ID0+IHtcbiAgICBpc192KCcrMiA8LSBbYSBiIGNdOycsIFt7ZnJvbToge2tleTogJ2N5Y2xlJywgdmFsdWU6IDJ9LCBrZXk6ICd0cmFuc2l0aW9uJywgc2U6IHtraW5kOiAnPC0nLCB0bzogWydhJywnYicsJ2MnXX19XSwgaXQpO1xuICB9KTtcblxuXG4gIGRlc2NyaWJlKCdiaWRpIGJhc2ljIGN5Y2xlJywgYXN5bmMgaXQgPT4ge1xuICAgIGlzX3YoJysxIDwtIFthIGIgY10gLT4gKzE7JywgW3tmcm9tOiB7a2V5OiAnY3ljbGUnLCB2YWx1ZTogIDF9LCBrZXk6ICd0cmFuc2l0aW9uJywgc2U6IHtraW5kOiAnPC0nLCBzZToge2tpbmQ6ICctPicsIHRvOiB7a2V5OiAnY3ljbGUnLCB2YWx1ZTogIDF9fSwgdG86IFsnYScsJ2InLCdjJ119fV0sIGl0KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2JpZGkgbmVnYXRpdmUgY3ljbGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXNfdignLTEgPC0gW2EgYiBjXSAtPiAtMTsnLCBbe2Zyb206IHtrZXk6ICdjeWNsZScsIHZhbHVlOiAtMX0sIGtleTogJ3RyYW5zaXRpb24nLCBzZToge2tpbmQ6ICc8LScsIHNlOiB7a2luZDogJy0+JywgdG86IHtrZXk6ICdjeWNsZScsIHZhbHVlOiAtMX19LCB0bzogWydhJywnYicsJ2MnXX19XSwgaXQpO1xuICB9KTtcblxuICBkZXNjcmliZSgnYmlkaSBiYXNpYy9uZWdhdGl2ZSBjeWNsZScsIGFzeW5jIGl0ID0+IHtcbiAgICBpc192KCcrMSA8LSBbYSBiIGNdIC0+IC0xOycsIFt7ZnJvbToge2tleTogJ2N5Y2xlJywgdmFsdWU6ICAxfSwga2V5OiAndHJhbnNpdGlvbicsIHNlOiB7a2luZDogJzwtJywgc2U6IHtraW5kOiAnLT4nLCB0bzoge2tleTogJ2N5Y2xlJywgdmFsdWU6IC0xfX0sIHRvOiBbJ2EnLCdiJywnYyddfX1dLCBpdCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdiaWRpIG51bGxhcnkgY3ljbGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXNfdignKzAgPC0gW2EgYiBjXSAtPiArMDsnLCBbe2Zyb206IHtrZXk6ICdjeWNsZScsIHZhbHVlOiAgMH0sIGtleTogJ3RyYW5zaXRpb24nLCBzZToge2tpbmQ6ICc8LScsIHNlOiB7a2luZDogJy0+JywgdG86IHtrZXk6ICdjeWNsZScsIHZhbHVlOiAgMH19LCB0bzogWydhJywnYicsJ2MnXX19XSwgaXQpO1xuICB9KTtcblxuICBkZXNjcmliZSgnYmlkaSB3aWRlIGN5Y2xlJywgYXN5bmMgaXQgPT4ge1xuICAgIGlzX3YoJysyIDwtIFthIGIgY10gLT4gLTI7JywgW3tmcm9tOiB7a2V5OiAnY3ljbGUnLCB2YWx1ZTogIDJ9LCBrZXk6ICd0cmFuc2l0aW9uJywgc2U6IHtraW5kOiAnPC0nLCBzZToge2tpbmQ6ICctPicsIHRvOiB7a2V5OiAnY3ljbGUnLCB2YWx1ZTogLTJ9fSwgdG86IFsnYScsJ2InLCdjJ119fV0sIGl0KTtcbiAgfSk7XG5cbi8qXG4gIGRlc2NyaWJlKCdmdWxsIHBhcnNlIG9mIDItc3RlcCBjeWNsZScsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgnW2EgYl0gLT4gKzE7JywgdCA9PiB0LmRlZXBFcXVhbChcbiAgICAgIHNtYFthIGJdIC0+ICsxO2AubGlzdF9lZGdlcygpLFxuICAgICAgW3tcImZyb21cIjpcImFcIixcInRvXCI6XCJiXCIsXCJraW5kXCI6XCJsZWdhbFwiLFwiZm9yY2VkX29ubHlcIjpmYWxzZSxcIm1haW5fcGF0aFwiOmZhbHNlfSxcbiAgICAgICB7XCJmcm9tXCI6XCJiXCIsXCJ0b1wiOlwiYVwiLFwia2luZFwiOlwibGVnYWxcIixcImZvcmNlZF9vbmx5XCI6ZmFsc2UsXCJtYWluX3BhdGhcIjpmYWxzZX1dXG4gICAgKSk7XG4gIH0pO1xuXG4vKlxuICBkZXNjcmliZSgnZnVsbCBwYXJzZSBvZiA1LXN0ZXAgY3ljbGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXQoJ1thIGIgYyBkIGVdIC0+ICsxOycsIHQgPT4gdC5kZWVwRXF1YWwoXG4gICAgICBzbWBbYSBiXSAtPiArMTtgLmxpc3RfZWRnZXMoKSxcbiAgICAgIFt7XCJmcm9tXCI6XCJhXCIsXCJ0b1wiOlwiYlwiLFwia2luZFwiOlwibGVnYWxcIixcImZvcmNlZF9vbmx5XCI6ZmFsc2UsXCJtYWluX3BhdGhcIjpmYWxzZX0sXG4gICAgICAge1wiZnJvbVwiOlwiYlwiLFwidG9cIjpcImNcIixcImtpbmRcIjpcImxlZ2FsXCIsXCJmb3JjZWRfb25seVwiOmZhbHNlLFwibWFpbl9wYXRoXCI6ZmFsc2V9LFxuICAgICAgIHtcImZyb21cIjpcImNcIixcInRvXCI6XCJkXCIsXCJraW5kXCI6XCJsZWdhbFwiLFwiZm9yY2VkX29ubHlcIjpmYWxzZSxcIm1haW5fcGF0aFwiOmZhbHNlfSxcbiAgICAgICB7XCJmcm9tXCI6XCJkXCIsXCJ0b1wiOlwiZVwiLFwia2luZFwiOlwibGVnYWxcIixcImZvcmNlZF9vbmx5XCI6ZmFsc2UsXCJtYWluX3BhdGhcIjpmYWxzZX0sXG4gICAgICAge1wiZnJvbVwiOlwiZVwiLFwidG9cIjpcImFcIixcImtpbmRcIjpcImxlZ2FsXCIsXCJmb3JjZWRfb25seVwiOmZhbHNlLFwibWFpbl9wYXRoXCI6ZmFsc2V9XVxuICAgICkpO1xuXG4gIGRlc2NyaWJlKCdmdWxsIHBhcnNlIG9mIDUtc3RlcCByZXZlcnNlIGN5Y2xlJywgYXN5bmMgaXQgPT4ge1xuICAgIGl0KCdbYSBiIGMgZCBlXSAtPiAtMTsnLCB0ID0+IHQuZGVlcEVxdWFsKFxuICAgICAgc21gW2EgYl0gLT4gKzE7YC5saXN0X2VkZ2VzKCksXG4gICAgICBbe1wiZnJvbVwiOlwiYVwiLFwidG9cIjpcImVcIixcImtpbmRcIjpcImxlZ2FsXCIsXCJmb3JjZWRfb25seVwiOmZhbHNlLFwibWFpbl9wYXRoXCI6ZmFsc2V9LFxuICAgICAgIHtcImZyb21cIjpcImJcIixcInRvXCI6XCJhXCIsXCJraW5kXCI6XCJsZWdhbFwiLFwiZm9yY2VkX29ubHlcIjpmYWxzZSxcIm1haW5fcGF0aFwiOmZhbHNlfSxcbiAgICAgICB7XCJmcm9tXCI6XCJjXCIsXCJ0b1wiOlwiYlwiLFwia2luZFwiOlwibGVnYWxcIixcImZvcmNlZF9vbmx5XCI6ZmFsc2UsXCJtYWluX3BhdGhcIjpmYWxzZX0sXG4gICAgICAge1wiZnJvbVwiOlwiZFwiLFwidG9cIjpcImNcIixcImtpbmRcIjpcImxlZ2FsXCIsXCJmb3JjZWRfb25seVwiOmZhbHNlLFwibWFpbl9wYXRoXCI6ZmFsc2V9LFxuICAgICAgIHtcImZyb21cIjpcImVcIixcInRvXCI6XCJkXCIsXCJraW5kXCI6XCJsZWdhbFwiLFwiZm9yY2VkX29ubHlcIjpmYWxzZSxcIm1haW5fcGF0aFwiOmZhbHNlfV1cbiAgICApKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2Z1bGwgcGFyc2Ugb2YgNS1zdGVwIHR3by1zdGVwIGN5Y2xlIChzdGFyKScsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgnW2EgYiBjIGQgZV0gLT4gKzI7JywgdCA9PiB0LmRlZXBFcXVhbChcbiAgICAgIHNtYFthIGJdIC0+ICsxO2AubGlzdF9lZGdlcygpLFxuICAgICAgW3tcImZyb21cIjpcImFcIixcInRvXCI6XCJjXCIsXCJraW5kXCI6XCJsZWdhbFwiLFwiZm9yY2VkX29ubHlcIjpmYWxzZSxcIm1haW5fcGF0aFwiOmZhbHNlfSxcbiAgICAgICB7XCJmcm9tXCI6XCJiXCIsXCJ0b1wiOlwiZFwiLFwia2luZFwiOlwibGVnYWxcIixcImZvcmNlZF9vbmx5XCI6ZmFsc2UsXCJtYWluX3BhdGhcIjpmYWxzZX0sXG4gICAgICAge1wiZnJvbVwiOlwiY1wiLFwidG9cIjpcImVcIixcImtpbmRcIjpcImxlZ2FsXCIsXCJmb3JjZWRfb25seVwiOmZhbHNlLFwibWFpbl9wYXRoXCI6ZmFsc2V9LFxuICAgICAgIHtcImZyb21cIjpcImRcIixcInRvXCI6XCJhXCIsXCJraW5kXCI6XCJsZWdhbFwiLFwiZm9yY2VkX29ubHlcIjpmYWxzZSxcIm1haW5fcGF0aFwiOmZhbHNlfSxcbiAgICAgICB7XCJmcm9tXCI6XCJlXCIsXCJ0b1wiOlwiYlwiLFwia2luZFwiOlwibGVnYWxcIixcImZvcmNlZF9vbmx5XCI6ZmFsc2UsXCJtYWluX3BhdGhcIjpmYWxzZX1dXG4gICAgKSk7XG4gIH0pO1xuKi9cbiAgZGVzY3JpYmUoJ2lsbGVnYWwgZnJhY3Rpb25hbCBjeWNsZSB0aHJvd3MnLCBhc3luYyBpdCA9PiB7XG4gICAgaXQoJ3Rocm93cycsIHQgPT4gdC50aHJvd3MoICgpID0+IHtcbiAgICAgIGpzc20ucGFyc2UoJ1thIGIgY10gLT4gKzIuNTsnKTtcbiAgICB9ICkpO1xuICB9KTtcblxufSk7XG4iXX0=