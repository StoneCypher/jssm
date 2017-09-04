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

  // describe('empty block comments inbetween', async _it => {
  //   is_AB('a->b;/**/c->d;');
  //   is_AB('a->b; /**/c->d;');
  //   is_AB('a->b;/**/ c->d;');
  //   is_AB('a->b; /**/ c->d;');
  // });

  (0, _avaSpec.describe)('empty block comments after / at end', async function (_it) {
    is_AB('a->b;/**/');
    is_AB('a->b; /**/');
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9jb21tZW50LmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwiaXQiLCJBdG9CIiwiaXNfQUIiLCJ0IiwiZGVlcEVxdWFsIiwicGFyc2UiLCJzdHIiLCJfaXQiXSwibWFwcGluZ3MiOiI7O0FBR0E7O0FBRUEsSUFBTUEsT0FBT0MsUUFBUSw0QkFBUixDQUFiO0FBSkE7O0FBVUEsdUJBQVMsK0JBQVQsRUFBMEMsZ0JBQU1DLEVBQU4sRUFBWTs7QUFFcEQsTUFBTUMsT0FBUSxDQUFDLEVBQUMsT0FBTyxZQUFSLEVBQXNCLFFBQVEsR0FBOUIsRUFBbUMsTUFBTSxFQUFDLFFBQVEsSUFBVCxFQUFjLE1BQU0sR0FBcEIsRUFBekMsRUFBRCxDQUFkO0FBQUEsTUFDTUMsUUFBUSxTQUFSQSxLQUFRO0FBQUEsV0FBT0Ysa0JBQVM7QUFBQSxhQUFLRyxFQUFFQyxTQUFGLENBQVlILElBQVosRUFBa0JILEtBQUtPLEtBQUwsQ0FBV0MsR0FBWCxDQUFsQixDQUFMO0FBQUEsS0FBVCxDQUFQO0FBQUEsR0FEZDs7QUFHQSx5QkFBUyxxQ0FBVCxFQUFnRCxnQkFBTUMsR0FBTixFQUFhO0FBQzNETCxVQUFNLFdBQU47QUFDQUEsVUFBTSxZQUFOO0FBQ0FBLFVBQU0sWUFBTjtBQUNBQSxVQUFNLGFBQU47QUFDQUEsVUFBTSxhQUFOO0FBQ0FBLFVBQU0sYUFBTjtBQUNBQSxVQUFNLGVBQU47QUFDRCxHQVJEOztBQVVBLHlCQUFTLHNDQUFULEVBQWlELGdCQUFNSyxHQUFOLEVBQWE7QUFDNURMLFVBQU0sV0FBTjtBQUNBQSxVQUFNLFlBQU47QUFDQUEsVUFBTSxZQUFOO0FBQ0FBLFVBQU0sYUFBTjtBQUNBQSxVQUFNLGFBQU47QUFDQUEsVUFBTSxhQUFOO0FBQ0FBLFVBQU0sZUFBTjtBQUNELEdBUkQ7O0FBVUEseUJBQVMseUNBQVQsRUFBb0QsZ0JBQU1LLEdBQU4sRUFBYTtBQUMvREwsVUFBTSxrQkFBTjtBQUNBQSxVQUFNLG1CQUFOO0FBQ0FBLFVBQU0sbUJBQU47QUFDQUEsVUFBTSxvQkFBTjtBQUNBQSxVQUFNLHFCQUFOO0FBQ0FBLFVBQU0sb0JBQU47QUFDQUEsVUFBTSxzQkFBTjtBQUNELEdBUkQ7O0FBVUEseUJBQVMsNkJBQVQsRUFBd0MsZ0JBQU1LLEdBQU4sRUFBYTtBQUNuREwsVUFBTSxXQUFOO0FBQ0FBLFVBQU0sWUFBTjtBQUNELEdBSEQ7O0FBS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLHlCQUFTLHFDQUFULEVBQWdELGdCQUFNSyxHQUFOLEVBQWE7QUFDM0RMLFVBQU0sV0FBTjtBQUNBQSxVQUFNLFlBQU47QUFDRCxHQUhEO0FBS0QsQ0FwREQiLCJmaWxlIjoiY29tbWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuXG5pbXBvcnQge3Rlc3QsIGRlc2NyaWJlfSBmcm9tICdhdmEtc3BlYyc7XG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpO1xuXG5cblxuXG5cbmRlc2NyaWJlKCd2YXJpb3VzIGNvbW1lbnRpbmcgc3RyYXRlZ2llcycsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBBdG9CICA9IFt7XCJrZXlcIjogXCJ0cmFuc2l0aW9uXCIsIFwiZnJvbVwiOiBcImFcIiwgXCJzZVwiOiB7XCJraW5kXCI6IFwiLT5cIixcInRvXCI6IFwiYlwifX1dLFxuICAgICAgICBpc19BQiA9IHN0ciA9PiBpdCh0ZXN0LCB0ID0+IHQuZGVlcEVxdWFsKEF0b0IsIGpzc20ucGFyc2Uoc3RyKSkpO1xuXG4gIGRlc2NyaWJlKCdlbXB0eSBibG9jayBjb21tZW50cyBpbiBsZWZ0IG1pZGRsZScsIGFzeW5jIF9pdCA9PiB7XG4gICAgaXNfQUIoJ2EvKiovLT5iOycpO1xuICAgIGlzX0FCKCdhIC8qKi8tPmI7Jyk7XG4gICAgaXNfQUIoJ2EvKiovIC0+YjsnKTtcbiAgICBpc19BQignYSAvKiovIC0+YjsnKTtcbiAgICBpc19BQignYVxcbi8qKi8tPmI7Jyk7XG4gICAgaXNfQUIoJ2EvKiovXFxuLT5iOycpO1xuICAgIGlzX0FCKCdhXFxuLyoqL1xcbi0+YjsnKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2VtcHR5IGJsb2NrIGNvbW1lbnRzIGluIHJpZ2h0IG1pZGRsZScsIGFzeW5jIF9pdCA9PiB7XG4gICAgaXNfQUIoJ2EtPi8qKi9iOycpO1xuICAgIGlzX0FCKCdhLT4gLyoqL2I7Jyk7XG4gICAgaXNfQUIoJ2EtPi8qKi8gYjsnKTtcbiAgICBpc19BQignYS0+IC8qKi8gYjsnKTtcbiAgICBpc19BQignYS0+XFxuLyoqL2I7Jyk7XG4gICAgaXNfQUIoJ2EtPi8qKi9cXG5iOycpO1xuICAgIGlzX0FCKCdhLT5cXG4vKiovXFxuYjsnKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ25vbi1lbXB0eSBibG9jayBjb21tZW50cyBpbiBsZWZ0IG1pZGRsZScsIGFzeW5jIF9pdCA9PiB7XG4gICAgaXNfQUIoJ2EvKiBoZWxsbyAqLy0+YjsnKTtcbiAgICBpc19BQignYSAvKiBoZWxsbyAqLy0+YjsnKTtcbiAgICBpc19BQignYS8qIGhlbGxvICovIC0+YjsnKTtcbiAgICBpc19BQignYSAvKiBoZWxsbyAqLyAtPmI7Jyk7XG4gICAgaXNfQUIoJ2FcXG4vKiBoZWxsbyAqLyAtPmI7Jyk7XG4gICAgaXNfQUIoJ2EvKiBoZWxsbyAqL1xcbi0+YjsnKTtcbiAgICBpc19BQignYVxcbi8qIGhlbGxvICovXFxuLT5iOycpO1xuICB9KTtcblxuICBkZXNjcmliZSgnZW1wdHkgYmxvY2sgY29tbWVudHMgYmVmb3JlJywgYXN5bmMgX2l0ID0+IHtcbiAgICBpc19BQignLyoqL2EtPmI7Jyk7XG4gICAgaXNfQUIoJy8qKi8gYS0+YjsnKTtcbiAgfSk7XG5cbiAgLy8gZGVzY3JpYmUoJ2VtcHR5IGJsb2NrIGNvbW1lbnRzIGluYmV0d2VlbicsIGFzeW5jIF9pdCA9PiB7XG4gIC8vICAgaXNfQUIoJ2EtPmI7LyoqL2MtPmQ7Jyk7XG4gIC8vICAgaXNfQUIoJ2EtPmI7IC8qKi9jLT5kOycpO1xuICAvLyAgIGlzX0FCKCdhLT5iOy8qKi8gYy0+ZDsnKTtcbiAgLy8gICBpc19BQignYS0+YjsgLyoqLyBjLT5kOycpO1xuICAvLyB9KTtcblxuICBkZXNjcmliZSgnZW1wdHkgYmxvY2sgY29tbWVudHMgYWZ0ZXIgLyBhdCBlbmQnLCBhc3luYyBfaXQgPT4ge1xuICAgIGlzX0FCKCdhLT5iOy8qKi8nKTtcbiAgICBpc19BQignYS0+YjsgLyoqLycpO1xuICB9KTtcblxufSk7XG4iXX0=