'use strict';

var _templateObject = _taggedTemplateLiteral(['a -> b; a: { node_color: orange; };'], ['a -> b; a: { node_color: orange; };']),
    _templateObject2 = _taggedTemplateLiteral(['a: { node_color: orange; }; a -> b;'], ['a: { node_color: orange; }; a -> b;']),
    _templateObject3 = _taggedTemplateLiteral(['a -> b; a: { node_color: orange; node_shape: circle; };'], ['a -> b; a: { node_color: orange; node_shape: circle; };']),
    _templateObject4 = _taggedTemplateLiteral(['a -> b; a:{node_color:orange;};'], ['a -> b; a:{node_color:orange;};']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm,
    jp = jssm.parse;

(0, _avaSpec.describe)('simple naming', async function (_it) {

  (0, _avaSpec.describe)('parse', async function (it) {

    it('trans then node', function (t) {
      return t.notThrows(function () {
        jp('a -> b; a: { node_color: orange; };');
      });
    });
    it('node then trans', function (t) {
      return t.notThrows(function () {
        jp('a: { node_color: orange; }; a -> b;');
      });
    });
    it('cycle node named', function (t) {
      return t.notThrows(function () {
        jp('[a b] -> +1; a: { node_color: red; }; &b: [a c e];');
      });
    });

    it('two properties', function (t) {
      return t.notThrows(function () {
        jp('a -> b; a: { node_color: orange; node_shape: circle; };');
      });
    });
  });

  (0, _avaSpec.describe)('sm tag', async function (it) {

    it('trans then node', function (t) {
      return t.notThrows(function () {
        sm(_templateObject);
      });
    });
    it('node then trans', function (t) {
      return t.notThrows(function () {
        sm(_templateObject2);
      });
    });
    //  it('cycle node named', t => t.notThrows(() => { sm`[a b] -> +1; a: { node_color: red; }; &b: [a c e];`; }) );

    it('two properties', function (t) {
      return t.notThrows(function () {
        sm(_templateObject3);
      });
    });
  });
});

(0, _avaSpec.describe)('spacing variants', async function (it) {

  it('tight', function (t) {
    return t.notThrows(function () {
      jp('a -> b; a:{node_color:orange;};');
    });
  });
  it('framed', function (t) {
    return t.notThrows(function () {
      jp('a -> b; a:{ node_color:orange; };');
    });
  });
  it('sentence', function (t) {
    return t.notThrows(function () {
      jp('a -> b; a:{ node_color: orange; };');
    });
  });
  it('fully', function (t) {
    return t.notThrows(function () {
      jp('a -> b; a:{ node_color : orange; };');
    });
  });
  it('mars', function (t) {
    return t.notThrows(function () {
      jp('a -> b; a:{node_color : orange;};');
    });
  });
});

(0, _avaSpec.describe)('properties', async function (it) {

  it('node_color', function (t) {
    return t.deepEqual({ key: "node_color", value: "#ffa500ff" }, sm(_templateObject4).raw_state_declarations()[0]);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9ub21pbmF0ZWQgc3RhdGVzLmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwic20iLCJqcCIsInBhcnNlIiwiX2l0IiwiaXQiLCJ0Iiwibm90VGhyb3dzIiwiZGVlcEVxdWFsIiwia2V5IiwidmFsdWUiLCJyYXdfc3RhdGVfZGVjbGFyYXRpb25zIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQ0E7Ozs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFBQSxJQUNNQyxLQUFPRixLQUFLRSxFQURsQjtBQUFBLElBRU1DLEtBQU9ILEtBQUtJLEtBRmxCOztBQVFBLHVCQUFTLGVBQVQsRUFBMEIsZ0JBQU1DLEdBQU4sRUFBYTs7QUFFckMseUJBQVMsT0FBVCxFQUFrQixnQkFBTUMsRUFBTixFQUFZOztBQUU1QkEsT0FBRyxpQkFBSCxFQUF1QjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUVMLFdBQUcscUNBQUg7QUFBNEMsT0FBaEUsQ0FBTDtBQUFBLEtBQXZCO0FBQ0FHLE9BQUcsaUJBQUgsRUFBdUI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFTCxXQUFHLHFDQUFIO0FBQTRDLE9BQWhFLENBQUw7QUFBQSxLQUF2QjtBQUNBRyxPQUFHLGtCQUFILEVBQXVCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRUwsV0FBRyxvREFBSDtBQUEyRCxPQUEvRSxDQUFMO0FBQUEsS0FBdkI7O0FBRUFHLE9BQUcsZ0JBQUgsRUFBdUI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFTCxXQUFHLHlEQUFIO0FBQWdFLE9BQXBGLENBQUw7QUFBQSxLQUF2QjtBQUVELEdBUkQ7O0FBVUEseUJBQVMsUUFBVCxFQUFtQixnQkFBTUcsRUFBTixFQUFZOztBQUU3QkEsT0FBRyxpQkFBSCxFQUF1QjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUVOO0FBQTBDLE9BQTlELENBQUw7QUFBQSxLQUF2QjtBQUNBSSxPQUFHLGlCQUFILEVBQXVCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRU47QUFBMEMsT0FBOUQsQ0FBTDtBQUFBLEtBQXZCO0FBQ0o7O0FBRUlJLE9BQUcsZ0JBQUgsRUFBdUI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFTjtBQUE4RCxPQUFsRixDQUFMO0FBQUEsS0FBdkI7QUFFRCxHQVJEO0FBVUQsQ0F0QkQ7O0FBNEJBLHVCQUFTLGtCQUFULEVBQTZCLGdCQUFNSSxFQUFOLEVBQVk7O0FBRXZDQSxLQUFHLE9BQUgsRUFBZTtBQUFBLFdBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUVMLFNBQUcsaUNBQUg7QUFBd0MsS0FBNUQsQ0FBTDtBQUFBLEdBQWY7QUFDQUcsS0FBRyxRQUFILEVBQWU7QUFBQSxXQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFTCxTQUFHLG1DQUFIO0FBQTBDLEtBQTlELENBQUw7QUFBQSxHQUFmO0FBQ0FHLEtBQUcsVUFBSCxFQUFlO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRUwsU0FBRyxvQ0FBSDtBQUEyQyxLQUEvRCxDQUFMO0FBQUEsR0FBZjtBQUNBRyxLQUFHLE9BQUgsRUFBZTtBQUFBLFdBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUVMLFNBQUcscUNBQUg7QUFBNEMsS0FBaEUsQ0FBTDtBQUFBLEdBQWY7QUFDQUcsS0FBRyxNQUFILEVBQWU7QUFBQSxXQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFTCxTQUFHLG1DQUFIO0FBQTBDLEtBQTlELENBQUw7QUFBQSxHQUFmO0FBRUQsQ0FSRDs7QUFjQSx1QkFBUyxZQUFULEVBQXVCLGdCQUFNRyxFQUFOLEVBQVk7O0FBRWpDQSxLQUFHLFlBQUgsRUFBaUI7QUFBQSxXQUFLQyxFQUFFRSxTQUFGLENBQ3BCLEVBQUNDLEtBQUssWUFBTixFQUFvQkMsT0FBTyxXQUEzQixFQURvQixFQUVwQlQscUJBQW9DVSxzQkFBcEMsR0FBNkQsQ0FBN0QsQ0FGb0IsQ0FBTDtBQUFBLEdBQWpCO0FBS0QsQ0FQRCIsImZpbGUiOiJub21pbmF0ZWQgc3RhdGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQge2Rlc2NyaWJlfSBmcm9tICdhdmEtc3BlYyc7XG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpLFxuICAgICAgc20gICA9IGpzc20uc20sXG4gICAgICBqcCAgID0ganNzbS5wYXJzZTtcblxuXG5cblxuXG5kZXNjcmliZSgnc2ltcGxlIG5hbWluZycsIGFzeW5jIF9pdCA9PiB7XG5cbiAgZGVzY3JpYmUoJ3BhcnNlJywgYXN5bmMgaXQgPT4ge1xuXG4gICAgaXQoJ3RyYW5zIHRoZW4gbm9kZScsICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsganAoJ2EgLT4gYjsgYTogeyBub2RlX2NvbG9yOiBvcmFuZ2U7IH07Jyk7IH0pICk7XG4gICAgaXQoJ25vZGUgdGhlbiB0cmFucycsICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsganAoJ2E6IHsgbm9kZV9jb2xvcjogb3JhbmdlOyB9OyBhIC0+IGI7Jyk7IH0pICk7XG4gICAgaXQoJ2N5Y2xlIG5vZGUgbmFtZWQnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsganAoJ1thIGJdIC0+ICsxOyBhOiB7IG5vZGVfY29sb3I6IHJlZDsgfTsgJmI6IFthIGMgZV07Jyk7IH0pICk7XG5cbiAgICBpdCgndHdvIHByb3BlcnRpZXMnLCAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBqcCgnYSAtPiBiOyBhOiB7IG5vZGVfY29sb3I6IG9yYW5nZTsgbm9kZV9zaGFwZTogY2lyY2xlOyB9OycpOyB9KSApO1xuXG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdzbSB0YWcnLCBhc3luYyBpdCA9PiB7XG5cbiAgICBpdCgndHJhbnMgdGhlbiBub2RlJywgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBzbWBhIC0+IGI7IGE6IHsgbm9kZV9jb2xvcjogb3JhbmdlOyB9O2A7IH0pICk7XG4gICAgaXQoJ25vZGUgdGhlbiB0cmFucycsICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgc21gYTogeyBub2RlX2NvbG9yOiBvcmFuZ2U7IH07IGEgLT4gYjtgOyB9KSApO1xuLy8gIGl0KCdjeWNsZSBub2RlIG5hbWVkJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IHNtYFthIGJdIC0+ICsxOyBhOiB7IG5vZGVfY29sb3I6IHJlZDsgfTsgJmI6IFthIGMgZV07YDsgfSkgKTtcblxuICAgIGl0KCd0d28gcHJvcGVydGllcycsICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IHNtYGEgLT4gYjsgYTogeyBub2RlX2NvbG9yOiBvcmFuZ2U7IG5vZGVfc2hhcGU6IGNpcmNsZTsgfTtgOyB9KSApO1xuXG4gIH0pO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnc3BhY2luZyB2YXJpYW50cycsIGFzeW5jIGl0ID0+IHtcblxuICBpdCgndGlnaHQnLCAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsganAoJ2EgLT4gYjsgYTp7bm9kZV9jb2xvcjpvcmFuZ2U7fTsnKTsgfSkgKTtcbiAgaXQoJ2ZyYW1lZCcsICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGpwKCdhIC0+IGI7IGE6eyBub2RlX2NvbG9yOm9yYW5nZTsgfTsnKTsgfSkgKTtcbiAgaXQoJ3NlbnRlbmNlJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGpwKCdhIC0+IGI7IGE6eyBub2RlX2NvbG9yOiBvcmFuZ2U7IH07Jyk7IH0pICk7XG4gIGl0KCdmdWxseScsICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBqcCgnYSAtPiBiOyBhOnsgbm9kZV9jb2xvciA6IG9yYW5nZTsgfTsnKTsgfSkgKTtcbiAgaXQoJ21hcnMnLCAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGpwKCdhIC0+IGI7IGE6e25vZGVfY29sb3IgOiBvcmFuZ2U7fTsnKTsgfSkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3Byb3BlcnRpZXMnLCBhc3luYyBpdCA9PiB7XG5cbiAgaXQoJ25vZGVfY29sb3InLCB0ID0+IHQuZGVlcEVxdWFsKFxuICAgIHtrZXk6IFwibm9kZV9jb2xvclwiLCB2YWx1ZTogXCIjZmZhNTAwZmZcIn0sXG4gICAgc21gYSAtPiBiOyBhOntub2RlX2NvbG9yOm9yYW5nZTt9O2AucmF3X3N0YXRlX2RlY2xhcmF0aW9ucygpWzBdXG4gICkpO1xuXG59KTtcbiJdfQ==