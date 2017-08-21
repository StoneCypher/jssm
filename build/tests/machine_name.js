'use strict';

var _templateObject = _taggedTemplateLiteral(['machine_name: bob; a->b;'], ['machine_name: bob; a->b;']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

(0, _avaSpec.describe)('machine name', async function (it) {

  it('doesn\'t throw', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject);
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9tYWNoaW5lX25hbWUuanMiXSwibmFtZXMiOlsianNzbSIsInJlcXVpcmUiLCJzbSIsIml0IiwidCIsIm5vdFRocm93cyIsIl9mb28iXSwibWFwcGluZ3MiOiI7Ozs7QUFDQTs7OztBQUVBLElBQU1BLE9BQU9DLFFBQVEsNEJBQVIsQ0FBYjtBQUFBLElBQ01DLEtBQU9GLEtBQUtFLEVBRGxCOztBQU9BLHVCQUFTLGNBQVQsRUFBeUIsZ0JBQU1DLEVBQU4sRUFBWTs7QUFFbkNBLEtBQUcsZ0JBQUgsRUFBcUI7QUFBQSxXQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1DLE9BQU9KLEVBQVAsaUJBQU47QUFBNEMsS0FBaEUsQ0FBTDtBQUFBLEdBQXJCO0FBRUQsQ0FKRCIsImZpbGUiOiJtYWNoaW5lX25hbWUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7ZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QganNzbSA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyksXG4gICAgICBzbSAgID0ganNzbS5zbTtcblxuXG5cblxuXG5kZXNjcmliZSgnbWFjaGluZSBuYW1lJywgYXN5bmMgaXQgPT4ge1xuXG4gIGl0KCdkb2VzblxcJ3QgdGhyb3cnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2ZvbyA9IHNtYG1hY2hpbmVfbmFtZTogYm9iOyBhLT5iO2A7IH0pICk7XG5cbn0pO1xuIl19