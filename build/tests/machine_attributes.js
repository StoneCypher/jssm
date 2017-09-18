'use strict';

var _templateObject = _taggedTemplateLiteral(['machine_name: bob;    a->b;'], ['machine_name: bob;    a->b;']),
    _templateObject2 = _taggedTemplateLiteral(['machine_name: "bo b"; a->b;'], ['machine_name: "bo b"; a->b;']),
    _templateObject3 = _taggedTemplateLiteral(['machine_name: testval; a->b;'], ['machine_name: testval; a->b;']),
    _templateObject4 = _taggedTemplateLiteral(['machine_language: ', '; a->b;'], ['machine_language: ', '; a->b;']),
    _templateObject5 = _taggedTemplateLiteral(['machine_author: bob;               a->b;'], ['machine_author: bob;               a->b;']),
    _templateObject6 = _taggedTemplateLiteral(['machine_author: "bo b";            a->b;'], ['machine_author: "bo b";            a->b;']),
    _templateObject7 = _taggedTemplateLiteral(['machine_author: [bob dobbs];       a->b;'], ['machine_author: [bob dobbs];       a->b;']),
    _templateObject8 = _taggedTemplateLiteral(['machine_author: ["bo b" "do bbs"]; a->b;'], ['machine_author: ["bo b" "do bbs"]; a->b;']),
    _templateObject9 = _taggedTemplateLiteral(['machine_author: [bob "do bbs"];    a->b;'], ['machine_author: [bob "do bbs"];    a->b;']),
    _templateObject10 = _taggedTemplateLiteral(['machine_author: ["bo b" dobbs];    a->b;'], ['machine_author: ["bo b" dobbs];    a->b;']),
    _templateObject11 = _taggedTemplateLiteral(['machine_author: testval; a->b;'], ['machine_author: testval; a->b;']),
    _templateObject12 = _taggedTemplateLiteral(['machine_author: [bob david]; a->b;'], ['machine_author: [bob david]; a->b;']),
    _templateObject13 = _taggedTemplateLiteral(['machine_contributor: bob;               a->b;'], ['machine_contributor: bob;               a->b;']),
    _templateObject14 = _taggedTemplateLiteral(['machine_contributor: "bo b";            a->b;'], ['machine_contributor: "bo b";            a->b;']),
    _templateObject15 = _taggedTemplateLiteral(['machine_contributor: [bob dobbs];       a->b;'], ['machine_contributor: [bob dobbs];       a->b;']),
    _templateObject16 = _taggedTemplateLiteral(['machine_contributor: ["bo b" "do bbs"]; a->b;'], ['machine_contributor: ["bo b" "do bbs"]; a->b;']),
    _templateObject17 = _taggedTemplateLiteral(['machine_contributor: [bob "do bbs"];    a->b;'], ['machine_contributor: [bob "do bbs"];    a->b;']),
    _templateObject18 = _taggedTemplateLiteral(['machine_contributor: ["bo b" dobbs];    a->b;'], ['machine_contributor: ["bo b" dobbs];    a->b;']),
    _templateObject19 = _taggedTemplateLiteral(['machine_contributor: testval; a->b;'], ['machine_contributor: testval; a->b;']),
    _templateObject20 = _taggedTemplateLiteral(['machine_contributor: [bob david]; a->b;'], ['machine_contributor: [bob david]; a->b;']),
    _templateObject21 = _taggedTemplateLiteral(['machine_comment: bob;    a->b;'], ['machine_comment: bob;    a->b;']),
    _templateObject22 = _taggedTemplateLiteral(['machine_comment: "bo b"; a->b;'], ['machine_comment: "bo b"; a->b;']),
    _templateObject23 = _taggedTemplateLiteral(['machine_comment: testval; a->b;'], ['machine_comment: testval; a->b;']),
    _templateObject24 = _taggedTemplateLiteral(['machine_definition: http://google.com/ ; a->b;'], ['machine_definition: http://google.com/ ; a->b;']),
    _templateObject25 = _taggedTemplateLiteral(['machine_definition: "not a url";         a->b;'], ['machine_definition: "not a url";         a->b;']),
    _templateObject26 = _taggedTemplateLiteral(['machine_version: 0.0.0; a->b;'], ['machine_version: 0.0.0; a->b;']),
    _templateObject27 = _taggedTemplateLiteral(['machine_version: 0.0.1; a->b;'], ['machine_version: 0.0.1; a->b;']),
    _templateObject28 = _taggedTemplateLiteral(['machine_version: 0.1.0; a->b;'], ['machine_version: 0.1.0; a->b;']),
    _templateObject29 = _taggedTemplateLiteral(['machine_version: 1.0.0; a->b;'], ['machine_version: 1.0.0; a->b;']),
    _templateObject30 = _taggedTemplateLiteral(['machine_version: 1.0.1; a->b;'], ['machine_version: 1.0.1; a->b;']),
    _templateObject31 = _taggedTemplateLiteral(['machine_version: 1.1.1; a->b;'], ['machine_version: 1.1.1; a->b;']),
    _templateObject32 = _taggedTemplateLiteral(['machine_version: 2.0.0; a->b;'], ['machine_version: 2.0.0; a->b;']),
    _templateObject33 = _taggedTemplateLiteral(['machine_version: "Not a semver"; a->b;'], ['machine_version: "Not a semver"; a->b;']),
    _templateObject34 = _taggedTemplateLiteral(['machine_license: testval; a->b;'], ['machine_license: testval; a->b;']),
    _templateObject35 = _taggedTemplateLiteral(['machine_license:Public domain;     a->b;'], ['machine_license:Public domain;     a->b;']),
    _templateObject36 = _taggedTemplateLiteral(['machine_license:MIT;               a->b;'], ['machine_license:MIT;               a->b;']),
    _templateObject37 = _taggedTemplateLiteral(['machine_license:BSD 2-clause;      a->b;'], ['machine_license:BSD 2-clause;      a->b;']),
    _templateObject38 = _taggedTemplateLiteral(['machine_license:BSD 3-clause;      a->b;'], ['machine_license:BSD 3-clause;      a->b;']),
    _templateObject39 = _taggedTemplateLiteral(['machine_license:Apache 2.0;        a->b;'], ['machine_license:Apache 2.0;        a->b;']),
    _templateObject40 = _taggedTemplateLiteral(['machine_license:Mozilla 2.0;       a->b;'], ['machine_license:Mozilla 2.0;       a->b;']),
    _templateObject41 = _taggedTemplateLiteral(['machine_license:GPL v2;            a->b;'], ['machine_license:GPL v2;            a->b;']),
    _templateObject42 = _taggedTemplateLiteral(['machine_license:GPL v3;            a->b;'], ['machine_license:GPL v3;            a->b;']),
    _templateObject43 = _taggedTemplateLiteral(['machine_license:LGPL v2.1;         a->b;'], ['machine_license:LGPL v2.1;         a->b;']),
    _templateObject44 = _taggedTemplateLiteral(['machine_license:LGPL v3.0;         a->b;'], ['machine_license:LGPL v3.0;         a->b;']),
    _templateObject45 = _taggedTemplateLiteral(['machine_license: Public domain ;   a->b;'], ['machine_license: Public domain ;   a->b;']),
    _templateObject46 = _taggedTemplateLiteral(['machine_license: MIT ;             a->b;'], ['machine_license: MIT ;             a->b;']),
    _templateObject47 = _taggedTemplateLiteral(['machine_license: BSD 2-clause ;    a->b;'], ['machine_license: BSD 2-clause ;    a->b;']),
    _templateObject48 = _taggedTemplateLiteral(['machine_license: BSD 3-clause ;    a->b;'], ['machine_license: BSD 3-clause ;    a->b;']),
    _templateObject49 = _taggedTemplateLiteral(['machine_license: Apache 2.0 ;      a->b;'], ['machine_license: Apache 2.0 ;      a->b;']),
    _templateObject50 = _taggedTemplateLiteral(['machine_license: Mozilla 2.0 ;     a->b;'], ['machine_license: Mozilla 2.0 ;     a->b;']),
    _templateObject51 = _taggedTemplateLiteral(['machine_license: GPL v2 ;          a->b;'], ['machine_license: GPL v2 ;          a->b;']),
    _templateObject52 = _taggedTemplateLiteral(['machine_license: GPL v3 ;          a->b;'], ['machine_license: GPL v3 ;          a->b;']),
    _templateObject53 = _taggedTemplateLiteral(['machine_license: LGPL v2.1 ;       a->b;'], ['machine_license: LGPL v2.1 ;       a->b;']),
    _templateObject54 = _taggedTemplateLiteral(['machine_license: LGPL v3.0 ;       a->b;'], ['machine_license: LGPL v3.0 ;       a->b;']),
    _templateObject55 = _taggedTemplateLiteral(['machine_license: bob;               a->b;'], ['machine_license: bob;               a->b;']),
    _templateObject56 = _taggedTemplateLiteral(['machine_license: "bo b";            a->b;'], ['machine_license: "bo b";            a->b;']),
    _templateObject57 = _taggedTemplateLiteral(['fsl_version: 0.0.0; a->b;'], ['fsl_version: 0.0.0; a->b;']),
    _templateObject58 = _taggedTemplateLiteral(['fsl_version: 0.0.1; a->b;'], ['fsl_version: 0.0.1; a->b;']),
    _templateObject59 = _taggedTemplateLiteral(['fsl_version: 0.1.0; a->b;'], ['fsl_version: 0.1.0; a->b;']),
    _templateObject60 = _taggedTemplateLiteral(['fsl_version: 1.0.0; a->b;'], ['fsl_version: 1.0.0; a->b;']),
    _templateObject61 = _taggedTemplateLiteral(['fsl_version: 1.0.1; a->b;'], ['fsl_version: 1.0.1; a->b;']),
    _templateObject62 = _taggedTemplateLiteral(['fsl_version: 1.1.1; a->b;'], ['fsl_version: 1.1.1; a->b;']),
    _templateObject63 = _taggedTemplateLiteral(['fsl_version: 2.0.0; a->b;'], ['fsl_version: 2.0.0; a->b;']),
    _templateObject64 = _taggedTemplateLiteral(['fsl_version: "Not a semver"; a->b;'], ['fsl_version: "Not a semver"; a->b;']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm,
    r639 = require('reduce-to-639-1').reduce;

(0, _avaSpec.describe)('machine_name', async function (it) {

  it('atom', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject);
    });
  });
  it('quoted string', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject2);
    });
  });

  it('retval correct', function (t) {
    return t.is("testval", sm(_templateObject3).machine_name());
  });
});

(0, _avaSpec.describe)('machine_language', async function (it) {

  var eachTest = function eachTest(name, lang) {

    it(name + ' doesn\'t throw', function (t) {
      return t.notThrows(function () {
        var _foo = sm(_templateObject4, lang);
      });
    });

    it(name + ' correct', function (t) {
      return t.is(r639(lang), sm(_templateObject4, lang).machine_language());
    });
  };

  eachTest('atom correct case', 'English');
  eachTest('atom lowercase', 'english');
  eachTest('atom mixedcase', 'eNGliSH');
  eachTest('amharic', 'አማርኛ');
});

(0, _avaSpec.describe)('machine_author', async function (it2) {

  it2('single atom', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject5);
    });
  });
  it2('single quoted string', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject6);
    });
  });
  it2('atom list', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject7);
    });
  });
  it2('quoted string list', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject8);
    });
  });
  it2('mixed list a/q', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject9);
    });
  });
  it2('mixed list q/a', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject10);
    });
  });

  it2('single retval', function (t) {
    return t.deepEqual(["testval"], sm(_templateObject11).machine_author());
  });
  it2('multiple retval', function (t) {
    return t.deepEqual(['bob', 'david'], sm(_templateObject12).machine_author());
  });
});

(0, _avaSpec.describe)('machine_contributor', async function (it3) {

  it3('atom', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject13);
    });
  });
  it3('quoted string', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject14);
    });
  });
  it3('atom list', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject15);
    });
  });
  it3('quoted string list', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject16);
    });
  });
  it3('mixed list a/q', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject17);
    });
  });
  it3('mixed list q/a', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject18);
    });
  });

  it3('single retval', function (t) {
    return t.deepEqual(["testval"], sm(_templateObject19).machine_contributor());
  });

  it3('multiple retval', function (t) {
    return t.deepEqual(['bob', 'david'], sm(_templateObject20).machine_contributor());
  });
});

(0, _avaSpec.describe)('machine_comment', async function (it4) {

  it4('atom', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject21);
    });
  });
  it4('quoted string', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject22);
    });
  });

  it4('retval correct', function (t) {
    return t.is("testval", sm(_templateObject23).machine_comment());
  });
});

(0, _avaSpec.describe)('machine_definition', async function (it5) {

  it5('url', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject24);
    });
  });
  it5('url', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject24);
    });
  });
  it5('url', function (t) {
    return t.throws(function () {
      var _foo = sm(_templateObject25);
    });
  });

  it5('retval correct', function (t) {
    return t.is("http://google.com/", sm(_templateObject24).machine_definition());
  });
});

(0, _avaSpec.describe)('machine_version', async function (it6) {

  it6('semver 0.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject26);
    });
  });
  it6('semver 0.0.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject27);
    });
  });
  it6('semver 0.1.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject28);
    });
  });
  it6('semver 1.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject29);
    });
  });
  it6('semver 1.0.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject30);
    });
  });
  it6('semver 1.1.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject31);
    });
  });
  it6('semver 2.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject32);
    });
  });

  it6('semver notAS', function (t) {
    return t.throws(function () {
      var _f = sm(_templateObject33);
    });
  });

  it6('retval correct', function (t) {
    return t.deepEqual({ full: "0.0.0", major: 0, minor: 0, patch: 0 }, sm(_templateObject26).machine_version());
  });
});

(0, _avaSpec.describe)('machine_license', async function (oit) {

  oit('retval correct', function (t) {
    return t.is("testval", sm(_templateObject34).machine_license());
  });

  (0, _avaSpec.describe)('near', async function (it) {
    it('Public domain', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject35);
      });
    });
    it('MIT', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject36);
      });
    });
    it('BSD 2-clause', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject37);
      });
    });
    it('BSD 3-clause', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject38);
      });
    });
    it('Apache 2.0', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject39);
      });
    });
    it('Mozilla 2.0', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject40);
      });
    });
    it('GPL v2', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject41);
      });
    });
    it('GPL v3', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject42);
      });
    });
    it('LGPL v2.1', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject43);
      });
    });
    it('LGPL v3.0', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject44);
      });
    });
  });

  (0, _avaSpec.describe)('spaced', async function (it) {
    it('Public domain', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject45);
      });
    });
    it('MIT', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject46);
      });
    });
    it('BSD 2-clause', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject47);
      });
    });
    it('BSD 3-clause', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject48);
      });
    });
    it('Apache 2.0', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject49);
      });
    });
    it('Mozilla 2.0', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject50);
      });
    });
    it('GPL v2', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject51);
      });
    });
    it('GPL v3', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject52);
      });
    });
    it('LGPL v2.1', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject53);
      });
    });
    it('LGPL v3.0', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject54);
      });
    });
  });

  oit('single atom', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject55);
    });
  });
  oit('single quoted string', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject56);
    });
  });
});

(0, _avaSpec.describe)('fsl_version', async function (it7) {

  it7('semver 0.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject57);
    });
  });
  it7('semver 0.0.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject58);
    });
  });
  it7('semver 0.1.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject59);
    });
  });
  it7('semver 1.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject60);
    });
  });
  it7('semver 1.0.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject61);
    });
  });
  it7('semver 1.1.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject62);
    });
  });
  it7('semver 2.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject63);
    });
  });

  it7('semver notAS', function (t) {
    return t.throws(function () {
      var _f = sm(_templateObject64);
    });
  });

  it7('retval correct', function (t) {
    return t.deepEqual({ full: "0.0.0", major: 0, minor: 0, patch: 0 }, sm(_templateObject57).fsl_version());
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9tYWNoaW5lX2F0dHJpYnV0ZXMuanMiXSwibmFtZXMiOlsianNzbSIsInJlcXVpcmUiLCJzbSIsInI2MzkiLCJyZWR1Y2UiLCJpdCIsInQiLCJub3RUaHJvd3MiLCJfZm9vIiwiaXMiLCJtYWNoaW5lX25hbWUiLCJlYWNoVGVzdCIsIm5hbWUiLCJsYW5nIiwibWFjaGluZV9sYW5ndWFnZSIsIml0MiIsImRlZXBFcXVhbCIsIm1hY2hpbmVfYXV0aG9yIiwiaXQzIiwiXyIsIm1hY2hpbmVfY29udHJpYnV0b3IiLCJpdDQiLCJtYWNoaW5lX2NvbW1lbnQiLCJpdDUiLCJ0aHJvd3MiLCJtYWNoaW5lX2RlZmluaXRpb24iLCJpdDYiLCJfZiIsImZ1bGwiLCJtYWpvciIsIm1pbm9yIiwicGF0Y2giLCJtYWNoaW5lX3ZlcnNpb24iLCJvaXQiLCJtYWNoaW5lX2xpY2Vuc2UiLCJpdDciLCJmc2xfdmVyc2lvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBOzs7O0FBRUEsSUFBTUEsT0FBT0MsUUFBUSw0QkFBUixDQUFiO0FBQUEsSUFDTUMsS0FBT0YsS0FBS0UsRUFEbEI7QUFBQSxJQUVNQyxPQUFPRixRQUFRLGlCQUFSLEVBQTJCRyxNQUZ4Qzs7QUFTQSx1QkFBUyxjQUFULEVBQXlCLGdCQUFNQyxFQUFOLEVBQVk7O0FBRW5DQSxLQUFHLE1BQUgsRUFBcUI7QUFBQSxXQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1DLE9BQU9OLEVBQVAsaUJBQU47QUFBK0MsS0FBbkUsQ0FBTDtBQUFBLEdBQXJCO0FBQ0FHLEtBQUcsZUFBSCxFQUFxQjtBQUFBLFdBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTUMsT0FBT04sRUFBUCxrQkFBTjtBQUErQyxLQUFuRSxDQUFMO0FBQUEsR0FBckI7O0FBRUFHLEtB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QVMsWUFBTTtBQUFFLFVBQU1HLEtBQUt6QixFQUFMLG1CQUFOO0FBQW9ELEtBQXJFLENBQUw7QUFBQSxHQUFwQjs7QUFFQWlDLE1BQUksZ0JBQUosRUFBc0I7QUFBQSxXQUNwQjdCLEVBQUVVLFNBQUYsQ0FDRSxFQUFDWSxNQUFLLE9BQU4sRUFBZUMsT0FBTSxDQUFyQixFQUF3QkMsT0FBTSxDQUE5QixFQUFpQ0MsT0FBTSxDQUF2QyxFQURGLEVBRUU3QixzQkFBOEJrQyxXQUE5QixFQUZGLENBRG9CO0FBQUEsR0FBdEI7QUFPRCxDQW5CRCIsImZpbGUiOiJtYWNoaW5lX2F0dHJpYnV0ZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7ZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QganNzbSA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyksXG4gICAgICBzbSAgID0ganNzbS5zbSxcbiAgICAgIHI2MzkgPSByZXF1aXJlKCdyZWR1Y2UtdG8tNjM5LTEnKS5yZWR1Y2U7XG5cblxuXG5cblxuXG5kZXNjcmliZSgnbWFjaGluZV9uYW1lJywgYXN5bmMgaXQgPT4ge1xuXG4gIGl0KCdhdG9tJywgICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gbWFjaGluZV9uYW1lOiBib2I7ICAgIGEtPmI7YDsgfSkgKTtcbiAgaXQoJ3F1b3RlZCBzdHJpbmcnLCAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBtYWNoaW5lX25hbWU6IFwiYm8gYlwiOyBhLT5iO2A7IH0pICk7XG5cbiAgaXQoJ3JldHZhbCBjb3JyZWN0JywgdCA9PiB0LmlzKFwidGVzdHZhbFwiLCBzbWBtYWNoaW5lX25hbWU6IHRlc3R2YWw7IGEtPmI7YC5tYWNoaW5lX25hbWUoKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdtYWNoaW5lX2xhbmd1YWdlJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IGVhY2hUZXN0ID0gKG5hbWUsIGxhbmcpID0+IHtcblxuICAgIGl0KGAke25hbWV9IGRvZXNuJ3QgdGhyb3dgLCB0ID0+XG4gICAgICAgdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gbWFjaGluZV9sYW5ndWFnZTogJHtsYW5nfTsgYS0+YjtgOyB9KSApO1xuXG4gICAgaXQoYCR7bmFtZX0gY29ycmVjdGAsIHQgPT5cbiAgICAgICB0LmlzKHI2MzkobGFuZyksIHNtYG1hY2hpbmVfbGFuZ3VhZ2U6ICR7bGFuZ307IGEtPmI7YC5tYWNoaW5lX2xhbmd1YWdlKCkgKSApO1xuXG4gIH07XG5cbiAgZWFjaFRlc3QoJ2F0b20gY29ycmVjdCBjYXNlJywgJ0VuZ2xpc2gnKTtcbiAgZWFjaFRlc3QoJ2F0b20gbG93ZXJjYXNlJywgICAgJ2VuZ2xpc2gnKTtcbiAgZWFjaFRlc3QoJ2F0b20gbWl4ZWRjYXNlJywgICAgJ2VOR2xpU0gnKTtcbiAgZWFjaFRlc3QoJ2FtaGFyaWMnLCAgICAgICAgICAgJ+GKoOGIm+GIreGKmycpO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnbWFjaGluZV9hdXRob3InLCBhc3luYyBpdDIgPT4ge1xuXG4gIGl0Mignc2luZ2xlIGF0b20nLCAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2ZvbyA9IHNtYG1hY2hpbmVfYXV0aG9yOiBib2I7ICAgICAgICAgICAgICAgYS0+YjtgOyB9KSApO1xuICBpdDIoJ3NpbmdsZSBxdW90ZWQgc3RyaW5nJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBtYWNoaW5lX2F1dGhvcjogXCJibyBiXCI7ICAgICAgICAgICAgYS0+YjtgOyB9KSApO1xuICBpdDIoJ2F0b20gbGlzdCcsICAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBtYWNoaW5lX2F1dGhvcjogW2JvYiBkb2Jic107ICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgaXQyKCdxdW90ZWQgc3RyaW5nIGxpc3QnLCAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gbWFjaGluZV9hdXRob3I6IFtcImJvIGJcIiBcImRvIGJic1wiXTsgYS0+YjtgOyB9KSApO1xuICBpdDIoJ21peGVkIGxpc3QgYS9xJywgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBtYWNoaW5lX2F1dGhvcjogW2JvYiBcImRvIGJic1wiXTsgICAgYS0+YjtgOyB9KSApO1xuICBpdDIoJ21peGVkIGxpc3QgcS9hJywgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBtYWNoaW5lX2F1dGhvcjogW1wiYm8gYlwiIGRvYmJzXTsgICAgYS0+YjtgOyB9KSApO1xuXG4gIGl0Mignc2luZ2xlIHJldHZhbCcsICAgdCA9PiB0LmRlZXBFcXVhbChbXCJ0ZXN0dmFsXCJdLCBzbWBtYWNoaW5lX2F1dGhvcjogdGVzdHZhbDsgYS0+YjtgLm1hY2hpbmVfYXV0aG9yKCkgKSApO1xuICBpdDIoJ211bHRpcGxlIHJldHZhbCcsIHQgPT4gdC5kZWVwRXF1YWwoWydib2InLCdkYXZpZCddLCBzbWBtYWNoaW5lX2F1dGhvcjogW2JvYiBkYXZpZF07IGEtPmI7YC5tYWNoaW5lX2F1dGhvcigpICkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ21hY2hpbmVfY29udHJpYnV0b3InLCBhc3luYyBpdDMgPT4ge1xuXG4gIGl0MygnYXRvbScsICAgICAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2NvbnRyaWJ1dG9yOiBib2I7ICAgICAgICAgICAgICAgYS0+YjtgOyB9KSApO1xuICBpdDMoJ3F1b3RlZCBzdHJpbmcnLCAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9jb250cmlidXRvcjogXCJibyBiXCI7ICAgICAgICAgICAgYS0+YjtgOyB9KSApO1xuICBpdDMoJ2F0b20gbGlzdCcsICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9jb250cmlidXRvcjogW2JvYiBkb2Jic107ICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgaXQzKCdxdW90ZWQgc3RyaW5nIGxpc3QnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfY29udHJpYnV0b3I6IFtcImJvIGJcIiBcImRvIGJic1wiXTsgYS0+YjtgOyB9KSApO1xuICBpdDMoJ21peGVkIGxpc3QgYS9xJywgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9jb250cmlidXRvcjogW2JvYiBcImRvIGJic1wiXTsgICAgYS0+YjtgOyB9KSApO1xuICBpdDMoJ21peGVkIGxpc3QgcS9hJywgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9jb250cmlidXRvcjogW1wiYm8gYlwiIGRvYmJzXTsgICAgYS0+YjtgOyB9KSApO1xuXG4gIGl0Mygnc2luZ2xlIHJldHZhbCcsICAgdCA9PlxuICAgIHQuZGVlcEVxdWFsKFtcInRlc3R2YWxcIl0sIHNtYG1hY2hpbmVfY29udHJpYnV0b3I6IHRlc3R2YWw7IGEtPmI7YC5tYWNoaW5lX2NvbnRyaWJ1dG9yKCkgKSApO1xuXG4gIGl0MygnbXVsdGlwbGUgcmV0dmFsJywgdCA9PlxuICAgIHQuZGVlcEVxdWFsKFsnYm9iJywnZGF2aWQnXSwgc21gbWFjaGluZV9jb250cmlidXRvcjogW2JvYiBkYXZpZF07IGEtPmI7YC5tYWNoaW5lX2NvbnRyaWJ1dG9yKCkgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnbWFjaGluZV9jb21tZW50JywgYXN5bmMgaXQ0ID0+IHtcblxuICBpdDQoJ2F0b20nLCAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2ZvbyA9IHNtYG1hY2hpbmVfY29tbWVudDogYm9iOyAgICBhLT5iO2A7IH0pICk7XG4gIGl0NCgncXVvdGVkIHN0cmluZycsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gbWFjaGluZV9jb21tZW50OiBcImJvIGJcIjsgYS0+YjtgOyB9KSApO1xuXG4gIGl0NCgncmV0dmFsIGNvcnJlY3QnLCB0ID0+IHQuaXMoXCJ0ZXN0dmFsXCIsIHNtYG1hY2hpbmVfY29tbWVudDogdGVzdHZhbDsgYS0+YjtgLm1hY2hpbmVfY29tbWVudCgpICkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ21hY2hpbmVfZGVmaW5pdGlvbicsIGFzeW5jIGl0NSA9PiB7XG5cbiAgaXQ1KCd1cmwnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2ZvbyA9IHNtYG1hY2hpbmVfZGVmaW5pdGlvbjogaHR0cDovL2dvb2dsZS5jb20vIDsgYS0+YjtgOyB9KSApO1xuICBpdDUoJ3VybCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gbWFjaGluZV9kZWZpbml0aW9uOiBodHRwOi8vZ29vZ2xlLmNvbS8gOyBhLT5iO2A7IH0pICk7XG4gIGl0NSgndXJsJywgdCA9PiB0LnRocm93cyggICAoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBtYWNoaW5lX2RlZmluaXRpb246IFwibm90IGEgdXJsXCI7ICAgICAgICAgYS0+YjtgOyB9KSApO1xuXG4gIGl0NSgncmV0dmFsIGNvcnJlY3QnLCB0ID0+XG4gICAgdC5pcyhcImh0dHA6Ly9nb29nbGUuY29tL1wiLCBzbWBtYWNoaW5lX2RlZmluaXRpb246IGh0dHA6Ly9nb29nbGUuY29tLyA7IGEtPmI7YC5tYWNoaW5lX2RlZmluaXRpb24oKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdtYWNoaW5lX3ZlcnNpb24nLCBhc3luYyBpdDYgPT4ge1xuXG4gIGl0Nignc2VtdmVyIDAuMC4wJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mID0gc21gbWFjaGluZV92ZXJzaW9uOiAwLjAuMDsgYS0+YjtgOyB9KSApO1xuICBpdDYoJ3NlbXZlciAwLjAuMScsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYG1hY2hpbmVfdmVyc2lvbjogMC4wLjE7IGEtPmI7YDsgfSkgKTtcbiAgaXQ2KCdzZW12ZXIgMC4xLjAnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBtYWNoaW5lX3ZlcnNpb246IDAuMS4wOyBhLT5iO2A7IH0pICk7XG4gIGl0Nignc2VtdmVyIDEuMC4wJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mID0gc21gbWFjaGluZV92ZXJzaW9uOiAxLjAuMDsgYS0+YjtgOyB9KSApO1xuICBpdDYoJ3NlbXZlciAxLjAuMScsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYG1hY2hpbmVfdmVyc2lvbjogMS4wLjE7IGEtPmI7YDsgfSkgKTtcbiAgaXQ2KCdzZW12ZXIgMS4xLjEnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBtYWNoaW5lX3ZlcnNpb246IDEuMS4xOyBhLT5iO2A7IH0pICk7XG4gIGl0Nignc2VtdmVyIDIuMC4wJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mID0gc21gbWFjaGluZV92ZXJzaW9uOiAyLjAuMDsgYS0+YjtgOyB9KSApO1xuXG4gIGl0Nignc2VtdmVyIG5vdEFTJywgdCA9PiB0LnRocm93cygoKSA9PiB7IGNvbnN0IF9mID0gc21gbWFjaGluZV92ZXJzaW9uOiBcIk5vdCBhIHNlbXZlclwiOyBhLT5iO2A7IH0pICk7XG5cbiAgaXQ2KCdyZXR2YWwgY29ycmVjdCcsIHQgPT5cbiAgICB0LmRlZXBFcXVhbChcbiAgICAgIHtmdWxsOlwiMC4wLjBcIiwgbWFqb3I6MCwgbWlub3I6MCwgcGF0Y2g6MH0sXG4gICAgICBzbWBtYWNoaW5lX3ZlcnNpb246IDAuMC4wOyBhLT5iO2AubWFjaGluZV92ZXJzaW9uKClcbiAgICApXG4gICk7XG5cblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ21hY2hpbmVfbGljZW5zZScsIGFzeW5jIG9pdCA9PiB7XG5cbiAgb2l0KCdyZXR2YWwgY29ycmVjdCcsIHQgPT4gdC5pcyhcInRlc3R2YWxcIiwgc21gbWFjaGluZV9saWNlbnNlOiB0ZXN0dmFsOyBhLT5iO2AubWFjaGluZV9saWNlbnNlKCkgKSApO1xuXG4gIGRlc2NyaWJlKCduZWFyJywgYXN5bmMgaXQgPT4ge1xuICAgIGl0KCdQdWJsaWMgZG9tYWluJywgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOlB1YmxpYyBkb21haW47ICAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ01JVCcsICAgICAgICAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6TUlUOyAgICAgICAgICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnQlNEIDItY2xhdXNlJywgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTpCU0QgMi1jbGF1c2U7ICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdCU0QgMy1jbGF1c2UnLCAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOkJTRCAzLWNsYXVzZTsgICAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ0FwYWNoZSAyLjAnLCAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6QXBhY2hlIDIuMDsgICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnTW96aWxsYSAyLjAnLCAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTpNb3ppbGxhIDIuMDsgICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdHUEwgdjInLCAgICAgICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOkdQTCB2MjsgICAgICAgICAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ0dQTCB2MycsICAgICAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6R1BMIHYzOyAgICAgICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnTEdQTCB2Mi4xJywgICAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTpMR1BMIHYyLjE7ICAgICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdMR1BMIHYzLjAnLCAgICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOkxHUEwgdjMuMDsgICAgICAgICBhLT5iO2A7IH0pICk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdzcGFjZWQnLCBhc3luYyBpdCA9PiB7XG4gICAgaXQoJ1B1YmxpYyBkb21haW4nLCAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6IFB1YmxpYyBkb21haW4gOyAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnTUlUJywgICAgICAgICAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTogTUlUIDsgICAgICAgICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdCU0QgMi1jbGF1c2UnLCAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOiBCU0QgMi1jbGF1c2UgOyAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ0JTRCAzLWNsYXVzZScsICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6IEJTRCAzLWNsYXVzZSA7ICAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnQXBhY2hlIDIuMCcsICAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTogQXBhY2hlIDIuMCA7ICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdNb3ppbGxhIDIuMCcsICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOiBNb3ppbGxhIDIuMCA7ICAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ0dQTCB2MicsICAgICAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6IEdQTCB2MiA7ICAgICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnR1BMIHYzJywgICAgICAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTogR1BMIHYzIDsgICAgICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdMR1BMIHYyLjEnLCAgICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOiBMR1BMIHYyLjEgOyAgICAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ0xHUEwgdjMuMCcsICAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6IExHUEwgdjMuMCA7ICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgfSk7XG5cbiAgb2l0KCdzaW5nbGUgYXRvbScsICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOiBib2I7ICAgICAgICAgICAgICAgYS0+YjtgOyB9KSApO1xuICBvaXQoJ3NpbmdsZSBxdW90ZWQgc3RyaW5nJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6IFwiYm8gYlwiOyAgICAgICAgICAgIGEtPmI7YDsgfSkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ2ZzbF92ZXJzaW9uJywgYXN5bmMgaXQ3ID0+IHtcblxuICBpdDcoJ3NlbXZlciAwLjAuMCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYGZzbF92ZXJzaW9uOiAwLjAuMDsgYS0+YjtgOyB9KSApO1xuICBpdDcoJ3NlbXZlciAwLjAuMScsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYGZzbF92ZXJzaW9uOiAwLjAuMTsgYS0+YjtgOyB9KSApO1xuICBpdDcoJ3NlbXZlciAwLjEuMCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYGZzbF92ZXJzaW9uOiAwLjEuMDsgYS0+YjtgOyB9KSApO1xuICBpdDcoJ3NlbXZlciAxLjAuMCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYGZzbF92ZXJzaW9uOiAxLjAuMDsgYS0+YjtgOyB9KSApO1xuICBpdDcoJ3NlbXZlciAxLjAuMScsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYGZzbF92ZXJzaW9uOiAxLjAuMTsgYS0+YjtgOyB9KSApO1xuICBpdDcoJ3NlbXZlciAxLjEuMScsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYGZzbF92ZXJzaW9uOiAxLjEuMTsgYS0+YjtgOyB9KSApO1xuICBpdDcoJ3NlbXZlciAyLjAuMCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYGZzbF92ZXJzaW9uOiAyLjAuMDsgYS0+YjtgOyB9KSApO1xuXG4gIGl0Nygnc2VtdmVyIG5vdEFTJywgdCA9PiB0LnRocm93cygoKSA9PiB7IGNvbnN0IF9mID0gc21gZnNsX3ZlcnNpb246IFwiTm90IGEgc2VtdmVyXCI7IGEtPmI7YDsgfSkgKTtcblxuICBpdDcoJ3JldHZhbCBjb3JyZWN0JywgdCA9PlxuICAgIHQuZGVlcEVxdWFsKFxuICAgICAge2Z1bGw6XCIwLjAuMFwiLCBtYWpvcjowLCBtaW5vcjowLCBwYXRjaDowfSxcbiAgICAgIHNtYGZzbF92ZXJzaW9uOiAwLjAuMDsgYS0+YjtgLmZzbF92ZXJzaW9uKClcbiAgICApXG4gICk7XG5cbn0pO1xuIl19