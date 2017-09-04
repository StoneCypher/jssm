'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js');
/* eslint-disable max-len */

(0, _avaSpec.describe)('block strategies', async function (it) {

  var AtoB = [{ "key": "transition", "from": "a", "se": { "kind": "->", "to": "b" } }],
      is_AB = function is_AB(str) {
    return it(_avaSpec.test, function (t) {
      return t.deepEqual(AtoB, jssm.parse(str));
    });
  },
      ABCD = [{ "key": "transition", "from": "a", "se": { "kind": "->", "to": "b" } }, { "key": "transition", "from": "c", "se": { "kind": "->", "to": "d" } }],
      is_ABCD = function is_ABCD(str) {
    return it(_avaSpec.test, function (t) {
      return t.deepEqual(ABCD, jssm.parse(str));
    });
  };

  (0, _avaSpec.describe)('empty block comments in left middle', async function (_it) {
    is_AB('a/**/->b;');
    is_AB('a /**/->b;');
    is_AB('a/**/ ->b;');
    is_AB('a /**/ ->b;');
    is_AB('a\n/**/->b;');
    is_AB('a/**/\n->b;');
    is_AB('a\n/**/\n->b;');
  });

  (0, _avaSpec.describe)('empty block comments in right middle', async function (_it) {
    is_AB('a->/**/b;');
    is_AB('a-> /**/b;');
    is_AB('a->/**/ b;');
    is_AB('a-> /**/ b;');
    is_AB('a->\n/**/b;');
    is_AB('a->/**/\nb;');
    is_AB('a->\n/**/\nb;');
  });

  (0, _avaSpec.describe)('non-empty block comments in left middle', async function (_it) {
    is_AB('a/* hello */->b;');
    is_AB('a /* hello */->b;');
    is_AB('a/* hello */ ->b;');
    is_AB('a /* hello */ ->b;');
    is_AB('a\n/* hello */ ->b;');
    is_AB('a/* hello */\n->b;');
    is_AB('a\n/* hello */\n->b;');
  });

  (0, _avaSpec.describe)('empty block comments before', async function (_it) {
    is_AB('/**/a->b;');
    is_AB('/**/ a->b;');
  });

  (0, _avaSpec.describe)('empty block comments inbetween', async function (_it) {
    is_ABCD('a->b;/**/c->d;');
    is_ABCD('a->b; /**/c->d;');
    is_ABCD('a->b;/**/ c->d;');
    is_ABCD('a->b; /**/ c->d;');
  });

  (0, _avaSpec.describe)('empty block comments after / at end', async function (_it) {
    is_AB('a->b;/**/');
    is_AB('a->b; /**/');
  });

  (0, _avaSpec.describe)('block commented code', async function (_it) {
    is_AB('a->b;/* c->d; */');
    is_AB('a->b;\n/*c -> d;*/\n');
    is_ABCD('a->b;/* e->f; */c->d;');
    is_ABCD('a->b;\n/*e -> f;*/\nc->d;');
    is_ABCD('a->b;\n/*e -> f;*/\nc->d;\n');
  });
});

(0, _avaSpec.describe)('line strategies', async function (it) {

  var AtoB = [{ "key": "transition", "from": "a", "se": { "kind": "->", "to": "b" } }],
      is_AB = function is_AB(str) {
    return it(_avaSpec.test, function (t) {
      return t.deepEqual(AtoB, jssm.parse(str));
    });
  },
      ABCD = [{ "key": "transition", "from": "a", "se": { "kind": "->", "to": "b" } }, { "key": "transition", "from": "c", "se": { "kind": "->", "to": "d" } }],
      is_ABCD = function is_ABCD(str) {
    return it(_avaSpec.test, function (t) {
      return t.deepEqual(ABCD, jssm.parse(str));
    });
  };

  (0, _avaSpec.describe)('empty line comments at end', async function (_it) {
    is_AB('a->b;//');
    is_AB('a->b; //');
    is_AB('a->b;//\n');
    is_AB('a->b; //\n');
  });

  (0, _avaSpec.describe)('non-empty line comments at end', async function (_it) {
    is_AB('a->b;// hello');
    is_AB('a->b; // hello');
    is_AB('a->b;// hello\n');
    is_AB('a->b; // hello\n');
  });

  (0, _avaSpec.describe)('empty line comments at beginning', async function (_it) {
    is_AB('//\na->b;');
  });

  (0, _avaSpec.describe)('non-empty line comments at beginning', async function (_it) {
    is_AB('// hello\na->b;');
  });

  (0, _avaSpec.describe)('empty line comments inbetween', async function (_it) {
    is_ABCD('a->b;//\nc->d;');
  });

  (0, _avaSpec.describe)('non-empty line comments inbetween', async function (_it) {
    is_ABCD('a->b;// hello\nc->d;');
  });

  (0, _avaSpec.describe)('line commented code', async function (_it) {
    is_AB('a->b;// c->d;');
    is_AB('a->b;\n//c -> d;\n');
    is_ABCD('a->b;// e->f;\nc->d;');
    is_ABCD('a->b;\n//e -> f;\nc->d;');
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9jb21tZW50LmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwiaXQiLCJBdG9CIiwiaXNfQUIiLCJ0IiwiZGVlcEVxdWFsIiwicGFyc2UiLCJzdHIiLCJBQkNEIiwiaXNfQUJDRCIsIl9pdCJdLCJtYXBwaW5ncyI6Ijs7QUFHQTs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFKQTs7QUFVQSx1QkFBUyxrQkFBVCxFQUE2QixnQkFBTUMsRUFBTixFQUFZOztBQUV2QyxNQUFNQyxPQUFVLENBQUMsRUFBQyxPQUFPLFlBQVIsRUFBc0IsUUFBUSxHQUE5QixFQUFtQyxNQUFNLEVBQUMsUUFBUSxJQUFULEVBQWMsTUFBTSxHQUFwQixFQUF6QyxFQUFELENBQWhCO0FBQUEsTUFDTUMsUUFBVSxTQUFWQSxLQUFVO0FBQUEsV0FBT0Ysa0JBQVM7QUFBQSxhQUFLRyxFQUFFQyxTQUFGLENBQVlILElBQVosRUFBa0JILEtBQUtPLEtBQUwsQ0FBV0MsR0FBWCxDQUFsQixDQUFMO0FBQUEsS0FBVCxDQUFQO0FBQUEsR0FEaEI7QUFBQSxNQUdNQyxPQUFVLENBQUMsRUFBQyxPQUFPLFlBQVIsRUFBc0IsUUFBUSxHQUE5QixFQUFtQyxNQUFNLEVBQUMsUUFBUSxJQUFULEVBQWMsTUFBTSxHQUFwQixFQUF6QyxFQUFELEVBQ0MsRUFBQyxPQUFPLFlBQVIsRUFBc0IsUUFBUSxHQUE5QixFQUFtQyxNQUFNLEVBQUMsUUFBUSxJQUFULEVBQWMsTUFBTSxHQUFwQixFQUF6QyxFQURELENBSGhCO0FBQUEsTUFNTUMsVUFBVSxTQUFWQSxPQUFVO0FBQUEsV0FBT1Isa0JBQVM7QUFBQSxhQUFLRyxFQUFFQyxTQUFGLENBQVlHLElBQVosRUFBa0JULEtBQUtPLEtBQUwsQ0FBV0MsR0FBWCxDQUFsQixDQUFMO0FBQUEsS0FBVCxDQUFQO0FBQUEsR0FOaEI7O0FBUUEseUJBQVMscUNBQVQsRUFBZ0QsZ0JBQU1HLEdBQU4sRUFBYTtB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TU8sR0FBTixFQUFhO0FBQ3hEUCxVQUFNLFdBQU47QUFDRCxHQUZEOztBQUlBLHlCQUFTLHNDQUFULEVBQWlELGdCQUFNTyxHQUFOLEVBQWE7QUFDNURQLFVBQU0saUJBQU47QUFDRCxHQUZEOztBQUlBLHlCQUFTLCtCQUFULEVBQTBDLGdCQUFNTyxHQUFOLEVBQWE7QUFDckRELFlBQVEsZ0JBQVI7QUFDRCxHQUZEOztBQUlBLHlCQUFTLG1DQUFULEVBQThDLGdCQUFNQyxHQUFOLEVBQWE7QUFDekRELFlBQVEsc0JBQVI7QUFDRCxHQUZEOztBQUlBLHlCQUFTLHFCQUFULEVBQWdDLGdCQUFNQyxHQUFOLEVBQWE7QUFDM0NQLFVBQU0sZUFBTjtBQUNBQSxVQUFNLG9CQUFOO0FBQ0FNLFlBQVEsc0JBQVI7QUFDQUEsWUFBUSx5QkFBUjtBQUNELEdBTEQ7QUFPRCxDQS9DRCIsImZpbGUiOiJjb21tZW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5cbmltcG9ydCB7dGVzdCwgZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QganNzbSA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ2Jsb2NrIHN0cmF0ZWdpZXMnLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgQXRvQiAgICA9IFt7XCJrZXlcIjogXCJ0cmFuc2l0aW9uXCIsIFwiZnJvbVwiOiBcImFcIiwgXCJzZVwiOiB7XCJraW5kXCI6IFwiLT5cIixcInRvXCI6IFwiYlwifX1dLFxuICAgICAgICBpc19BQiAgID0gc3RyID0+IGl0KHRlc3QsIHQgPT4gdC5kZWVwRXF1YWwoQXRvQiwganNzbS5wYXJzZShzdHIpKSksXG5cbiAgICAgICAgQUJDRCAgICA9IFt7XCJrZXlcIjogXCJ0cmFuc2l0aW9uXCIsIFwiZnJvbVwiOiBcImFcIiwgXCJzZVwiOiB7XCJraW5kXCI6IFwiLT5cIixcInRvXCI6IFwiYlwifX0sXG4gICAgICAgICAgICAgICAgICAge1wia2V5XCI6IFwidHJhbnNpdGlvblwiLCBcImZyb21cIjogXCJjXCIsIFwic2VcIjoge1wia2luZFwiOiBcIi0+XCIsXCJ0b1wiOiBcImRcIn19XSxcblxuICAgICAgICBpc19BQkNEID0gc3RyID0+IGl0KHRlc3QsIHQgPT4gdC5kZWVwRXF1YWwoQUJDRCwganNzbS5wYXJzZShzdHIpKSk7XG5cbiAgZGVzY3JpYmUoJ2VtcHR5IGJsb2NrIGNvbW1lbnRzIGluIGxlZnQgbWlkZGxlJywgYXN5bmMgX2l0ID0+IHtcbiAgICBpc19BQignYS8qKi8tPmI7Jyk7XG4gICAgaXNfQUIoJ2EgLyoqLy0+YjsnKTtcbiAgICBpc19BQignYS8qKi8gLT5iOycpO1xuICAgIGlzX0FCKCdhIC8qKi8gLT5iOycpO1xuICAgIGlzX0FCKCdhXFxuLyoqLy0+YjsnKTtcbiAgICBpc19BQignYS8qKi9cXG4tPmI7Jyk7XG4gICAgaXNfQUIoJ2FcXG4vKiovXFxuLT5iOycpO1xuICB9KTtcblxuICBkZXNjcmliZSgnZW1wdHkgYmxvY2sgY29tbWVudHMgaW4gcmlnaHQgbWlkZGxlJywgYXN5bmMgX2l0ID0+IHtcbiAgICBpc19BQignYS0+LyoqL2I7Jyk7XG4gICAgaXNfQUIoJ2EtPiAvKiovYjsnKTtcbiAgICBpc19BQignYS0+LyoqLyBiOycpO1xuICAgIGlzX0FCKCdhLT4gLyoqLyBiOycpO1xuICAgIGlzX0FCKCdhLT5cXG4vKiovYjsnKTtcbiAgICBpc19BQignYS0+LyoqL1xcbmI7Jyk7XG4gICAgaXNfQUIoJ2EtPlxcbi8qKi9cXG5iOycpO1xuICB9KTtcblxuICBkZXNjcmliZSgnbm9uLWVtcHR5IGJsb2NrIGNvbW1lbnRzIGluIGxlZnQgbWlkZGxlJywgYXN5bmMgX2l0ID0+IHtcbiAgICBpc19BQignYS8qIGhlbGxvICovLT5iOycpO1xuICAgIGlzX0FCKCdhIC8qIGhlbGxvICovLT5iOycpO1xuICAgIGlzX0FCKCdhLyogaGVsbG8gKi8gLT5iOycpO1xuICAgIGlzX0FCKCdhIC8qIGhlbGxvICovIC0+YjsnKTtcbiAgICBpc19BQignYVxcbi8qIGhlbGxvICovIC0+YjsnKTtcbiAgICBpc19BQignYS8qIGhlbGxvICovXFxuLT5iOycpO1xuICAgIGlzX0FCKCdhXFxuLyogaGVsbG8gKi9cXG4tPmI7Jyk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdlbXB0eSBibG9jayBjb21tZW50cyBiZWZvcmUnLCBhc3luYyBfaXQgPT4ge1xuICAgIGlzX0FCKCcvKiovYS0+YjsnKTtcbiAgICBpc19BQignLyoqLyBhLT5iOycpO1xuICB9KTtcblxuICBkZXNjcmliZSgnZW1wdHkgYmxvY2sgY29tbWVudHMgaW5iZXR3ZWVuJywgYXN5bmMgX2l0ID0+IHtcbiAgICBpc19BQkNEKCdhLT5iOy8qKi9jLT5kOycpO1xuICAgIGlzX0FCQ0QoJ2EtPmI7IC8qKi9jLT5kOycpO1xuICAgIGlzX0FCQ0QoJ2EtPmI7LyoqLyBjLT5kOycpO1xuICAgIGlzX0FCQ0QoJ2EtPmI7IC8qKi8gYy0+ZDsnKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2VtcHR5IGJsb2NrIGNvbW1lbnRzIGFmdGVyIC8gYXQgZW5kJywgYXN5bmMgX2l0ID0+IHtcbiAgICBpc19BQignYS0+YjsvKiovJyk7XG4gICAgaXNfQUIoJ2EtPmI7IC8qKi8nKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2Jsb2NrIGNvbW1lbnRlZCBjb2RlJywgYXN5bmMgX2l0ID0+IHtcbiAgICBpc19BQignYS0+YjsvKiBjLT5kOyAqLycpO1xuICAgIGlzX0FCKCdhLT5iO1xcbi8qYyAtPiBkOyovXFxuJyk7XG4gICAgaXNfQUJDRCgnYS0+YjsvKiBlLT5mOyAqL2MtPmQ7Jyk7XG4gICAgaXNfQUJDRCgnYS0+YjtcXG4vKmUgLT4gZjsqL1xcbmMtPmQ7Jyk7XG4gICAgaXNfQUJDRCgnYS0+YjtcXG4vKmUgLT4gZjsqL1xcbmMtPmQ7XFxuJyk7XG4gIH0pO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnbGluZSBzdHJhdGVnaWVzJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IEF0b0IgICAgPSBbe1wia2V5XCI6IFwidHJhbnNpdGlvblwiLCBcImZyb21cIjogXCJhXCIsIFwic2VcIjoge1wia2luZFwiOiBcIi0+XCIsXCJ0b1wiOiBcImJcIn19XSxcbiAgICAgICAgaXNfQUIgICA9IHN0ciA9PiBpdCh0ZXN0LCB0ID0+IHQuZGVlcEVxdWFsKEF0b0IsIGpzc20ucGFyc2Uoc3RyKSkpLFxuXG4gICAgICAgIEFCQ0QgICAgPSBbe1wia2V5XCI6IFwidHJhbnNpdGlvblwiLCBcImZyb21cIjogXCJhXCIsIFwic2VcIjoge1wia2luZFwiOiBcIi0+XCIsXCJ0b1wiOiBcImJcIn19LFxuICAgICAgICAgICAgICAgICAgIHtcImtleVwiOiBcInRyYW5zaXRpb25cIiwgXCJmcm9tXCI6IFwiY1wiLCBcInNlXCI6IHtcImtpbmRcIjogXCItPlwiLFwidG9cIjogXCJkXCJ9fV0sXG5cbiAgICAgICAgaXNfQUJDRCA9IHN0ciA9PiBpdCh0ZXN0LCB0ID0+IHQuZGVlcEVxdWFsKEFCQ0QsIGpzc20ucGFyc2Uoc3RyKSkpO1xuXG4gIGRlc2NyaWJlKCdlbXB0eSBsaW5lIGNvbW1lbnRzIGF0IGVuZCcsIGFzeW5jIF9pdCA9PiB7XG4gICAgaXNfQUIoJ2EtPmI7Ly8nKTtcbiAgICBpc19BQignYS0+YjsgLy8nKTtcbiAgICBpc19BQignYS0+YjsvL1xcbicpO1xuICAgIGlzX0FCKCdhLT5iOyAvL1xcbicpO1xuICB9KTtcblxuICBkZXNjcmliZSgnbm9uLWVtcHR5IGxpbmUgY29tbWVudHMgYXQgZW5kJywgYXN5bmMgX2l0ID0+IHtcbiAgICBpc19BQignYS0+YjsvLyBoZWxsbycpO1xuICAgIGlzX0FCKCdhLT5iOyAvLyBoZWxsbycpO1xuICAgIGlzX0FCKCdhLT5iOy8vIGhlbGxvXFxuJyk7XG4gICAgaXNfQUIoJ2EtPmI7IC8vIGhlbGxvXFxuJyk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdlbXB0eSBsaW5lIGNvbW1lbnRzIGF0IGJlZ2lubmluZycsIGFzeW5jIF9pdCA9PiB7XG4gICAgaXNfQUIoJy8vXFxuYS0+YjsnKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ25vbi1lbXB0eSBsaW5lIGNvbW1lbnRzIGF0IGJlZ2lubmluZycsIGFzeW5jIF9pdCA9PiB7XG4gICAgaXNfQUIoJy8vIGhlbGxvXFxuYS0+YjsnKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2VtcHR5IGxpbmUgY29tbWVudHMgaW5iZXR3ZWVuJywgYXN5bmMgX2l0ID0+IHtcbiAgICBpc19BQkNEKCdhLT5iOy8vXFxuYy0+ZDsnKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ25vbi1lbXB0eSBsaW5lIGNvbW1lbnRzIGluYmV0d2VlbicsIGFzeW5jIF9pdCA9PiB7XG4gICAgaXNfQUJDRCgnYS0+YjsvLyBoZWxsb1xcbmMtPmQ7Jyk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdsaW5lIGNvbW1lbnRlZCBjb2RlJywgYXN5bmMgX2l0ID0+IHtcbiAgICBpc19BQignYS0+YjsvLyBjLT5kOycpO1xuICAgIGlzX0FCKCdhLT5iO1xcbi8vYyAtPiBkO1xcbicpO1xuICAgIGlzX0FCQ0QoJ2EtPmI7Ly8gZS0+ZjtcXG5jLT5kOycpO1xuICAgIGlzX0FCQ0QoJ2EtPmI7XFxuLy9lIC0+IGY7XFxuYy0+ZDsnKTtcbiAgfSk7XG5cbn0pO1xuIl19