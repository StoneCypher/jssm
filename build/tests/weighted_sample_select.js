'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js');

(0, _avaSpec.describe)('weighted_sample_select/2', async function (it) {

      var fruit = [{ label: 'apple', probability: 0.1 }, { label: 'orange', probability: 0.4 }, { label: 'banana', probability: 0.5 }];

      var none = jssm.weighted_sample_select(0, fruit),
          one = jssm.weighted_sample_select(1, fruit),
          some = jssm.weighted_sample_select(2, fruit),
          over = jssm.weighted_sample_select(4, fruit);

      it('0 returns []', function (t) {
            return t.deepEqual(0, none.length);
      });
      it('1 returns [any]', function (t) {
            return t.deepEqual(1, one.length);
      });
      it('2 returns [any,any]', function (t) {
            return t.deepEqual(2, some.length);
      });
      it('4 returns [any,any,any,any]', function (t) {
            return t.deepEqual(4, over.length);
      });
});

// stochable
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy93ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwiaXQiLCJmcnVpdCIsImxhYmVsIiwicHJvYmFiaWxpdHkiLCJub25lIiwid2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCIsIm9uZSIsInNvbWUiLCJvdmVyIiwidCIsImRlZXBFcXVhbCIsImxlbmd0aCJdLCJtYXBwaW5ncyI6Ijs7QUFDQTs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7O0FBTUEsdUJBQVMsMEJBQVQsRUFBcUMsZ0JBQU1DLEVBQU4sRUFBWTs7QUFFL0MsVUFBTUMsUUFBUSxDQUFFLEVBQUVDLE9BQU8sT0FBVCxFQUFtQkMsYUFBYSxHQUFoQyxFQUFGLEVBQ0UsRUFBRUQsT0FBTyxRQUFULEVBQW1CQyxhQUFhLEdBQWhDLEVBREYsRUFFRSxFQUFFRCxPQUFPLFFBQVQsRUFBbUJDLGFBQWEsR0FBaEMsRUFGRixDQUFkOztBQUlBLFVBQU1DLE9BQU9OLEtBQUtPLHNCQUFMLENBQTRCLENBQTVCLEVBQStCSixLQUEvQixDQUFiO0FBQUEsVUFDTUssTUFBT1IsS0FBS08sc0JBQUwsQ0FBNEIsQ0FBNUIsRUFBK0JKLEtBQS9CLENBRGI7QUFBQSxVQUVNTSxPQUFPVCxLQUFLTyxzQkFBTCxDQUE0QixDQUE1QixFQUErQkosS0FBL0IsQ0FGYjtBQUFBLFVBR01PLE9BQU9WLEtBQUtPLHNCQUFMLENBQTRCLENBQTVCLEVBQStCSixLQUEvQixDQUhiOztBQUtBRCxTQUFHLGNBQUgsRUFBa0M7QUFBQSxtQkFBS1MsRUFBRUMsU0FBRixDQUFZLENBQVosRUFBZU4sS0FBS08sTUFBcEIsQ0FBTDtBQUFBLE9BQWxDO0FBQ0FYLFNBQUcsaUJBQUgsRUFBa0M7QUFBQSxtQkFBS1MsRUFBRUMsU0FBRixDQUFZLENBQVosRUFBZUosSUFBSUssTUFBbkIsQ0FBTDtBQUFBLE9BQWxDO0FBQ0FYLFNBQUcscUJBQUgsRUFBa0M7QUFBQSxtQkFBS1MsRUFBRUMsU0FBRixDQUFZLENBQVosRUFBZUgsS0FBS0ksTUFBcEIsQ0FBTDtBQUFBLE9BQWxDO0FBQ0FYLFNBQUcsNkJBQUgsRUFBa0M7QUFBQSxtQkFBS1MsRUFBRUMsU0FBRixDQUFZLENBQVosRUFBZUYsS0FBS0csTUFBcEIsQ0FBTDtBQUFBLE9BQWxDO0FBRUQsQ0FoQkQ7O0FBa0JBIiwiZmlsZSI6IndlaWdodGVkX3NhbXBsZV9zZWxlY3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7ZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QganNzbSA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ3dlaWdodGVkX3NhbXBsZV9zZWxlY3QvMicsIGFzeW5jIGl0ID0+IHtcblxuICBjb25zdCBmcnVpdCA9IFsgeyBsYWJlbDogJ2FwcGxlJywgIHByb2JhYmlsaXR5OiAwLjEgfSxcbiAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdvcmFuZ2UnLCBwcm9iYWJpbGl0eTogMC40IH0sXG4gICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnYmFuYW5hJywgcHJvYmFiaWxpdHk6IDAuNSB9IF07XG5cbiAgY29uc3Qgbm9uZSA9IGpzc20ud2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCgwLCBmcnVpdCksXG4gICAgICAgIG9uZSAgPSBqc3NtLndlaWdodGVkX3NhbXBsZV9zZWxlY3QoMSwgZnJ1aXQpLFxuICAgICAgICBzb21lID0ganNzbS53ZWlnaHRlZF9zYW1wbGVfc2VsZWN0KDIsIGZydWl0KSxcbiAgICAgICAgb3ZlciA9IGpzc20ud2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCg0LCBmcnVpdCk7XG5cbiAgaXQoJzAgcmV0dXJucyBbXScsICAgICAgICAgICAgICAgIHQgPT4gdC5kZWVwRXF1YWwoMCwgbm9uZS5sZW5ndGgpKTtcbiAgaXQoJzEgcmV0dXJucyBbYW55XScsICAgICAgICAgICAgIHQgPT4gdC5kZWVwRXF1YWwoMSwgb25lLmxlbmd0aCkgKTtcbiAgaXQoJzIgcmV0dXJucyBbYW55LGFueV0nLCAgICAgICAgIHQgPT4gdC5kZWVwRXF1YWwoMiwgc29tZS5sZW5ndGgpKTtcbiAgaXQoJzQgcmV0dXJucyBbYW55LGFueSxhbnksYW55XScsIHQgPT4gdC5kZWVwRXF1YWwoNCwgb3Zlci5sZW5ndGgpKTtcblxufSk7XG5cbi8vIHN0b2NoYWJsZVxuIl19