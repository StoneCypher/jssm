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
  /*
    describe('full parse', async it => {
      it('[a b] -> +1;', t => t.deepEqual(
        sm`[a b] -> +1;`.list_edges(),
        [{"from":"a","to":"b","kind":"legal","forced_only":false,"main_path":false},{"from":"b","to":"a","kind":"legal","forced_only":false,"main_path":false}]
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9jeWNsZXMuanMiXSwibmFtZXMiOlsianNzbSIsInJlcXVpcmUiLCJzbSIsIl9pdCIsImlzX3YiLCJzdHIiLCJ2IiwiaXQiLCJ0IiwiZGVlcEVxdWFsIiwicGFyc2UiLCJmcm9tIiwia2V5Iiwic2UiLCJraW5kIiwidG8iLCJ2YWx1ZSIsInRocm93cyJdLCJtYXBwaW5ncyI6Ijs7QUFHQTs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFBQSxJQUNNQyxLQUFPRixLQUFLRSxFQURsQjtBQUpBOztBQVdBLHVCQUFTLGtCQUFULEVBQTZCLGdCQUFNQyxHQUFOLEVBQWE7O0FBRXhDLE1BQU1DLE9BQU8sU0FBUEEsSUFBTyxDQUFDQyxHQUFELEVBQU1DLENBQU4sRUFBU0MsRUFBVDtBQUFBLFdBQWdCQSxrQkFBUztBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWUgsQ0FBWixFQUFlTixLQUFLVSxLQUFMLENBQVdMLEdBQVgsQ0FBZixDQUFMO0FBQUEsS0FBVCxDQUFoQjtBQUFBLEdBQWI7O0FBRUEseUJBQVMsYUFBVCxFQUF3QixnQkFBTUUsRUFBTixFQUFZO0FBQ2xDSCxTQUFLLGdCQUFMLEVBQXVCLENBQUMsRUFBQ08sTUFBTSxDQUFDLEdBQUQsRUFBSyxHQUFMLEVBQVMsR0FBVCxDQUFQLEVBQXNCQyxLQUFLLFlBQTNCLEVBQXlDQyxJQUFJLEVBQUNDLE1BQU0sSUFBUCxFQUFhQyxJQUFJLEVBQUNILEtBQUssT0FBTixFQUFlSSxPQUFPLENBQXRCLEVBQWpCLEVBQTdDLEVBQUQsQ0FBdkIsRUFBbUhULEVBQW5IO0FBQ0QsR0FGRDs7QUFJQSx5QkFBUyxnQkFBVCxFQUEyQixnQkFBTUEsRUFBTixFQUFZO0FBQ3JDSCxTQUFLLGdCQUFMLEVBQXVCLENBQUMsRUFBQ08sTUFBTSxDQUFDLEdBQUQsRUFBSyxHQUFMLEVBQVMsR0FBVCxDQUFQLEVBQXNCQyxLQUFLLFlBQTNCLEVBQXlDQyxJQUFJLEVBQUNDLE1BQU0sSUFBUCxFQUFhQyxJQUFJLEVBQUNILEtBQUssT0FBTixFQUFlSSxPQUFPLENBQUMsQ0FBdkIsRUFBakIsRUFBN0MsRUFBRCxDQUF2QixFQUFvSFQsRUFBcEg7QUFDRCxHQUZEOztBQUlBLHlCQUFTLGVBQVQsRUFBMEIsZ0JBQU1BLEVBQU4sRUFBWTtBQUNwQ0gsU0FBSyxnQkFBTCxFQUF1QixDQUFDLEVBQUNPLE1BQU0sQ0FBQyxHQUFELEVBQUssR0FBTCxFQUFTLEdBQVQsQ0FBUCxFQUFzQkMsS0FBSyxZQUEzQixFQUF5Q0MsSUFBSSxFQUFDQyxNQUFNLElBQVAsRUFBYUMsSUFBSSxFQUFDSCxLQUFLLE9BQU4sRUFBZUksT0FBTyxDQUF0QixFQUFqQixFQUE3QyxFQUFELENBQXZCLEVBQW1IVCxFQUFuSDtBQUNELEdBRkQ7O0FBSUEseUJBQVMsWUFBVCxFQUF1QixnQkFBTUEsRUFBTixFQUFZO0FBQ2pDSCxTQUFLLGdCQUFMLEVBQXVCLENBQUMsRUFBQ08sTUFBTSxDQUFDLEdBQUQsRUFBSyxHQUFMLEVBQVMsR0FBVCxDQUFQLEVBQXNCQyxLQUFLLFlBQTNCLEVBQXlDQyxJQUFJLEVBQUNDLE1BQU0sSUFBUCxFQUFhQyxJQUFJLEVBQUNILEtBQUssT0FBTixFQUFlSSxPQUFPLENBQXRCLEVBQWpCLEVBQTdDLEVBQUQsQ0FBdkIsRUFBbUhULEVBQW5IO0FBQ0QsR0FGRDtBQUdGOzs7Ozs7OztBQVFFLHlCQUFTLGlDQUFULEVBQTRDLGdCQUFNQSxFQUFOLEVBQVk7QUFDdERBLE9BQUcsUUFBSCxFQUFhO0FBQUEsYUFBS0MsRUFBRVMsTUFBRixDQUFVLFlBQU07QUFDaENqQixhQUFLVSxLQUFMLENBQVcsa0JBQVg7QUFDRCxPQUZpQixDQUFMO0FBQUEsS0FBYjtBQUdELEdBSkQ7QUFNRCxDQWpDRCIsImZpbGUiOiJjeWNsZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cblxuaW1wb3J0IHt0ZXN0LCBkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKSxcbiAgICAgIHNtICAgPSBqc3NtLnNtO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdjeWNsZSBzdHJhdGVnaWVzJywgYXN5bmMgX2l0ID0+IHtcblxuICBjb25zdCBpc192ID0gKHN0ciwgdiwgaXQpID0+IGl0KHRlc3QsIHQgPT4gdC5kZWVwRXF1YWwodiwganNzbS5wYXJzZShzdHIpKSk7XG5cbiAgZGVzY3JpYmUoJ2Jhc2ljIGN5Y2xlJywgYXN5bmMgaXQgPT4ge1xuICAgIGlzX3YoJ1thIGIgY10gLT4gKzE7JywgW3tmcm9tOiBbJ2EnLCdiJywnYyddLCBrZXk6ICd0cmFuc2l0aW9uJywgc2U6IHtraW5kOiAnLT4nLCB0bzoge2tleTogJ2N5Y2xlJywgdmFsdWU6IDF9fX1dLCBpdCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCduZWdhdGl2ZSBjeWNsZScsIGFzeW5jIGl0ID0+IHtcbiAgICBpc192KCdbYSBiIGNdIC0+IC0xOycsIFt7ZnJvbTogWydhJywnYicsJ2MnXSwga2V5OiAndHJhbnNpdGlvbicsIHNlOiB7a2luZDogJy0+JywgdG86IHtrZXk6ICdjeWNsZScsIHZhbHVlOiAtMX19fV0sIGl0KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ251bGxhcnkgY3ljbGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXNfdignW2EgYiBjXSAtPiArMDsnLCBbe2Zyb206IFsnYScsJ2InLCdjJ10sIGtleTogJ3RyYW5zaXRpb24nLCBzZToge2tpbmQ6ICctPicsIHRvOiB7a2V5OiAnY3ljbGUnLCB2YWx1ZTogMH19fV0sIGl0KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3dpZGUgY3ljbGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXNfdignW2EgYiBjXSAtPiArMjsnLCBbe2Zyb206IFsnYScsJ2InLCdjJ10sIGtleTogJ3RyYW5zaXRpb24nLCBzZToge2tpbmQ6ICctPicsIHRvOiB7a2V5OiAnY3ljbGUnLCB2YWx1ZTogMn19fV0sIGl0KTtcbiAgfSk7XG4vKlxuICBkZXNjcmliZSgnZnVsbCBwYXJzZScsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgnW2EgYl0gLT4gKzE7JywgdCA9PiB0LmRlZXBFcXVhbChcbiAgICAgIHNtYFthIGJdIC0+ICsxO2AubGlzdF9lZGdlcygpLFxuICAgICAgW3tcImZyb21cIjpcImFcIixcInRvXCI6XCJiXCIsXCJraW5kXCI6XCJsZWdhbFwiLFwiZm9yY2VkX29ubHlcIjpmYWxzZSxcIm1haW5fcGF0aFwiOmZhbHNlfSx7XCJmcm9tXCI6XCJiXCIsXCJ0b1wiOlwiYVwiLFwia2luZFwiOlwibGVnYWxcIixcImZvcmNlZF9vbmx5XCI6ZmFsc2UsXCJtYWluX3BhdGhcIjpmYWxzZX1dXG4gICAgKSk7XG4gIH0pO1xuKi9cbiAgZGVzY3JpYmUoJ2lsbGVnYWwgZnJhY3Rpb25hbCBjeWNsZSB0aHJvd3MnLCBhc3luYyBpdCA9PiB7XG4gICAgaXQoJ3Rocm93cycsIHQgPT4gdC50aHJvd3MoICgpID0+IHtcbiAgICAgIGpzc20ucGFyc2UoJ1thIGIgY10gLT4gKzIuNTsnKTtcbiAgICB9ICkpO1xuICB9KTtcblxufSk7XG4iXX0=