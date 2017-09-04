'use strict';

var _templateObject = _taggedTemplateLiteral(['graph_layout: circo; a->b->c->d->e->f->a;'], ['graph_layout: circo; a->b->c->d->e->f->a;']),
    _templateObject2 = _taggedTemplateLiteral(['graph_layout: circo; graph_layout: circo; a->b->c->d->e->f->a;'], ['graph_layout: circo; graph_layout: circo; a->b->c->d->e->f->a;']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }
/* eslint-disable max-len */

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

(0, _avaSpec.describe)('graph attributes don\'t throw', async function (it) {
  var machine = sm(_templateObject);
  it('layout is circo', function (t) {
    return t.is('circo', machine.graph_layout());
  });
});

(0, _avaSpec.describe)('error catchery', async function (_parse_it) {

  (0, _avaSpec.describe)('double graph_layout', async function (it) {
    it('throws', function (t) {
      return t.throws(function () {
        var _machine = sm(_templateObject2);
      });
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9sYXlvdXQuanMiXSwibmFtZXMiOlsianNzbSIsInJlcXVpcmUiLCJzbSIsIml0IiwibWFjaGluZSIsInQiLCJpcyIsImdyYXBoX2xheW91dCIsIl9wYXJzZV9pdCIsInRocm93cyIsIl9tYWNoaW5lIl0sIm1hcHBpbmdzIjoiOzs7OztBQUdBOzs7QUFGQTs7QUFJQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFBQSxJQUNNQyxLQUFPRixLQUFLRSxFQURsQjs7QUFPQSx1QkFBUywrQkFBVCxFQUEwQyxnQkFBTUMsRUFBTixFQUFZO0FBQ3BELE1BQU1DLFVBQVVGLEVBQVYsaUJBQU47QUFDQUMsS0FBRyxpQkFBSCxFQUFzQjtBQUFBLFdBQUtFLEVBQUVDLEVBQUYsQ0FBSyxPQUFMLEVBQWNGLFFBQVFHLFlBQVIsRUFBZCxDQUFMO0FBQUEsR0FBdEI7QUFDRCxDQUhEOztBQVNBLHVCQUFTLGdCQUFULEVBQTJCLGdCQUFNQyxTQUFOLEVBQW1COztBQUU1Qyx5QkFBUyxxQkFBVCxFQUFnQyxnQkFBTUwsRUFBTixFQUFZO0FBQzFDQSxPQUFHLFFBQUgsRUFBYTtBQUFBLGFBQUtFLEVBQUVJLE1BQUYsQ0FBVSxZQUFNO0FBQ2hDLFlBQU1DLFdBQVdSLEVBQVgsa0JBQU47QUFDRCxPQUZpQixDQUFMO0FBQUEsS0FBYjtBQUdELEdBSkQ7QUFNRCxDQVJEIiwiZmlsZSI6ImxheW91dC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuXG5pbXBvcnQge2Rlc2NyaWJlfSBmcm9tICdhdmEtc3BlYyc7XG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpLFxuICAgICAgc20gICA9IGpzc20uc207XG5cblxuXG5cblxuZGVzY3JpYmUoJ2dyYXBoIGF0dHJpYnV0ZXMgZG9uXFwndCB0aHJvdycsIGFzeW5jIGl0ID0+IHtcbiAgY29uc3QgbWFjaGluZSA9IHNtYGdyYXBoX2xheW91dDogY2lyY287IGEtPmItPmMtPmQtPmUtPmYtPmE7YDtcbiAgaXQoJ2xheW91dCBpcyBjaXJjbycsIHQgPT4gdC5pcygnY2lyY28nLCBtYWNoaW5lLmdyYXBoX2xheW91dCgpICkpO1xufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ2Vycm9yIGNhdGNoZXJ5JywgYXN5bmMgX3BhcnNlX2l0ID0+IHtcblxuICBkZXNjcmliZSgnZG91YmxlIGdyYXBoX2xheW91dCcsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgndGhyb3dzJywgdCA9PiB0LnRocm93cyggKCkgPT4ge1xuICAgICAgY29uc3QgX21hY2hpbmUgPSBzbWBncmFwaF9sYXlvdXQ6IGNpcmNvOyBncmFwaF9sYXlvdXQ6IGNpcmNvOyBhLT5iLT5jLT5kLT5lLT5mLT5hO2A7XG4gICAgfSApKTtcbiAgfSk7XG5cbn0pO1xuIl19