'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js');
/* eslint-disable max-len */

(0, _avaSpec.describe)('stripe strategies', async function (_it) {

  var is_v = function is_v(str, v, it) {
    return it(_avaSpec.test, function (t) {
      return t.deepEqual(v, jssm.parse(str));
    });
  };

  (0, _avaSpec.describe)('basic stripe', async function (it) {
    is_v('[a b c] -> +|1;', [{ from: ['a', 'b', 'c'], key: 'transition', se: { kind: '->', to: { key: 'stripe', value: 1 } } }], it);
  });

  (0, _avaSpec.describe)('negative stripe', async function (it) {
    is_v('[a b c] -> -|1;', [{ from: ['a', 'b', 'c'], key: 'transition', se: { kind: '->', to: { key: 'stripe', value: -1 } } }], it);
  });

  (0, _avaSpec.describe)('wide stripe', async function (it) {
    is_v('[a b c] -> +|2;', [{ from: ['a', 'b', 'c'], key: 'transition', se: { kind: '->', to: { key: 'stripe', value: 2 } } }], it);
  });

  (0, _avaSpec.describe)('illegal fractional stripe throws', async function (it) {
    it('throws', function (t) {
      return t.throws(function () {
        jssm.parse('[a b c] -> +|2.5;');
      });
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9zdHJpcGVzLmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwiX2l0IiwiaXNfdiIsInN0ciIsInYiLCJpdCIsInQiLCJkZWVwRXF1YWwiLCJwYXJzZSIsImZyb20iLCJrZXkiLCJzZSIsImtpbmQiLCJ0byIsInZhbHVlIiwidGhyb3dzIl0sIm1hcHBpbmdzIjoiOztBQUdBOztBQUVBLElBQU1BLE9BQU9DLFFBQVEsNEJBQVIsQ0FBYjtBQUpBOztBQVVBLHVCQUFTLG1CQUFULEVBQThCLGdCQUFNQyxHQUFOLEVBQWE7O0FBRXpDLE1BQU1DLE9BQU8sU0FBUEEsSUFBTyxDQUFDQyxHQUFELEVBQU1DLENBQU4sRUFBU0MsRUFBVDtBQUFBLFdBQWdCQSxrQkFBUztBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWUgsQ0FBWixFQUFlTCxLQUFLUyxLQUFMLENBQVdMLEdBQVgsQ0FBZixDQUFMO0FBQUEsS0FBVCxDQUFoQjtBQUFBLEdBQWI7O0FBRUEseUJBQVMsY0FBVCxFQUF5QixnQkFBTUUsRUFBTixFQUFZO0FBQ25DSCxTQUFLLGlCQUFMLEVBQXdCLENBQUMsRUFBQ08sTUFBTSxDQUFDLEdBQUQsRUFBSyxHQUFMLEVBQVMsR0FBVCxDQUFQLEVBQXNCQyxLQUFLLFlBQTNCLEVBQXlDQyxJQUFJLEVBQUNDLE1BQU0sSUFBUCxFQUFhQyxJQUFJLEVBQUNILEtBQUssUUFBTixFQUFnQkksT0FBTyxDQUF2QixFQUFqQixFQUE3QyxFQUFELENBQXhCLEVBQXFIVCxFQUFySDtBQUNELEdBRkQ7O0FBSUEseUJBQVMsaUJBQVQsRUFBNEIsZ0JBQU1BLEVBQU4sRUFBWTtBQUN0Q0gsU0FBSyxpQkFBTCxFQUF3QixDQUFDLEVBQUNPLE1BQU0sQ0FBQyxHQUFELEVBQUssR0FBTCxFQUFTLEdBQVQsQ0FBUCxFQUFzQkMsS0FBSyxZQUEzQixFQUF5Q0MsSUFBSSxFQUFDQyxNQUFNLElBQVAsRUFBYUMsSUFBSSxFQUFDSCxLQUFLLFFBQU4sRUFBZ0JJLE9BQU8sQ0FBQyxDQUF4QixFQUFqQixFQUE3QyxFQUFELENBQXhCLEVBQXNIVCxFQUF0SDtBQUNELEdBRkQ7O0FBSUEseUJBQVMsYUFBVCxFQUF3QixnQkFBTUEsRUFBTixFQUFZO0FBQ2xDSCxTQUFLLGlCQUFMLEVBQXdCLENBQUMsRUFBQ08sTUFBTSxDQUFDLEdBQUQsRUFBSyxHQUFMLEVBQVMsR0FBVCxDQUFQLEVBQXNCQyxLQUFLLFlBQTNCLEVBQXlDQyxJQUFJLEVBQUNDLE1BQU0sSUFBUCxFQUFhQyxJQUFJLEVBQUNILEtBQUssUUFBTixFQUFnQkksT0FBTyxDQUF2QixFQUFqQixFQUE3QyxFQUFELENBQXhCLEVBQXFIVCxFQUFySDtBQUNELEdBRkQ7O0FBSUEseUJBQVMsa0NBQVQsRUFBNkMsZ0JBQU1BLEVBQU4sRUFBWTtBQUN2REEsT0FBRyxRQUFILEVBQWE7QUFBQSxhQUFLQyxFQUFFUyxNQUFGLENBQVUsWUFBTTtBQUNoQ2hCLGFBQUtTLEtBQUwsQ0FBVyxtQkFBWDtBQUNELE9BRmlCLENBQUw7QUFBQSxLQUFiO0FBR0QsR0FKRDtBQU1ELENBdEJEIiwiZmlsZSI6InN0cmlwZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cblxuaW1wb3J0IHt0ZXN0LCBkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKTtcblxuXG5cblxuXG5kZXNjcmliZSgnc3RyaXBlIHN0cmF0ZWdpZXMnLCBhc3luYyBfaXQgPT4ge1xuXG4gIGNvbnN0IGlzX3YgPSAoc3RyLCB2LCBpdCkgPT4gaXQodGVzdCwgdCA9PiB0LmRlZXBFcXVhbCh2LCBqc3NtLnBhcnNlKHN0cikpKTtcblxuICBkZXNjcmliZSgnYmFzaWMgc3RyaXBlJywgYXN5bmMgaXQgPT4ge1xuICAgIGlzX3YoJ1thIGIgY10gLT4gK3wxOycsIFt7ZnJvbTogWydhJywnYicsJ2MnXSwga2V5OiAndHJhbnNpdGlvbicsIHNlOiB7a2luZDogJy0+JywgdG86IHtrZXk6ICdzdHJpcGUnLCB2YWx1ZTogMX19fV0sIGl0KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ25lZ2F0aXZlIHN0cmlwZScsIGFzeW5jIGl0ID0+IHtcbiAgICBpc192KCdbYSBiIGNdIC0+IC18MTsnLCBbe2Zyb206IFsnYScsJ2InLCdjJ10sIGtleTogJ3RyYW5zaXRpb24nLCBzZToge2tpbmQ6ICctPicsIHRvOiB7a2V5OiAnc3RyaXBlJywgdmFsdWU6IC0xfX19XSwgaXQpO1xuICB9KTtcblxuICBkZXNjcmliZSgnd2lkZSBzdHJpcGUnLCBhc3luYyBpdCA9PiB7XG4gICAgaXNfdignW2EgYiBjXSAtPiArfDI7JywgW3tmcm9tOiBbJ2EnLCdiJywnYyddLCBrZXk6ICd0cmFuc2l0aW9uJywgc2U6IHtraW5kOiAnLT4nLCB0bzoge2tleTogJ3N0cmlwZScsIHZhbHVlOiAyfX19XSwgaXQpO1xuICB9KTtcblxuICBkZXNjcmliZSgnaWxsZWdhbCBmcmFjdGlvbmFsIHN0cmlwZSB0aHJvd3MnLCBhc3luYyBpdCA9PiB7XG4gICAgaXQoJ3Rocm93cycsIHQgPT4gdC50aHJvd3MoICgpID0+IHtcbiAgICAgIGpzc20ucGFyc2UoJ1thIGIgY10gLT4gK3wyLjU7Jyk7XG4gICAgfSApKTtcbiAgfSk7XG5cbn0pO1xuIl19