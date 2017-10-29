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
    return t.deepEqual({ state: 'a', node_color: '#ffa500ff', declarations: [{ key: "node_color", value: "#ffa500ff" }] }, sm(_templateObject4).raw_state_declarations()[0]);
  });
});

// test state_delarations/0
// test state_delaration/1 for has
// test state_delaration/1 for doesn't have
// test that redeclaring a state throws
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9ub21pbmF0ZWQgc3RhdGVzLmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwic20iLCJqcCIsInBhcnNlIiwiX2l0IiwiaXQiLCJ0Iiwibm90VGhyb3dzIiwiZGVlcEVxdWFsIiwic3RhdGUiLCJub2RlX2NvbG9yIiwiZGVjbGFyYXRpb25zIiwia2V5IiwidmFsdWUiLCJyYXdfc3RhdGVfZGVjbGFyYXRpb25zIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQ0E7Ozs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFBQSxJQUNNQyxLQUFPRixLQUFLRSxFQURsQjtBQUFBLElBRU1DLEtBQU9ILEtBQUtJLEtBRmxCOztBQVFBLHVCQUFTLGVBQVQsRUFBMEIsZ0JBQU1DLEdBQU4sRUFBYTs7QUFFckMseUJBQVMsT0FBVCxFQUFrQixnQkFBTUMsRUFBTixFQUFZOztBQUU1QkEsT0FBRyxpQkFBSCxFQUF1QjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUVMLFdBQUcscUNBQUg7QUFBNEMsT0FBaEUsQ0FBTDtBQUFBLEtBQXZCO0FBQ0FHLE9BQUcsaUJBQUgsRUFBdUI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFTCxXQUFHLHFDQUFIO0FBQTRDLE9BQWhFLENBQUw7QUFBQSxLQUF2QjtBQUNBRyxPQUFHLGtCQUFILEVBQXVCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRUwsV0FBRyxvREFBSDtBQUEyRCxPQUEvRSxDQUFMO0FBQUEsS0FBdkI7O0FBRUFHLE9BQUcsZ0JBQUgsRUFBdUI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFTCxXQUFHLHlEQUFIO0FBQWdFLE9BQXBGLENBQUw7QUFBQSxLQUF2QjtBQUVELEdBUkQ7O0FBVUEseUJBQVMsUUFBVCxFQUFtQixnQkFBTUcsRUFBTixFQUFZOztBQUU3QkEsT0FBRyxpQkFBSCxFQUF1QjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUVOO0FBQTBDLE9BQTlELENBQUw7QUFBQSxLQUF2QjtBQUNBSSxPQUFHLGlCQUFILEVBQXVCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRU47QUFBMEMsT0FBOUQsQ0FBTDtBQUFBLEtBQXZCO0FBQ0o7O0FBRUlJLE9BQUcsZ0JBQUgsRUFBdUI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFTjtBQUE4RCxPQUFsRixDQUFMO0FBQUEsS0FBdkI7QUFFRCxHQVJEO0FBVUQsQ0F0QkQ7O0FBNEJBLHVCQUFTLGtCQUFULEVBQTZCLGdCQUFNSSxFQUFOLEVBQVk7O0FBRXZDQSxLQUFHLE9BQUgsRUFBZTtBQUFBLFdBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUVMLFNBQUcsaUNBQUg7QUFBd0MsS0FBNUQsQ0FBTDtBQUFBLEdBQWY7QUFDQUcsS0FBRyxRQUFILEVBQWU7QUFBQSxXQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFTCxTQUFHLG1DQUFIO0FBQTBDLEtBQTlELENBQUw7QUFBQSxHQUFmO0FBQ0FHLEtBQUcsVUFBSCxFQUFlO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRUwsU0FBRyxvQ0FBSDtBQUEyQyxLQUEvRCxDQUFMO0FBQUEsR0FBZjtBQUNBRyxLQUFHLE9BQUgsRUFBZTtBQUFBLFdBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUVMLFNBQUcscUNBQUg7QUFBNEMsS0FBaEUsQ0FBTDtBQUFBLEdBQWY7QUFDQUcsS0FBRyxNQUFILEVBQWU7QUFBQSxXQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFTCxTQUFHLG1DQUFIO0FBQTBDLEtBQTlELENBQUw7QUFBQSxHQUFmO0FBRUQsQ0FSRDs7QUFjQSx1QkFBUyxZQUFULEVBQXVCLGdCQUFNRyxFQUFOLEVBQVk7O0FBRWpDQSxLQUFHLFlBQUgsRUFBaUI7QUFBQSxXQUFLQyxFQUFFRSxTQUFGLENBQ3BCLEVBQUNDLE9BQU0sR0FBUCxFQUFZQyxZQUFXLFdBQXZCLEVBQW9DQyxjQUFhLENBQUMsRUFBQ0MsS0FBSyxZQUFOLEVBQW9CQyxPQUFPLFdBQTNCLEVBQUQsQ0FBakQsRUFEb0IsRUFFcEJaLHFCQUFvQ2Esc0JBQXBDLEdBQTZELENBQTdELENBRm9CLENBQUw7QUFBQSxHQUFqQjtBQUtELENBUEQ7O0FBU0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibm9taW5hdGVkIHN0YXRlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKSxcbiAgICAgIHNtICAgPSBqc3NtLnNtLFxuICAgICAganAgICA9IGpzc20ucGFyc2U7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3NpbXBsZSBuYW1pbmcnLCBhc3luYyBfaXQgPT4ge1xuXG4gIGRlc2NyaWJlKCdwYXJzZScsIGFzeW5jIGl0ID0+IHtcblxuICAgIGl0KCd0cmFucyB0aGVuIG5vZGUnLCAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGpwKCdhIC0+IGI7IGE6IHsgbm9kZV9jb2xvcjogb3JhbmdlOyB9OycpOyB9KSApO1xuICAgIGl0KCdub2RlIHRoZW4gdHJhbnMnLCAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGpwKCdhOiB7IG5vZGVfY29sb3I6IG9yYW5nZTsgfTsgYSAtPiBiOycpOyB9KSApO1xuICAgIGl0KCdjeWNsZSBub2RlIG5hbWVkJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGpwKCdbYSBiXSAtPiArMTsgYTogeyBub2RlX2NvbG9yOiByZWQ7IH07ICZiOiBbYSBjIGVdOycpOyB9KSApO1xuXG4gICAgaXQoJ3R3byBwcm9wZXJ0aWVzJywgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsganAoJ2EgLT4gYjsgYTogeyBub2RlX2NvbG9yOiBvcmFuZ2U7IG5vZGVfc2hhcGU6IGNpcmNsZTsgfTsnKTsgfSkgKTtcblxuICB9KTtcblxuICBkZXNjcmliZSgnc20gdGFnJywgYXN5bmMgaXQgPT4ge1xuXG4gICAgaXQoJ3RyYW5zIHRoZW4gbm9kZScsICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgc21gYSAtPiBiOyBhOiB7IG5vZGVfY29sb3I6IG9yYW5nZTsgfTtgOyB9KSApO1xuICAgIGl0KCdub2RlIHRoZW4gdHJhbnMnLCAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IHNtYGE6IHsgbm9kZV9jb2xvcjogb3JhbmdlOyB9OyBhIC0+IGI7YDsgfSkgKTtcbi8vICBpdCgnY3ljbGUgbm9kZSBuYW1lZCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBzbWBbYSBiXSAtPiArMTsgYTogeyBub2RlX2NvbG9yOiByZWQ7IH07ICZiOiBbYSBjIGVdO2A7IH0pICk7XG5cbiAgICBpdCgndHdvIHByb3BlcnRpZXMnLCAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBzbWBhIC0+IGI7IGE6IHsgbm9kZV9jb2xvcjogb3JhbmdlOyBub2RlX3NoYXBlOiBjaXJjbGU7IH07YDsgfSkgKTtcblxuICB9KTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3NwYWNpbmcgdmFyaWFudHMnLCBhc3luYyBpdCA9PiB7XG5cbiAgaXQoJ3RpZ2h0JywgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGpwKCdhIC0+IGI7IGE6e25vZGVfY29sb3I6b3JhbmdlO307Jyk7IH0pICk7XG4gIGl0KCdmcmFtZWQnLCAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBqcCgnYSAtPiBiOyBhOnsgbm9kZV9jb2xvcjpvcmFuZ2U7IH07Jyk7IH0pICk7XG4gIGl0KCdzZW50ZW5jZScsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBqcCgnYSAtPiBiOyBhOnsgbm9kZV9jb2xvcjogb3JhbmdlOyB9OycpOyB9KSApO1xuICBpdCgnZnVsbHknLCAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsganAoJ2EgLT4gYjsgYTp7IG5vZGVfY29sb3IgOiBvcmFuZ2U7IH07Jyk7IH0pICk7XG4gIGl0KCdtYXJzJywgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBqcCgnYSAtPiBiOyBhOntub2RlX2NvbG9yIDogb3JhbmdlO307Jyk7IH0pICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdwcm9wZXJ0aWVzJywgYXN5bmMgaXQgPT4ge1xuXG4gIGl0KCdub2RlX2NvbG9yJywgdCA9PiB0LmRlZXBFcXVhbChcbiAgICB7c3RhdGU6J2EnLCBub2RlX2NvbG9yOicjZmZhNTAwZmYnLCBkZWNsYXJhdGlvbnM6W3trZXk6IFwibm9kZV9jb2xvclwiLCB2YWx1ZTogXCIjZmZhNTAwZmZcIn1dfSxcbiAgICBzbWBhIC0+IGI7IGE6e25vZGVfY29sb3I6b3JhbmdlO307YC5yYXdfc3RhdGVfZGVjbGFyYXRpb25zKClbMF1cbiAgKSk7XG5cbn0pO1xuXG4vLyB0ZXN0IHN0YXRlX2RlbGFyYXRpb25zLzBcbi8vIHRlc3Qgc3RhdGVfZGVsYXJhdGlvbi8xIGZvciBoYXNcbi8vIHRlc3Qgc3RhdGVfZGVsYXJhdGlvbi8xIGZvciBkb2Vzbid0IGhhdmVcbi8vIHRlc3QgdGhhdCByZWRlY2xhcmluZyBhIHN0YXRlIHRocm93c1xuXG5cbiJdfQ==