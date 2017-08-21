'use strict';

var _templateObject = _taggedTemplateLiteral(['start_nodes: [a b c]; a->b->c->d;'], ['start_nodes: [a b c]; a->b->c->d;']),
    _templateObject2 = _taggedTemplateLiteral(['end_nodes:   [a b c]; a->b->c->d;'], ['end_nodes:   [a b c]; a->b->c->d;']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }
/* eslint-disable max-len */

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

(0, _avaSpec.describe)('graph node lists', async function (it) {

  it('start nodes don\'t throw', function (t) {
    return t.notThrows(function () {
      var _a = sm(_templateObject);
    });
  });
  it('end nodes don\'t throw', function (t) {
    return t.notThrows(function () {
      var _a = sm(_templateObject2);
    });
  });

  // comeback whargarbl
  //  const overrider = make(` a->b->c; start_nodes: [c]; `);
  //  it('start nodes override initial node', t => t.is(0, () => {}) );
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9ncmFwaCBub2RlIGxpc3RzLmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwic20iLCJpdCIsInQiLCJub3RUaHJvd3MiLCJfYSJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFHQTs7O0FBRkE7O0FBSUEsSUFBTUEsT0FBT0MsUUFBUSw0QkFBUixDQUFiO0FBQUEsSUFDTUMsS0FBT0YsS0FBS0UsRUFEbEI7O0FBT0EsdUJBQVMsa0JBQVQsRUFBNkIsZ0JBQU1DLEVBQU4sRUFBWTs7QUFFdkNBLEtBQUcsMEJBQUgsRUFBK0I7QUFBQSxXQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1DLEtBQUtKLEVBQUwsaUJBQU47QUFBbUQsS0FBdkUsQ0FBTDtBQUFBLEdBQS9CO0FBQ0FDLEtBQUcsd0JBQUgsRUFBK0I7QUFBQSxXQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1DLEtBQUtKLEVBQUwsa0JBQU47QUFBbUQsS0FBdkUsQ0FBTDtBQUFBLEdBQS9COztBQUVGO0FBQ0E7QUFDQTtBQUVDLENBVEQiLCJmaWxlIjoiZ3JhcGggbm9kZSBsaXN0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuXG5pbXBvcnQge2Rlc2NyaWJlfSBmcm9tICdhdmEtc3BlYyc7XG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpLFxuICAgICAgc20gICA9IGpzc20uc207XG5cblxuXG5cblxuZGVzY3JpYmUoJ2dyYXBoIG5vZGUgbGlzdHMnLCBhc3luYyBpdCA9PiB7XG5cbiAgaXQoJ3N0YXJ0IG5vZGVzIGRvblxcJ3QgdGhyb3cnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2EgPSBzbWBzdGFydF9ub2RlczogW2EgYiBjXTsgYS0+Yi0+Yy0+ZDtgOyB9KSApO1xuICBpdCgnZW5kIG5vZGVzIGRvblxcJ3QgdGhyb3cnLCAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfYSA9IHNtYGVuZF9ub2RlczogICBbYSBiIGNdOyBhLT5iLT5jLT5kO2A7IH0pICk7XG5cbi8vIGNvbWViYWNrIHdoYXJnYXJibFxuLy8gIGNvbnN0IG92ZXJyaWRlciA9IG1ha2UoYCBhLT5iLT5jOyBzdGFydF9ub2RlczogW2NdOyBgKTtcbi8vICBpdCgnc3RhcnQgbm9kZXMgb3ZlcnJpZGUgaW5pdGlhbCBub2RlJywgdCA9PiB0LmlzKDAsICgpID0+IHt9KSApO1xuXG59KTtcbiJdfQ==