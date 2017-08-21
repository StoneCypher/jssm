'use strict';

var _templateObject = _taggedTemplateLiteral([' a ~> b -> c; '], [' a ~> b -> c; ']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }
/* eslint-disable max-len */

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

(0, _avaSpec.describe)('reject and accept correctly', async function (it) {

    var machine = sm(_templateObject);

    it('starts in a', function (t) {
        return t.is('a', machine.state());
    });
    it('rejects transition to b', function (t) {
        return t.is(false, machine.transition('b'));
    });
    it('still in a', function (t) {
        return t.is('a', machine.state());
    });
    it('rejects transition to c', function (t) {
        return t.is(false, machine.transition('c'));
    });
    it('still in a', function (t) {
        return t.is('a', machine.state());
    });
    it('rejects forced transition to c', function (t) {
        return t.is(false, machine.force_transition('c'));
    });
    it('still in a', function (t) {
        return t.is('a', machine.state());
    });
    it('accepts forced transition to b', function (t) {
        return t.is(true, machine.force_transition('b'));
    });
    it('now in b', function (t) {
        return t.is('b', machine.state());
    });
    it('accepts transition to c', function (t) {
        return t.is(true, machine.transition('c'));
    });
    it('now in c', function (t) {
        return t.is('c', machine.state());
    });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9mb3JjZWQgdHJhbnNpdGlvbnMuanMiXSwibmFtZXMiOlsianNzbSIsInJlcXVpcmUiLCJzbSIsIml0IiwibWFjaGluZSIsInQiLCJpcyIsInN0YXRlIiwidHJhbnNpdGlvbiIsImZvcmNlX3RyYW5zaXRpb24iXSwibWFwcGluZ3MiOiI7Ozs7QUFHQTs7O0FBRkE7O0FBSUEsSUFBTUEsT0FBT0MsUUFBUSw0QkFBUixDQUFiO0FBQUEsSUFDTUMsS0FBT0YsS0FBS0UsRUFEbEI7O0FBT0EsdUJBQVMsNkJBQVQsRUFBd0MsZ0JBQU1DLEVBQU4sRUFBWTs7QUFFaEQsUUFBTUMsVUFBVUYsRUFBVixpQkFBTjs7QUFFQUMsT0FBRyxhQUFILEVBQXFDO0FBQUEsZUFBS0UsRUFBRUMsRUFBRixDQUFLLEdBQUwsRUFBWUYsUUFBUUcsS0FBUixFQUFaLENBQUw7QUFBQSxLQUFyQztBQUNBSixPQUFHLHlCQUFILEVBQXFDO0FBQUEsZUFBS0UsRUFBRUMsRUFBRixDQUFLLEtBQUwsRUFBWUYsUUFBUUksVUFBUixDQUFtQixHQUFuQixDQUFaLENBQUw7QUFBQSxLQUFyQztBQUNBTCxPQUFHLFlBQUgsRUFBcUM7QUFBQSxlQUFLRSxFQUFFQyxFQUFGLENBQUssR0FBTCxFQUFZRixRQUFRRyxLQUFSLEVBQVosQ0FBTDtBQUFBLEtBQXJDO0FBQ0FKLE9BQUcseUJBQUgsRUFBcUM7QUFBQSxlQUFLRSxFQUFFQyxFQUFGLENBQUssS0FBTCxFQUFZRixRQUFRSSxVQUFSLENBQW1CLEdBQW5CLENBQVosQ0FBTDtBQUFBLEtBQXJDO0FBQ0FMLE9BQUcsWUFBSCxFQUFxQztBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxHQUFMLEVBQVlGLFFBQVFHLEtBQVIsRUFBWixDQUFMO0FBQUEsS0FBckM7QUFDQUosT0FBRyxnQ0FBSCxFQUFxQztBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxLQUFMLEVBQVlGLFFBQVFLLGdCQUFSLENBQXlCLEdBQXpCLENBQVosQ0FBTDtBQUFBLEtBQXJDO0FBQ0FOLE9BQUcsWUFBSCxFQUFxQztBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxHQUFMLEVBQVlGLFFBQVFHLEtBQVIsRUFBWixDQUFMO0FBQUEsS0FBckM7QUFDQUosT0FBRyxnQ0FBSCxFQUFxQztBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxJQUFMLEVBQVlGLFFBQVFLLGdCQUFSLENBQXlCLEdBQXpCLENBQVosQ0FBTDtBQUFBLEtBQXJDO0FBQ0FOLE9BQUcsVUFBSCxFQUFxQztBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxHQUFMLEVBQVlGLFFBQVFHLEtBQVIsRUFBWixDQUFMO0FBQUEsS0FBckM7QUFDQUosT0FBRyx5QkFBSCxFQUFxQztBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxJQUFMLEVBQVlGLFFBQVFJLFVBQVIsQ0FBbUIsR0FBbkIsQ0FBWixDQUFMO0FBQUEsS0FBckM7QUFDQUwsT0FBRyxVQUFILEVBQXFDO0FBQUEsZUFBS0UsRUFBRUMsRUFBRixDQUFLLEdBQUwsRUFBWUYsUUFBUUcsS0FBUixFQUFaLENBQUw7QUFBQSxLQUFyQztBQUVILENBaEJEIiwiZmlsZSI6ImZvcmNlZCB0cmFuc2l0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuXG5pbXBvcnQge2Rlc2NyaWJlfSBmcm9tICdhdmEtc3BlYyc7XG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpLFxuICAgICAgc20gICA9IGpzc20uc207XG5cblxuXG5cblxuZGVzY3JpYmUoJ3JlamVjdCBhbmQgYWNjZXB0IGNvcnJlY3RseScsIGFzeW5jIGl0ID0+IHtcblxuICAgIGNvbnN0IG1hY2hpbmUgPSBzbWAgYSB+PiBiIC0+IGM7IGA7XG5cbiAgICBpdCgnc3RhcnRzIGluIGEnLCAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKCdhJywgICBtYWNoaW5lLnN0YXRlKCkgICAgICAgICAgICAgICApKTtcbiAgICBpdCgncmVqZWN0cyB0cmFuc2l0aW9uIHRvIGInLCAgICAgICAgdCA9PiB0LmlzKGZhbHNlLCBtYWNoaW5lLnRyYW5zaXRpb24oJ2InKSAgICAgICApKTtcbiAgICBpdCgnc3RpbGwgaW4gYScsICAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKCdhJywgICBtYWNoaW5lLnN0YXRlKCkgICAgICAgICAgICAgICApKTtcbiAgICBpdCgncmVqZWN0cyB0cmFuc2l0aW9uIHRvIGMnLCAgICAgICAgdCA9PiB0LmlzKGZhbHNlLCBtYWNoaW5lLnRyYW5zaXRpb24oJ2MnKSAgICAgICApKTtcbiAgICBpdCgnc3RpbGwgaW4gYScsICAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKCdhJywgICBtYWNoaW5lLnN0YXRlKCkgICAgICAgICAgICAgICApKTtcbiAgICBpdCgncmVqZWN0cyBmb3JjZWQgdHJhbnNpdGlvbiB0byBjJywgdCA9PiB0LmlzKGZhbHNlLCBtYWNoaW5lLmZvcmNlX3RyYW5zaXRpb24oJ2MnKSApKTtcbiAgICBpdCgnc3RpbGwgaW4gYScsICAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKCdhJywgICBtYWNoaW5lLnN0YXRlKCkgICAgICAgICAgICAgICApKTtcbiAgICBpdCgnYWNjZXB0cyBmb3JjZWQgdHJhbnNpdGlvbiB0byBiJywgdCA9PiB0LmlzKHRydWUsICBtYWNoaW5lLmZvcmNlX3RyYW5zaXRpb24oJ2InKSApKTtcbiAgICBpdCgnbm93IGluIGInLCAgICAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKCdiJywgICBtYWNoaW5lLnN0YXRlKCkgICAgICAgICAgICAgICApKTtcbiAgICBpdCgnYWNjZXB0cyB0cmFuc2l0aW9uIHRvIGMnLCAgICAgICAgdCA9PiB0LmlzKHRydWUsICBtYWNoaW5lLnRyYW5zaXRpb24oJ2MnKSAgICAgICApKTtcbiAgICBpdCgnbm93IGluIGMnLCAgICAgICAgICAgICAgICAgICAgICAgdCA9PiB0LmlzKCdjJywgICBtYWNoaW5lLnN0YXRlKCkgICAgICAgICAgICAgICApKTtcblxufSk7XG4iXX0=