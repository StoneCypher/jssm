'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js');
/* eslint-disable max-len */

(0, _avaSpec.describe)('various commenting strategies', async function (it) {

  var AtoB = [{ "key": "transition", "from": "a", "se": { "kind": "->", "to": "b" } }],
      is_AB = function is_AB(str) {
    return it(_avaSpec.test, function (t) {
      return t.deepEqual(AtoB, jssm.parse(str));
    });
  };

  is_AB('a/**/->b;');
  is_AB('a /**/->b;');
  is_AB('a/**/ ->b;');
  is_AB('a /**/ ->b;');
  is_AB('a\n/**/->b;');
  is_AB('a/**/\n->b;');
  is_AB('a\n/**/\n->b;');

  is_AB('a/* hello */->b;');
  is_AB('a /* hello */->b;');
  is_AB('a/* hello */ ->b;');
  is_AB('a /* hello */ ->b;');
  is_AB('a\n/* hello */ ->b;');
  is_AB('a/* hello */\n->b;');
  is_AB('a\n/* hello */\n->b;');
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9jb21tZW50LmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwiaXQiLCJBdG9CIiwiaXNfQUIiLCJ0IiwiZGVlcEVxdWFsIiwicGFyc2UiLCJzdHIiXSwibWFwcGluZ3MiOiI7O0FBR0E7O0FBRUEsSUFBTUEsT0FBT0MsUUFBUSw0QkFBUixDQUFiO0FBSkE7O0FBVUEsdUJBQVMsK0JBQVQsRUFBMEMsZ0JBQU1DLEVBQU4sRUFBWTs7QUFFcEQsTUFBTUMsT0FBUSxDQUFDLEVBQUMsT0FBTyxZQUFSLEVBQXNCLFFBQVEsR0FBOUIsRUFBbUMsTUFBTSxFQUFDLFFBQVEsSUFBVCxFQUFjLE1BQU0sR0FBcEIsRUFBekMsRUFBRCxDQUFkO0FBQUEsTUFDTUMsUUFBUSxTQUFSQSxLQUFRO0FBQUEsV0FBT0Ysa0JBQVM7QUFBQSxhQUFLRyxFQUFFQyxTQUFGLENBQVlILElBQVosRUFBa0JILEtBQUtPLEtBQUwsQ0FBV0MsR0FBWCxDQUFsQixDQUFMO0FBQUEsS0FBVCxDQUFQO0FBQUEsR0FEZDs7QUFHQUosUUFBTSxXQUFOO0FBQ0FBLFFBQU0sWUFBTjtBQUNBQSxRQUFNLFlBQU47QUFDQUEsUUFBTSxhQUFOO0FBQ0FBLFFBQU0sYUFBTjtBQUNBQSxRQUFNLGFBQU47QUFDQUEsUUFBTSxlQUFOOztBQUVBQSxRQUFNLGtCQUFOO0FBQ0FBLFFBQU0sbUJBQU47QUFDQUEsUUFBTSxtQkFBTjtBQUNBQSxRQUFNLG9CQUFOO0FBQ0FBLFFBQU0scUJBQU47QUFDQUEsUUFBTSxvQkFBTjtBQUNBQSxRQUFNLHNCQUFOO0FBRUQsQ0FyQkQiLCJmaWxlIjoiY29tbWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuXG5pbXBvcnQge3Rlc3QsIGRlc2NyaWJlfSBmcm9tICdhdmEtc3BlYyc7XG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpO1xuXG5cblxuXG5cbmRlc2NyaWJlKCd2YXJpb3VzIGNvbW1lbnRpbmcgc3RyYXRlZ2llcycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBBdG9CICA9IFt7XCJrZXlcIjogXCJ0cmFuc2l0aW9uXCIsIFwiZnJvbVwiOiBcImFcIiwgXCJzZVwiOiB7XCJraW5kXCI6IFwiLT5cIixcInRvXCI6IFwiYlwifX1dLFxuICAgICAgICBpc19BQiA9IHN0ciA9PiBpdCh0ZXN0LCB0ID0+IHQuZGVlcEVxdWFsKEF0b0IsIGpzc20ucGFyc2Uoc3RyKSkpO1xuXG4gIGlzX0FCKCdhLyoqLy0+YjsnKTtcbiAgaXNfQUIoJ2EgLyoqLy0+YjsnKTtcbiAgaXNfQUIoJ2EvKiovIC0+YjsnKTtcbiAgaXNfQUIoJ2EgLyoqLyAtPmI7Jyk7XG4gIGlzX0FCKCdhXFxuLyoqLy0+YjsnKTtcbiAgaXNfQUIoJ2EvKiovXFxuLT5iOycpO1xuICBpc19BQignYVxcbi8qKi9cXG4tPmI7Jyk7XG5cbiAgaXNfQUIoJ2EvKiBoZWxsbyAqLy0+YjsnKTtcbiAgaXNfQUIoJ2EgLyogaGVsbG8gKi8tPmI7Jyk7XG4gIGlzX0FCKCdhLyogaGVsbG8gKi8gLT5iOycpO1xuICBpc19BQignYSAvKiBoZWxsbyAqLyAtPmI7Jyk7XG4gIGlzX0FCKCdhXFxuLyogaGVsbG8gKi8gLT5iOycpO1xuICBpc19BQignYS8qIGhlbGxvICovXFxuLT5iOycpO1xuICBpc19BQignYVxcbi8qIGhlbGxvICovXFxuLT5iOycpO1xuXG59KTtcbiJdfQ==