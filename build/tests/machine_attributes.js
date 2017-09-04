'use strict';

var _templateObject = _taggedTemplateLiteral(['machine_name: bob;    a->b;'], ['machine_name: bob;    a->b;']),
    _templateObject2 = _taggedTemplateLiteral(['machine_name: "bo b"; a->b;'], ['machine_name: "bo b"; a->b;']),
    _templateObject3 = _taggedTemplateLiteral(['machine_author: bob;               a->b;'], ['machine_author: bob;               a->b;']),
    _templateObject4 = _taggedTemplateLiteral(['machine_author: "bo b";            a->b;'], ['machine_author: "bo b";            a->b;']),
    _templateObject5 = _taggedTemplateLiteral(['machine_author: [bob dobbs];       a->b;'], ['machine_author: [bob dobbs];       a->b;']),
    _templateObject6 = _taggedTemplateLiteral(['machine_author: ["bo b" "do bbs"]; a->b;'], ['machine_author: ["bo b" "do bbs"]; a->b;']),
    _templateObject7 = _taggedTemplateLiteral(['machine_author: [bob "do bbs"];    a->b;'], ['machine_author: [bob "do bbs"];    a->b;']),
    _templateObject8 = _taggedTemplateLiteral(['machine_author: ["bo b" dobbs];    a->b;'], ['machine_author: ["bo b" dobbs];    a->b;']),
    _templateObject9 = _taggedTemplateLiteral(['machine_contributor: bob;               a->b;'], ['machine_contributor: bob;               a->b;']),
    _templateObject10 = _taggedTemplateLiteral(['machine_contributor: "bo b";            a->b;'], ['machine_contributor: "bo b";            a->b;']),
    _templateObject11 = _taggedTemplateLiteral(['machine_contributor: [bob dobbs];       a->b;'], ['machine_contributor: [bob dobbs];       a->b;']),
    _templateObject12 = _taggedTemplateLiteral(['machine_contributor: ["bo b" "do bbs"]; a->b;'], ['machine_contributor: ["bo b" "do bbs"]; a->b;']),
    _templateObject13 = _taggedTemplateLiteral(['machine_contributor: [bob "do bbs"];    a->b;'], ['machine_contributor: [bob "do bbs"];    a->b;']),
    _templateObject14 = _taggedTemplateLiteral(['machine_contributor: ["bo b" dobbs];    a->b;'], ['machine_contributor: ["bo b" dobbs];    a->b;']),
    _templateObject15 = _taggedTemplateLiteral(['machine_comment: bob;    a->b;'], ['machine_comment: bob;    a->b;']),
    _templateObject16 = _taggedTemplateLiteral(['machine_comment: "bo b"; a->b;'], ['machine_comment: "bo b"; a->b;']),
    _templateObject17 = _taggedTemplateLiteral(['machine_definition: http://google.com/ ; a->b;'], ['machine_definition: http://google.com/ ; a->b;']),
    _templateObject18 = _taggedTemplateLiteral(['machine_version: 0.0.0; a->b;'], ['machine_version: 0.0.0; a->b;']),
    _templateObject19 = _taggedTemplateLiteral(['machine_version: 0.0.1; a->b;'], ['machine_version: 0.0.1; a->b;']),
    _templateObject20 = _taggedTemplateLiteral(['machine_version: 0.1.0; a->b;'], ['machine_version: 0.1.0; a->b;']),
    _templateObject21 = _taggedTemplateLiteral(['machine_version: 1.0.0; a->b;'], ['machine_version: 1.0.0; a->b;']),
    _templateObject22 = _taggedTemplateLiteral(['machine_version: 1.0.1; a->b;'], ['machine_version: 1.0.1; a->b;']),
    _templateObject23 = _taggedTemplateLiteral(['machine_version: 1.1.1; a->b;'], ['machine_version: 1.1.1; a->b;']),
    _templateObject24 = _taggedTemplateLiteral(['machine_version: 2.0.0; a->b;'], ['machine_version: 2.0.0; a->b;']),
    _templateObject25 = _taggedTemplateLiteral(['machine_license:Public domain;     a->b;'], ['machine_license:Public domain;     a->b;']),
    _templateObject26 = _taggedTemplateLiteral(['machine_license:MIT;               a->b;'], ['machine_license:MIT;               a->b;']),
    _templateObject27 = _taggedTemplateLiteral(['machine_license:BSD 2-clause;      a->b;'], ['machine_license:BSD 2-clause;      a->b;']),
    _templateObject28 = _taggedTemplateLiteral(['machine_license:BSD 3-clause;      a->b;'], ['machine_license:BSD 3-clause;      a->b;']),
    _templateObject29 = _taggedTemplateLiteral(['machine_license:Apache 2.0;        a->b;'], ['machine_license:Apache 2.0;        a->b;']),
    _templateObject30 = _taggedTemplateLiteral(['machine_license:Mozilla 2.0;       a->b;'], ['machine_license:Mozilla 2.0;       a->b;']),
    _templateObject31 = _taggedTemplateLiteral(['machine_license:GPL v2;            a->b;'], ['machine_license:GPL v2;            a->b;']),
    _templateObject32 = _taggedTemplateLiteral(['machine_license:GPL v3;            a->b;'], ['machine_license:GPL v3;            a->b;']),
    _templateObject33 = _taggedTemplateLiteral(['machine_license:LGPL v2.1;         a->b;'], ['machine_license:LGPL v2.1;         a->b;']),
    _templateObject34 = _taggedTemplateLiteral(['machine_license:LGPL v3.0;         a->b;'], ['machine_license:LGPL v3.0;         a->b;']),
    _templateObject35 = _taggedTemplateLiteral(['machine_license: Public domain ;   a->b;'], ['machine_license: Public domain ;   a->b;']),
    _templateObject36 = _taggedTemplateLiteral(['machine_license: MIT ;             a->b;'], ['machine_license: MIT ;             a->b;']),
    _templateObject37 = _taggedTemplateLiteral(['machine_license: BSD 2-clause ;    a->b;'], ['machine_license: BSD 2-clause ;    a->b;']),
    _templateObject38 = _taggedTemplateLiteral(['machine_license: BSD 3-clause ;    a->b;'], ['machine_license: BSD 3-clause ;    a->b;']),
    _templateObject39 = _taggedTemplateLiteral(['machine_license: Apache 2.0 ;      a->b;'], ['machine_license: Apache 2.0 ;      a->b;']),
    _templateObject40 = _taggedTemplateLiteral(['machine_license: Mozilla 2.0 ;     a->b;'], ['machine_license: Mozilla 2.0 ;     a->b;']),
    _templateObject41 = _taggedTemplateLiteral(['machine_license: GPL v2 ;          a->b;'], ['machine_license: GPL v2 ;          a->b;']),
    _templateObject42 = _taggedTemplateLiteral(['machine_license: GPL v3 ;          a->b;'], ['machine_license: GPL v3 ;          a->b;']),
    _templateObject43 = _taggedTemplateLiteral(['machine_license: LGPL v2.1 ;       a->b;'], ['machine_license: LGPL v2.1 ;       a->b;']),
    _templateObject44 = _taggedTemplateLiteral(['machine_license: LGPL v3.0 ;       a->b;'], ['machine_license: LGPL v3.0 ;       a->b;']),
    _templateObject45 = _taggedTemplateLiteral(['machine_license: bob;               a->b;'], ['machine_license: bob;               a->b;']),
    _templateObject46 = _taggedTemplateLiteral(['machine_license: "bo b";            a->b;'], ['machine_license: "bo b";            a->b;']),
    _templateObject47 = _taggedTemplateLiteral(['fsl_version: 0.0.0; a->b;'], ['fsl_version: 0.0.0; a->b;']),
    _templateObject48 = _taggedTemplateLiteral(['fsl_version: 0.0.1; a->b;'], ['fsl_version: 0.0.1; a->b;']),
    _templateObject49 = _taggedTemplateLiteral(['fsl_version: 0.1.0; a->b;'], ['fsl_version: 0.1.0; a->b;']),
    _templateObject50 = _taggedTemplateLiteral(['fsl_version: 1.0.0; a->b;'], ['fsl_version: 1.0.0; a->b;']),
    _templateObject51 = _taggedTemplateLiteral(['fsl_version: 1.0.1; a->b;'], ['fsl_version: 1.0.1; a->b;']),
    _templateObject52 = _taggedTemplateLiteral(['fsl_version: 1.1.1; a->b;'], ['fsl_version: 1.1.1; a->b;']),
    _templateObject53 = _taggedTemplateLiteral(['fsl_version: 2.0.0; a->b;'], ['fsl_version: 2.0.0; a->b;']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

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
});

(0, _avaSpec.describe)('machine_author', async function (it2) {
  it2('single atom', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject3);
    });
  });
  it2('single quoted string', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject4);
    });
  });
  it2('atom list', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject5);
    });
  });
  it2('quoted string list', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject6);
    });
  });
  it2('mixed list a/q', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject7);
    });
  });
  it2('mixed list q/a', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject8);
    });
  });
});

(0, _avaSpec.describe)('machine_contributor', async function (it3) {
  it3('atom', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject9);
    });
  });
  it3('quoted string', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject10);
    });
  });
  it3('atom list', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject11);
    });
  });
  it3('quoted string list', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject12);
    });
  });
  it3('mixed list a/q', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject13);
    });
  });
  it3('mixed list q/a', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject14);
    });
  });
});

(0, _avaSpec.describe)('machine_comment', async function (it4) {
  it4('atom', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject15);
    });
  });
  it4('quoted string', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject16);
    });
  });
});

(0, _avaSpec.describe)('machine_definition', async function (it5) {
  it5('url', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject17);
    });
  });
  it5('url', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject17);
    });
  });
});

(0, _avaSpec.describe)('machine_version', async function (it6) {
  it6('semver 0.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject18);
    });
  });
  it6('semver 0.0.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject19);
    });
  });
  it6('semver 0.1.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject20);
    });
  });
  it6('semver 1.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject21);
    });
  });
  it6('semver 1.0.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject22);
    });
  });
  it6('semver 1.1.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject23);
    });
  });
  it6('semver 2.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject24);
    });
  });
});

(0, _avaSpec.describe)('machine_license', async function (oit) {

  (0, _avaSpec.describe)('near', async function (it) {
    it('Public domain', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject25);
      });
    });
    it('MIT', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject26);
      });
    });
    it('BSD 2-clause', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject27);
      });
    });
    it('BSD 3-clause', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject28);
      });
    });
    it('Apache 2.0', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject29);
      });
    });
    it('Mozilla 2.0', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject30);
      });
    });
    it('GPL v2', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject31);
      });
    });
    it('GPL v3', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject32);
      });
    });
    it('LGPL v2.1', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject33);
      });
    });
    it('LGPL v3.0', function (t) {
      return t.notThrows(function () {
        var _ = sm(_templateObject34);
      });
    });
  });

  (0, _avaSpec.describe)('spaced', async function (it) {
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

  oit('single atom', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject45);
    });
  });
  oit('single quoted string', function (t) {
    return t.notThrows(function () {
      var _ = sm(_templateObject46);
    });
  });
});

(0, _avaSpec.describe)('fsl_version', async function (it7) {
  it7('semver 0.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject47);
    });
  });
  it7('semver 0.0.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject48);
    });
  });
  it7('semver 0.1.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject49);
    });
  });
  it7('semver 1.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject50);
    });
  });
  it7('semver 1.0.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject51);
    });
  });
  it7('semver 1.1.1', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject52);
    });
  });
  it7('semver 2.0.0', function (t) {
    return t.notThrows(function () {
      var _f = sm(_templateObject53);
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9tYWNoaW5lX2F0dHJpYnV0ZXMuanMiXSwibmFtZXMiOlsianNzbSIsInJlcXVpcmUiLCJzbSIsIml0IiwidCIsIm5vdFRocm93cyIsIl9mb28iLCJpdDIiLCJpdDMiLCJfIiwiaXQ0IiwiaXQ1IiwiaXQ2IiwiX2YiLCJvaXQiLCJpdDciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0E7Ozs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFBQSxJQUNNQyxLQUFPRixLQUFLRSxFQURsQjs7QUFPQSx1QkFBUyxjQUFULEVBQXlCLGdCQUFNQyxFQUFOLEVBQVk7QUFDbkNBLEtBQUcsTUFBSCxFQUFvQjtBQUFBLFdBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTUMsT0FBT0osRUFBUCxpQkFBTjtBQUErQyxLQUFuRSxDQUFMO0FBQUEsR0FBcEI7QUFDQUMsS0FBRyxlQUFILEVBQW9CO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNQyxPQUFPSixFQUFQLGtCQUFOO0FBQStDLEtBQW5FLENBQUw7QUFBQSxHQUFwQjtBQUNELENBSEQ7O0FBU0EsdUJBQVMsZ0JBQVQsRUFBMkIsZ0JBQU1LLEdBQU4sRUFBYTtBQUN0Q0EsTUFBSSxhQUFKLEVBQTRCO0FBQUEsV0FBS0gsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNQyxPQUFPSixFQUFQLGtCQUFOO0FBQTRELEtBQWhGLENBQUw7QUFBQSxHQUE1QjtBQUNBSyxNQUFJLHNCQUFKLEVBQTRCO0FBQUEsV0FBS0gsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNQyxPQUFPSixFQUFQLGtCQUFOO0FBQTRELEtBQWhGLENBQUw7QUFBQSxHQUE1QjtBQUNBSyxNQUFJLFdBQUosRUFBNEI7QUFBQSxXQUFLSCxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1DLE9BQU9KLEVBQVAsa0JBQU47QUFBNEQsS0FBaEYsQ0FBTDtBQUFBLEdBQTVCO0FBQ0FLLE1BQUksb0JBQUosRUFBNEI7QUFBQSxXQUFLSCxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1DLE9BQU9KLEVBQVAsa0JBQU47QUFBNEQsS0FBaEYsQ0FBTDtBQUFBLEdBQTVCO0FBQ0FLLE1BQUksZ0JBQUosRUFBNEI7QUFBQSxXQUFLSCxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1DLE9BQU9KLEVBQVAsa0JBQU47QUFBNEQsS0FBaEYsQ0FBTDtBQUFBLEdBQTVCO0FBQ0FLLE1BQUksZ0JBQUosRUFBNEI7QUFBQSxXQUFLSCxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1DLE9BQU9KLEVBQVAsa0JBQU47QUFBNEQsS0FBaEYsQ0FBTDtBQUFBLEdBQTVCO0FBQ0QsQ0FQRDs7QUFhQSx1QkFBUyxxQkFBVCxFQUFnQyxnQkFBTU0sR0FBTixFQUFhO0FBQzNDQSxNQUFJLE1BQUosRUFBMEI7QUFBQSxXQUFLSixFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1JLElBQUlQLEVBQUosa0JBQU47QUFBOEQsS0FBbEYsQ0FBTDtBQUFBLEdBQTFCO0FBQ0FNLE1BQUksZUFBSixFQUEwQjtBQUFBLFdBQUtKLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTUksSUFBSVAsRUFBSixtQkFBTjtBQUE4RCxLQUFsRixDQUFMO0FBQUEsR0FBMUI7QUFDQU0sTUFBSSxXQUFKLEVBQTBCO0FBQUEsV0FBS0osRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNSSxJQUFJUCxFQUFKLG1CQUFOO0FBQThELEtBQWxGLENBQUw7QUFBQSxHQUExQjtBQUNBTSxNQUFJLG9CQUFKLEVBQTBCO0FBQUEsV0FBS0osRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNSSxJQUFJUCxFQUFKLG1CQUFOO0FBQThELEtBQWxGLENBQUw7QUFBQSxHQUExQjtBQUNBTSxNQUFJLGdCQUFKLEVBQTBCO0FBQUEsV0FBS0osRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNSSxJQUFJUCxFQUFKLG1CQUFOO0FBQThELEtBQWxGLENBQUw7QUFBQSxHQUExQjtBQUNBTSxNQUFJLGdCQUFKLEVBQTBCO0FBQUEsV0FBS0osRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNSSxJQUFJUCxFQUFKLG1CQUFOO0FBQThELEtBQWxGLENBQUw7QUFBQSxHQUExQjtBQUNELENBUEQ7O0FBYUEsdUJBQVMsaUJBQVQsRUFBNEIsZ0JBQU1RLEdBQU4sRUFBYTtBQUN2Q0EsTUFBSSxNQUFKLEVBQXFCO0FBQUEsV0FBS04sRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNQyxPQUFPSixFQUFQLG1CQUFOO0FBQWtELEtBQXRFLENBQUw7QUFBQSxHQUFyQjtBQUNBUSxNQUFJLGVBQUosRUFBcUI7QUFBQSxXQUFLTixFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1DLE9BQU9KLEVBQVAsbUJBQU47QUFBa0QsS0FBdEUsQ0FBTDtBQUFBLEdBQXJCO0FBQ0QsQ0FIRDs7QUFTQSx1QkFBUyxvQkFBVCxFQUErQixnQkFBTVMsR0FBTixFQUFhO0FBQzFDQSxNQUFJLEtBQUosRUFBVztBQUFBLFdBQUtQLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTUMsT0FBT0osRUFBUCxtQkFBTjtBQUFrRSxLQUF0RixDQUFMO0FBQUEsR0FBWDtBQUNBUyxNQUFJLEtBQUosRUFBVztBQUFBLFdBQUtQLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTUMsT0FBT0osRUFBUCxtQkFBTjtBQUFrRSxLQUF0RixDQUFMO0FBQUEsR0FBWDtBQUNELENBSEQ7O0FBU0EsdUJBQVMsaUJBQVQsRUFBNEIsZ0JBQU1VLEdBQU4sRUFBYTtBQUN2Q0EsTUFBSSxjQUFKLEVBQW9CO0FBQUEsV0FBS1IsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNUSxLQUFLWCxFQUFMLG1CQUFOO0FBQStDLEtBQW5FLENBQUw7QUFBQSxHQUFwQjtBQUNBVSxNQUFJLGNBQUosRUFBb0I7QUFBQSxXQUFLUixFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1RLEtBQUtYLEVBQUwsbUJBQU47QUFBK0MsS0FBbkUsQ0FBTDtBQUFBLEdBQXBCO0FBQ0FVLE1BQUksY0FBSixFQUFvQjtBQUFBLFdBQUtSLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTVEsS0FBS1gsRUFBTCxtQkFBTjtBQUErQyxLQUFuRSxDQUFMO0FBQUEsR0FBcEI7QUFDQVUsTUFBSSxjQUFKLEVBQW9CO0FBQUEsV0FBS1IsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNUSxLQUFLWCxFQUFMLG1CQUFOO0FBQStDLEtBQW5FLENBQUw7QUFBQSxHQUFwQjtBQUNBVSxNQUFJLGNBQUosRUFBb0I7QUFBQSxXQUFLUixFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1RLEtBQUtYLEVBQUwsbUJBQU47QUFBK0MsS0FBbkUsQ0FBTDtBQUFBLEdBQXBCO0FBQ0FVLE1BQUksY0FBSixFQUFvQjtBQUFBLFdBQUtSLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTVEsS0FBS1gsRUFBTCxtQkFBTjtBQUErQyxLQUFuRSxDQUFMO0FBQUEsR0FBcEI7QUFDQVUsTUFBSSxjQUFKLEVBQW9CO0FBQUEsV0FBS1IsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNUSxLQUFLWCxFQUFMLG1CQUFOO0FBQStDLEtBQW5FLENBQUw7QUFBQSxHQUFwQjtBQUNELENBUkQ7O0FBY0EsdUJBQVMsaUJBQVQsRUFBNEIsZ0JBQU1ZLEdBQU4sRUFBYTs7QUFFdkMseUJBQVMsTUFBVCxFQUFpQixnQkFBTVgsRUFBTixFQUFZO0FBQzNCQSxPQUFHLGVBQUgsRUFBMkI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFlBQU1JLElBQUlQLEVBQUosbUJBQU47QUFBeUQsT0FBN0UsQ0FBTDtBQUFBLEtBQTNCO0FBQ0FDLE9BQUcsS0FBSCxFQUEyQjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsWUFBTUksSUFBSVAsRUFBSixtQkFBTjtBQUF5RCxPQUE3RSxDQUFMO0FBQUEsS0FBM0I7QUFDQUMsT0FBRyxjQUFILEVBQTJCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxZQUFNSSxJQUFJUCxFQUFKLG1CQUFOO0FBQXlELE9BQTdFLENBQUw7QUFBQSxLQUEzQjtBQUNBQyxPQUFHLGNBQUgsRUFBMkI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFlBQU1JLElBQUlQLEVBQUosbUJBQU47QUFBeUQsT0FBN0UsQ0FBTDtBQUFBLEtBQTNCO0FBQ0FDLE9BQUcsWUFBSCxFQUEyQjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsWUFBTUksSUFBSVAsRUFBSixtQkFBTjtBQUF5RCxPQUE3RSxDQUFMO0FBQUEsS0FBM0I7QUFDQUMsT0FBRyxhQUFILEVBQTJCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxZQUFNSSxJQUFJUCxFQUFKLG1CQUFOO0FBQXlELE9BQTdFLENBQUw7QUFBQSxLQUEzQjtBQUNBQyxPQUFHLFFBQUgsRUFBMkI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFlBQU1JLElBQUlQLEVBQUosbUJBQU47QUFBeUQsT0FBN0UsQ0FBTDtBQUFBLEtBQTNCO0FBQ0FDLE9BQUcsUUFBSCxFQUEyQjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsWUFBTUksSUFBSVAsRUFBSixtQkFBTjtBQUF5RCxPQUE3RSxDQUFMO0FBQUEsS0FBM0I7QUFDQUMsT0FBRyxXQUFILEVBQTJCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxZQUFNSSxJQUFJUCxFQUFKLG1CQUFOO0FBQXlELE9BQTdFLENBQUw7QUFBQSxLQUEzQjtBQUNBQyxPQUFHLFdBQUgsRUFBMkI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFlBQU1JLElBQUlQLEVBQUosbUJBQU47QUFBeUQsT0FBN0UsQ0FBTDtBQUFBLEtBQTNCO0FBQ0QsR0FYRDs7QUFhQSx5QkFBUyxRQUFULEVBQW1CLGdCQUFNQyxFQUFOLEVBQVk7QUFDN0JBLE9BQUcsZUFBSCxFQUEyQjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsWUFBTUksSUFBSVAsRUFBSixtQkFBTjtBQUF5RCxPQUE3RSxDQUFMO0FBQUEsS0FBM0I7QUFDQUMsT0FBRyxLQUFILEVBQTJCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxZQUFNSSxJQUFJUCxFQUFKLG1CQUFOO0FBQXlELE9BQTdFLENBQUw7QUFBQSxLQUEzQjtBQUNBQyxPQUFHLGNBQUgsRUFBMkI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFlBQU1JLElBQUlQLEVBQUosbUJBQU47QUFBeUQsT0FBN0UsQ0FBTDtBQUFBLEtBQTNCO0FBQ0FDLE9BQUcsY0FBSCxFQUEyQjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsWUFBTUksSUFBSVAsRUFBSixtQkFBTjtBQUF5RCxPQUE3RSxDQUFMO0FBQUEsS0FBM0I7QUFDQUMsT0FBRyxZQUFILEVBQTJCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxZQUFNSSxJQUFJUCxFQUFKLG1CQUFOO0FBQXlELE9BQTdFLENBQUw7QUFBQSxLQUEzQjtBQUNBQyxPQUFHLGFBQUgsRUFBMkI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFlBQU1JLElBQUlQLEVBQUosbUJBQU47QUFBeUQsT0FBN0UsQ0FBTDtBQUFBLEtBQTNCO0FBQ0FDLE9BQUcsUUFBSCxFQUEyQjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsWUFBTUksSUFBSVAsRUFBSixtQkFBTjtBQUF5RCxPQUE3RSxDQUFMO0FBQUEsS0FBM0I7QUFDQUMsT0FBRyxRQUFILEVBQTJCO0FBQUEsYUFBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxZQUFNSSxJQUFJUCxFQUFKLG1CQUFOO0FBQXlELE9BQTdFLENBQUw7QUFBQSxLQUEzQjtBQUNBQyxPQUFHLFdBQUgsRUFBMkI7QUFBQSxhQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFlBQU1JLElBQUlQLEVBQUosbUJBQU47QUFBeUQsT0FBN0UsQ0FBTDtBQUFBLEtBQTNCO0FBQ0FDLE9BQUcsV0FBSCxFQUEyQjtBQUFBLGFBQUtDLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsWUFBTUksSUFBSVAsRUFBSixtQkFBTjtBQUF5RCxPQUE3RSxDQUFMO0FBQUEsS0FBM0I7QUFDRCxHQVhEOztBQWFBWSxNQUFJLGFBQUosRUFBNEI7QUFBQSxXQUFLVixFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1JLElBQUlQLEVBQUosbUJBQU47QUFBMEQsS0FBOUUsQ0FBTDtBQUFBLEdBQTVCO0FBQ0FZLE1BQUksc0JBQUosRUFBNEI7QUFBQSxXQUFLVixFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1JLElBQUlQLEVBQUosbUJBQU47QUFBMEQsS0FBOUUsQ0FBTDtBQUFBLEdBQTVCO0FBRUQsQ0EvQkQ7O0FBcUNBLHVCQUFTLGFBQVQsRUFBd0IsZ0JBQU1hLEdBQU4sRUFBYTtBQUNuQ0EsTUFBSSxjQUFKLEVBQW9CO0FBQUEsV0FBS1gsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNUSxLQUFLWCxFQUFMLG1CQUFOO0FBQTJDLEtBQS9ELENBQUw7QUFBQSxHQUFwQjtBQUNBYSxNQUFJLGNBQUosRUFBb0I7QUFBQSxXQUFLWCxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1RLEtBQUtYLEVBQUwsbUJBQU47QUFBMkMsS0FBL0QsQ0FBTDtBQUFBLEdBQXBCO0FBQ0FhLE1BQUksY0FBSixFQUFvQjtBQUFBLFdBQUtYLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTVEsS0FBS1gsRUFBTCxtQkFBTjtBQUEyQyxLQUEvRCxDQUFMO0FBQUEsR0FBcEI7QUFDQWEsTUFBSSxjQUFKLEVBQW9CO0FBQUEsV0FBS1gsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNUSxLQUFLWCxFQUFMLG1CQUFOO0FBQTJDLEtBQS9ELENBQUw7QUFBQSxHQUFwQjtBQUNBYSxNQUFJLGNBQUosRUFBb0I7QUFBQSxXQUFLWCxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFLFVBQU1RLEtBQUtYLEVBQUwsbUJBQU47QUFBMkMsS0FBL0QsQ0FBTDtBQUFBLEdBQXBCO0FBQ0FhLE1BQUksY0FBSixFQUFvQjtBQUFBLFdBQUtYLEVBQUVDLFNBQUYsQ0FBWSxZQUFNO0FBQUUsVUFBTVEsS0FBS1gsRUFBTCxtQkFBTjtBQUEyQyxLQUEvRCxDQUFMO0FBQUEsR0FBcEI7QUFDQWEsTUFBSSxjQUFKLEVBQW9CO0FBQUEsV0FBS1gsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNUSxLQUFLWCxFQUFMLG1CQUFOO0FBQTJDLEtBQS9ELENBQUw7QUFBQSxHQUFwQjtBQUNELENBUkQiLCJmaWxlIjoibWFjaGluZV9hdHRyaWJ1dGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQge2Rlc2NyaWJlfSBmcm9tICdhdmEtc3BlYyc7XG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpLFxuICAgICAgc20gICA9IGpzc20uc207XG5cblxuXG5cblxuZGVzY3JpYmUoJ21hY2hpbmVfbmFtZScsIGFzeW5jIGl0ID0+IHtcbiAgaXQoJ2F0b20nLCAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2ZvbyA9IHNtYG1hY2hpbmVfbmFtZTogYm9iOyAgICBhLT5iO2A7IH0pICk7XG4gIGl0KCdxdW90ZWQgc3RyaW5nJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBtYWNoaW5lX25hbWU6IFwiYm8gYlwiOyBhLT5iO2A7IH0pICk7XG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnbWFjaGluZV9hdXRob3InLCBhc3luYyBpdDIgPT4ge1xuICBpdDIoJ3NpbmdsZSBhdG9tJywgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBtYWNoaW5lX2F1dGhvcjogYm9iOyAgICAgICAgICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgaXQyKCdzaW5nbGUgcXVvdGVkIHN0cmluZycsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gbWFjaGluZV9hdXRob3I6IFwiYm8gYlwiOyAgICAgICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgaXQyKCdhdG9tIGxpc3QnLCAgICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gbWFjaGluZV9hdXRob3I6IFtib2IgZG9iYnNdOyAgICAgICBhLT5iO2A7IH0pICk7XG4gIGl0MigncXVvdGVkIHN0cmluZyBsaXN0JywgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2ZvbyA9IHNtYG1hY2hpbmVfYXV0aG9yOiBbXCJibyBiXCIgXCJkbyBiYnNcIl07IGEtPmI7YDsgfSkgKTtcbiAgaXQyKCdtaXhlZCBsaXN0IGEvcScsICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gbWFjaGluZV9hdXRob3I6IFtib2IgXCJkbyBiYnNcIl07ICAgIGEtPmI7YDsgfSkgKTtcbiAgaXQyKCdtaXhlZCBsaXN0IHEvYScsICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gbWFjaGluZV9hdXRob3I6IFtcImJvIGJcIiBkb2Jic107ICAgIGEtPmI7YDsgfSkgKTtcbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdtYWNoaW5lX2NvbnRyaWJ1dG9yJywgYXN5bmMgaXQzID0+IHtcbiAgaXQzKCdhdG9tJywgICAgICAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfY29udHJpYnV0b3I6IGJvYjsgICAgICAgICAgICAgICBhLT5iO2A7IH0pICk7XG4gIGl0MygncXVvdGVkIHN0cmluZycsICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2NvbnRyaWJ1dG9yOiBcImJvIGJcIjsgICAgICAgICAgICBhLT5iO2A7IH0pICk7XG4gIGl0MygnYXRvbSBsaXN0JywgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2NvbnRyaWJ1dG9yOiBbYm9iIGRvYmJzXTsgICAgICAgYS0+YjtgOyB9KSApO1xuICBpdDMoJ3F1b3RlZCBzdHJpbmcgbGlzdCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9jb250cmlidXRvcjogW1wiYm8gYlwiIFwiZG8gYmJzXCJdOyBhLT5iO2A7IH0pICk7XG4gIGl0MygnbWl4ZWQgbGlzdCBhL3EnLCAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2NvbnRyaWJ1dG9yOiBbYm9iIFwiZG8gYmJzXCJdOyAgICBhLT5iO2A7IH0pICk7XG4gIGl0MygnbWl4ZWQgbGlzdCBxL2EnLCAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2NvbnRyaWJ1dG9yOiBbXCJibyBiXCIgZG9iYnNdOyAgICBhLT5iO2A7IH0pICk7XG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnbWFjaGluZV9jb21tZW50JywgYXN5bmMgaXQ0ID0+IHtcbiAgaXQ0KCdhdG9tJywgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBtYWNoaW5lX2NvbW1lbnQ6IGJvYjsgICAgYS0+YjtgOyB9KSApO1xuICBpdDQoJ3F1b3RlZCBzdHJpbmcnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2ZvbyA9IHNtYG1hY2hpbmVfY29tbWVudDogXCJibyBiXCI7IGEtPmI7YDsgfSkgKTtcbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdtYWNoaW5lX2RlZmluaXRpb24nLCBhc3luYyBpdDUgPT4ge1xuICBpdDUoJ3VybCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gbWFjaGluZV9kZWZpbml0aW9uOiBodHRwOi8vZ29vZ2xlLmNvbS8gOyBhLT5iO2A7IH0pICk7XG4gIGl0NSgndXJsJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBtYWNoaW5lX2RlZmluaXRpb246IGh0dHA6Ly9nb29nbGUuY29tLyA7IGEtPmI7YDsgfSkgKTtcbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdtYWNoaW5lX3ZlcnNpb24nLCBhc3luYyBpdDYgPT4ge1xuICBpdDYoJ3NlbXZlciAwLjAuMCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYG1hY2hpbmVfdmVyc2lvbjogMC4wLjA7IGEtPmI7YDsgfSkgKTtcbiAgaXQ2KCdzZW12ZXIgMC4wLjEnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBtYWNoaW5lX3ZlcnNpb246IDAuMC4xOyBhLT5iO2A7IH0pICk7XG4gIGl0Nignc2VtdmVyIDAuMS4wJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mID0gc21gbWFjaGluZV92ZXJzaW9uOiAwLjEuMDsgYS0+YjtgOyB9KSApO1xuICBpdDYoJ3NlbXZlciAxLjAuMCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYG1hY2hpbmVfdmVyc2lvbjogMS4wLjA7IGEtPmI7YDsgfSkgKTtcbiAgaXQ2KCdzZW12ZXIgMS4wLjEnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBtYWNoaW5lX3ZlcnNpb246IDEuMC4xOyBhLT5iO2A7IH0pICk7XG4gIGl0Nignc2VtdmVyIDEuMS4xJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mID0gc21gbWFjaGluZV92ZXJzaW9uOiAxLjEuMTsgYS0+YjtgOyB9KSApO1xuICBpdDYoJ3NlbXZlciAyLjAuMCcsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZiA9IHNtYG1hY2hpbmVfdmVyc2lvbjogMi4wLjA7IGEtPmI7YDsgfSkgKTtcbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdtYWNoaW5lX2xpY2Vuc2UnLCBhc3luYyBvaXQgPT4ge1xuXG4gIGRlc2NyaWJlKCduZWFyJywgYXN5bmMgaXQgPT4ge1xuICAgIGl0KCdQdWJsaWMgZG9tYWluJywgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOlB1YmxpYyBkb21haW47ICAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ01JVCcsICAgICAgICAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6TUlUOyAgICAgICAgICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnQlNEIDItY2xhdXNlJywgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTpCU0QgMi1jbGF1c2U7ICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdCU0QgMy1jbGF1c2UnLCAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOkJTRCAzLWNsYXVzZTsgICAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ0FwYWNoZSAyLjAnLCAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6QXBhY2hlIDIuMDsgICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnTW96aWxsYSAyLjAnLCAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTpNb3ppbGxhIDIuMDsgICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdHUEwgdjInLCAgICAgICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOkdQTCB2MjsgICAgICAgICAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ0dQTCB2MycsICAgICAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6R1BMIHYzOyAgICAgICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnTEdQTCB2Mi4xJywgICAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTpMR1BMIHYyLjE7ICAgICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdMR1BMIHYzLjAnLCAgICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOkxHUEwgdjMuMDsgICAgICAgICBhLT5iO2A7IH0pICk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdzcGFjZWQnLCBhc3luYyBpdCA9PiB7XG4gICAgaXQoJ1B1YmxpYyBkb21haW4nLCAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6IFB1YmxpYyBkb21haW4gOyAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnTUlUJywgICAgICAgICAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTogTUlUIDsgICAgICAgICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdCU0QgMi1jbGF1c2UnLCAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOiBCU0QgMi1jbGF1c2UgOyAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ0JTRCAzLWNsYXVzZScsICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6IEJTRCAzLWNsYXVzZSA7ICAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnQXBhY2hlIDIuMCcsICAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTogQXBhY2hlIDIuMCA7ICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdNb3ppbGxhIDIuMCcsICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOiBNb3ppbGxhIDIuMCA7ICAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ0dQTCB2MicsICAgICAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6IEdQTCB2MiA7ICAgICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgICBpdCgnR1BMIHYzJywgICAgICAgICAgICAgICB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgXyA9IHNtYG1hY2hpbmVfbGljZW5zZTogR1BMIHYzIDsgICAgICAgICAgYS0+YjtgOyB9KSApO1xuICAgIGl0KCdMR1BMIHYyLjEnLCAgICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOiBMR1BMIHYyLjEgOyAgICAgICBhLT5iO2A7IH0pICk7XG4gICAgaXQoJ0xHUEwgdjMuMCcsICAgICAgICAgICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6IExHUEwgdjMuMCA7ICAgICAgIGEtPmI7YDsgfSkgKTtcbiAgfSk7XG5cbiAgb2l0KCdzaW5nbGUgYXRvbScsICAgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfID0gc21gbWFjaGluZV9saWNlbnNlOiBib2I7ICAgICAgICAgICAgICAgYS0+YjtgOyB9KSApO1xuICBvaXQoJ3NpbmdsZSBxdW90ZWQgc3RyaW5nJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF8gPSBzbWBtYWNoaW5lX2xpY2Vuc2U6IFwiYm8gYlwiOyAgICAgICAgICAgIGEtPmI7YDsgfSkgKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ2ZzbF92ZXJzaW9uJywgYXN5bmMgaXQ3ID0+IHtcbiAgaXQ3KCdzZW12ZXIgMC4wLjAnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBmc2xfdmVyc2lvbjogMC4wLjA7IGEtPmI7YDsgfSkgKTtcbiAgaXQ3KCdzZW12ZXIgMC4wLjEnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBmc2xfdmVyc2lvbjogMC4wLjE7IGEtPmI7YDsgfSkgKTtcbiAgaXQ3KCdzZW12ZXIgMC4xLjAnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBmc2xfdmVyc2lvbjogMC4xLjA7IGEtPmI7YDsgfSkgKTtcbiAgaXQ3KCdzZW12ZXIgMS4wLjAnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBmc2xfdmVyc2lvbjogMS4wLjA7IGEtPmI7YDsgfSkgKTtcbiAgaXQ3KCdzZW12ZXIgMS4wLjEnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBmc2xfdmVyc2lvbjogMS4wLjE7IGEtPmI7YDsgfSkgKTtcbiAgaXQ3KCdzZW12ZXIgMS4xLjEnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBmc2xfdmVyc2lvbjogMS4xLjE7IGEtPmI7YDsgfSkgKTtcbiAgaXQ3KCdzZW12ZXIgMi4wLjAnLCB0ID0+IHQubm90VGhyb3dzKCgpID0+IHsgY29uc3QgX2YgPSBzbWBmc2xfdmVyc2lvbjogMi4wLjA7IGEtPmI7YDsgfSkgKTtcbn0pO1xuIl19