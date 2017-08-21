'use strict';

var _templateObject = _taggedTemplateLiteral(['\n      a 0.5% -> [b d e];\n      b 0.5% -> [a d e];\n      c 0.5% -> [a b d e];\n      d 0.5% -> [a b e];\n      [a b d] <- 0.5% e;\n      [a b d e] 4% -> c;\n    '], ['\n      a 0.5% -> [b d e];\n      b 0.5% -> [a d e];\n      c 0.5% -> [a b d e];\n      d 0.5% -> [a b e];\n      [a b d] <- 0.5% e;\n      [a b d e] 4% -> c;\n    ']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

(0, _avaSpec.describe)('weighted_sample_select/1', async function (it) {

  // wow is this hard to meaningfully test
  it('(0) generates []', function (t) {
    return t.deepEqual([], jssm.weighted_sample_select(0, [{ item: 'a', probability: 2 }, { item: 'a', probability: 3 }]));
  });

  (0, _avaSpec.describe)('has reasonable unweighted distribution', async function (uit) {

    var unweighted = new jssm.Machine({

      initial_state: 'a',

      transitions: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'a' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }, { from: 'c', to: 'b' }]

    });

    var res = unweighted.probabilistic_histo_walk(1500);

    // statistically each should be around 500.  raise alarms if they aren't 300.
    uit('a expects 500 requires 300', function (t) {
      return t.is(true, res.get('a') >= 300);
    });
    uit('b expects 500 requires 300', function (t) {
      return t.is(true, res.get('b') >= 300);
    });
    uit('c expects 500 requires 300', function (t) {
      return t.is(true, res.get('c') >= 300);
    });
  });

  (0, _avaSpec.describe)('has reasonable weighted distribution', async function (uit) {

    var weighted = new jssm.Machine({

      initial_state: 'a',

      transitions: [{ from: 'a', to: 'b', probability: 0.5 }, { from: 'a', to: 'c', probability: 4 }, { from: 'a', to: 'd', probability: 0.5 }, { from: 'a', to: 'e', probability: 0.5 }, { from: 'b', to: 'a', probability: 0.5 }, { from: 'b', to: 'c', probability: 4 }, { from: 'b', to: 'd', probability: 0.5 }, { from: 'b', to: 'e', probability: 0.5 }, { from: 'c', to: 'a', probability: 0.5 }, { from: 'c', to: 'b', probability: 0.5 }, { from: 'c', to: 'd', probability: 0.5 }, { from: 'c', to: 'e', probability: 0.5 }, { from: 'd', to: 'a', probability: 0.5 }, { from: 'd', to: 'b', probability: 0.5 }, { from: 'd', to: 'c', probability: 4 }, { from: 'd', to: 'e', probability: 0.5 }, { from: 'e', to: 'a', probability: 0.5 }, { from: 'e', to: 'b', probability: 0.5 }, { from: 'e', to: 'c', probability: 4 }, { from: 'e', to: 'd', probability: 0.5 }]

    });

    var res = weighted.probabilistic_histo_walk(2500);

    // statistically each should be around 375, or 1050 for c.  raise alarms if they aren't 250, or 800 for c.
    uit('a expects 375 requires 250', function (t) {
      return t.is(true, res.get('a') >= 250);
    });
    uit('b expects 375 requires 250', function (t) {
      return t.is(true, res.get('b') >= 250);
    });
    uit('c expects 1050 requires 800', function (t) {
      return t.is(true, res.get('c') >= 800);
    });
    uit('d expects 375 requires 250', function (t) {
      return t.is(true, res.get('c') >= 250);
    });
    uit('e expects 375 requires 250', function (t) {
      return t.is(true, res.get('c') >= 250);
    });
  });

  (0, _avaSpec.describe)('has reasonable weighted distribution in DSL', async function (uit) {

    var weighted = sm(_templateObject);

    var res = weighted.probabilistic_histo_walk(2500);

    // statistically each should be around 375, or 1050 for c.  raise alarms if they aren't 250, or 800 for c.
    uit('a expects 375 requires 250', function (t) {
      return t.is(true, res.get('a') >= 250);
    });
    uit('b expects 375 requires 250', function (t) {
      return t.is(true, res.get('b') >= 250);
    });
    uit('c expects 1050 requires 800', function (t) {
      return t.is(true, res.get('c') >= 800);
    });
    uit('d expects 375 requires 250', function (t) {
      return t.is(true, res.get('c') >= 250);
    });
    uit('e expects 375 requires 250', function (t) {
      return t.is(true, res.get('c') >= 250);
    });
  });

  // stochastics would help, eg "every returned item is a member" and "in a
  // sufficient list any positive sample size is reasonable" and "always
  // returns the right sample size" - whargarbl todo

});

// stochable
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9zYW1wbGVfc2VsZWN0LmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwic20iLCJpdCIsInQiLCJkZWVwRXF1YWwiLCJ3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0IiwiaXRlbSIsInByb2JhYmlsaXR5IiwidWl0IiwidW53ZWlnaHRlZCIsIk1hY2hpbmUiLCJpbml0aWFsX3N0YXRlIiwidHJhbnNpdGlvbnMiLCJmcm9tIiwidG8iLCJyZXMiLCJwcm9iYWJpbGlzdGljX2hpc3RvX3dhbGsiLCJpcyIsImdldCIsIndlaWdodGVkIl0sIm1hcHBpbmdzIjoiOzs7O0FBQ0E7Ozs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFBQSxJQUNNQyxLQUFPRixLQUFLRSxFQURsQjs7QUFPQSx1QkFBUywwQkFBVCxFQUFxQyxnQkFBTUMsRUFBTixFQUFZOztBQUUvQztBQUNBQSxLQUFHLGtCQUFILEVBQXVCO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUMxQixFQUQwQixFQUUxQkwsS0FBS00sc0JBQUwsQ0FBNEIsQ0FBNUIsRUFBK0IsQ0FBQyxFQUFDQyxNQUFLLEdBQU4sRUFBVUMsYUFBWSxDQUF0QixFQUFELEVBQTBCLEVBQUNELE1BQUssR0FBTixFQUFVQyxhQUFZLENBQXRCLEVBQTFCLENBQS9CLENBRjBCLENBQUw7QUFBQSxHQUF2Qjs7QUFPQSx5QkFBUyx3Q0FBVCxFQUFtRCxnQkFBTUMsR0FBTixFQUFhOztBQUU5RCxRQUFNQyxhQUFhLElBQUlWLEtBQUtXLE9BQVQsQ0FBaUI7O0FBRWxDQyxxQkFBZSxHQUZtQjs7QUFJbENDLG1CQUFhLENBRVgsRUFBRUMsTUFBTSxHQUFSLEVBQWFDLElBQUksR0FBakIsRUFGVyxFQUdYLEVBQUVELE1BQU0sR0FBUixFQUFhQyxJQUFJLEdBQWpCLEVBSFcsRUFLWCxFQUFFRCxNQUFNLEdBQVIsRUFBYUMsSUFBSSxHQUFqQixFQUxXLEVBTVgsRUFBRUQsTUFBTSxHQUFSLEVB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LEdBQUosQ0FBUSxHQUFSLEtBQWdCLEdBQTNCLENBQUw7QUFBQSxLQUFuQztBQUNBVixRQUFJLDRCQUFKLEVBQW1DO0FBQUEsYUFBS0wsRUFBRWMsRUFBRixDQUFLLElBQUwsRUFBV0YsSUFBSUcsR0FBSixDQUFRLEdBQVIsS0FBZ0IsR0FBM0IsQ0FBTDtBQUFBLEtBQW5DO0FBQ0FWLFFBQUksNkJBQUosRUFBbUM7QUFBQSxhQUFLTCxFQUFFYyxFQUFGLENBQUssSUFBTCxFQUFXRixJQUFJRyxHQUFKLENBQVEsR0FBUixLQUFnQixHQUEzQixDQUFMO0FBQUEsS0FBbkM7QUFDQVYsUUFBSSw0QkFBSixFQUFtQztBQUFBLGFBQUtMLEVBQUVjLEVBQUYsQ0FBSyxJQUFMLEVBQVdGLElBQUlHLEdBQUosQ0FBUSxHQUFSLEtBQWdCLEdBQTNCLENBQUw7QUFBQSxLQUFuQztBQUNBVixRQUFJLDRCQUFKLEVBQW1DO0FBQUEsYUFBS0wsRUFBRWMsRUFBRixDQUFLLElBQUwsRUFBV0YsSUFBSUcsR0FBSixDQUFRLEdBQVIsS0FBZ0IsR0FBM0IsQ0FBTDtBQUFBLEtBQW5DO0FBRUQsR0FwQkQ7O0FBc0JBO0FBQ0E7QUFDQTs7QUFHRCxDQXpIRDs7QUErSEEiLCJmaWxlIjoic2FtcGxlX3NlbGVjdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKSxcbiAgICAgIHNtICAgPSBqc3NtLnNtO1xuXG5cblxuXG5cbmRlc2NyaWJlKCd3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0LzEnLCBhc3luYyBpdCA9PiB7XG5cbiAgLy8gd293IGlzIHRoaXMgaGFyZCB0byBtZWFuaW5nZnVsbHkgdGVzdFxuICBpdCgnKDApIGdlbmVyYXRlcyBbXScsIHQgPT4gdC5kZWVwRXF1YWwoXG4gICAgW10sXG4gICAganNzbS53ZWlnaHRlZF9zYW1wbGVfc2VsZWN0KDAsIFt7aXRlbTonYScscHJvYmFiaWxpdHk6Mn0se2l0ZW06J2EnLHByb2JhYmlsaXR5OjN9XSkgKVxuICApO1xuXG5cblxuICBkZXNjcmliZSgnaGFzIHJlYXNvbmFibGUgdW53ZWlnaHRlZCBkaXN0cmlidXRpb24nLCBhc3luYyB1aXQgPT4ge1xuXG4gICAgY29uc3QgdW53ZWlnaHRlZCA9IG5ldyBqc3NtLk1hY2hpbmUoe1xuXG4gICAgICBpbml0aWFsX3N0YXRlOiAnYScsXG5cbiAgICAgIHRyYW5zaXRpb25zOiBbXG5cbiAgICAgICAgeyBmcm9tOiAnYScsIHRvOiAnYicgfSxcbiAgICAgICAgeyBmcm9tOiAnYScsIHRvOiAnYycgfSxcblxuICAgICAgICB7IGZyb206ICdiJywgdG86ICdhJyB9LFxuICAgICAgICB7IGZyb206ICdiJywgdG86ICdjJyB9LFxuXG4gICAgICAgIHsgZnJvbTogJ2MnLCB0bzogJ2EnIH0sXG4gICAgICAgIHsgZnJvbTogJ2MnLCB0bzogJ2InIH1cblxuICAgICAgXVxuXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXMgPSB1bndlaWdodGVkLnByb2JhYmlsaXN0aWNfaGlzdG9fd2FsaygxNTAwKTtcblxuICAgIC8vIHN0YXRpc3RpY2FsbHkgZWFjaCBzaG91bGQgYmUgYXJvdW5kIDUwMC4gIHJhaXNlIGFsYXJtcyBpZiB0aGV5IGFyZW4ndCAzMDAuXG4gICAgdWl0KCdhIGV4cGVjdHMgNTAwIHJlcXVpcmVzIDMwMCcsIHQgPT4gdC5pcyh0cnVlLCByZXMuZ2V0KCdhJykgPj0gMzAwKSk7XG4gICAgdWl0KCdiIGV4cGVjdHMgNTAwIHJlcXVpcmVzIDMwMCcsIHQgPT4gdC5pcyh0cnVlLCByZXMuZ2V0KCdiJykgPj0gMzAwKSk7XG4gICAgdWl0KCdjIGV4cGVjdHMgNTAwIHJlcXVpcmVzIDMwMCcsIHQgPT4gdC5pcyh0cnVlLCByZXMuZ2V0KCdjJykgPj0gMzAwKSk7XG5cbiAgfSk7XG5cblxuXG4gIGRlc2NyaWJlKCdoYXMgcmVhc29uYWJsZSB3ZWlnaHRlZCBkaXN0cmlidXRpb24nLCBhc3luYyB1aXQgPT4ge1xuXG4gICAgY29uc3Qgd2VpZ2h0ZWQgPSBuZXcganNzbS5NYWNoaW5lKHtcblxuICAgICAgaW5pdGlhbF9zdGF0ZTogJ2EnLFxuXG4gICAgICB0cmFuc2l0aW9uczogW1xuXG4gICAgICAgIHsgZnJvbTogJ2EnLCB0bzogJ2InLCBwcm9iYWJpbGl0eTogMC41IH0sXG4gICAgICAgIHsgZnJvbTogJ2EnLCB0bzogJ2MnLCBwcm9iYWJpbGl0eTogNCB9LFxuICAgICAgICB7IGZyb206ICdhJywgdG86ICdkJywgcHJvYmFiaWxpdHk6IDAuNSB9LFxuICAgICAgICB7IGZyb206ICdhJywgdG86ICdlJywgcHJvYmFiaWxpdHk6IDAuNSB9LFxuXG4gICAgICAgIHsgZnJvbTogJ2InLCB0bzogJ2EnLCBwcm9iYWJpbGl0eTogMC41IH0sXG4gICAgICAgIHsgZnJvbTogJ2InLCB0bzogJ2MnLCBwcm9iYWJpbGl0eTogNCB9LFxuICAgICAgICB7IGZyb206ICdiJywgdG86ICdkJywgcHJvYmFiaWxpdHk6IDAuNSB9LFxuICAgICAgICB7IGZyb206ICdiJywgdG86ICdlJywgcHJvYmFiaWxpdHk6IDAuNSB9LFxuXG4gICAgICAgIHsgZnJvbTogJ2MnLCB0bzogJ2EnLCBwcm9iYWJpbGl0eTogMC41IH0sXG4gICAgICAgIHsgZnJvbTogJ2MnLCB0bzogJ2InLCBwcm9iYWJpbGl0eTogMC41IH0sXG4gICAgICAgIHsgZnJvbTogJ2MnLCB0bzogJ2QnLCBwcm9iYWJpbGl0eTogMC41IH0sXG4gICAgICAgIHsgZnJvbTogJ2MnLCB0bzogJ2UnLCBwcm9iYWJpbGl0eTogMC41IH0sXG5cbiAgICAgICAgeyBmcm9tOiAnZCcsIHRvOiAnYScsIHByb2JhYmlsaXR5OiAwLjUgfSxcbiAgICAgICAgeyBmcm9tOiAnZCcsIHRvOiAnYicsIHByb2JhYmlsaXR5OiAwLjUgfSxcbiAgICAgICAgeyBmcm9tOiAnZCcsIHRvOiAnYycsIHByb2JhYmlsaXR5OiA0IH0sXG4gICAgICAgIHsgZnJvbTogJ2QnLCB0bzogJ2UnLCBwcm9iYWJpbGl0eTogMC41IH0sXG5cbiAgICAgICAgeyBmcm9tOiAnZScsIHRvOiAnYScsIHByb2JhYmlsaXR5OiAwLjUgfSxcbiAgICAgICAgeyBmcm9tOiAnZScsIHRvOiAnYicsIHByb2JhYmlsaXR5OiAwLjUgfSxcbiAgICAgICAgeyBmcm9tOiAnZScsIHRvOiAnYycsIHByb2JhYmlsaXR5OiA0IH0sXG4gICAgICAgIHsgZnJvbTogJ2UnLCB0bzogJ2QnLCBwcm9iYWJpbGl0eTogMC41IH1cblxuICAgICAgXVxuXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXMgPSB3ZWlnaHRlZC5wcm9iYWJpbGlzdGljX2hpc3RvX3dhbGsoMjUwMCk7XG5cbiAgICAvLyBzdGF0aXN0aWNhbGx5IGVhY2ggc2hvdWxkIGJlIGFyb3VuZCAzNzUsIG9yIDEwNTAgZm9yIGMuICByYWlzZSBhbGFybXMgaWYgdGhleSBhcmVuJ3QgMjUwLCBvciA4MDAgZm9yIGMuXG4gICAgdWl0KCdhIGV4cGVjdHMgMzc1IHJlcXVpcmVzIDI1MCcsICB0ID0+IHQuaXModHJ1ZSwgcmVzLmdldCgnYScpID49IDI1MCkpO1xuICAgIHVpdCgnYiBleHBlY3RzIDM3NSByZXF1aXJlcyAyNTAnLCAgdCA9PiB0LmlzKHRydWUsIHJlcy5nZXQoJ2InKSA+PSAyNTApKTtcbiAgICB1aXQoJ2MgZXhwZWN0cyAxMDUwIHJlcXVpcmVzIDgwMCcsIHQgPT4gdC5pcyh0cnVlLCByZXMuZ2V0KCdjJykgPj0gODAwKSk7XG4gICAgdWl0KCdkIGV4cGVjdHMgMzc1IHJlcXVpcmVzIDI1MCcsICB0ID0+IHQuaXModHJ1ZSwgcmVzLmdldCgnYycpID49IDI1MCkpO1xuICAgIHVpdCgnZSBleHBlY3RzIDM3NSByZXF1aXJlcyAyNTAnLCAgdCA9PiB0LmlzKHRydWUsIHJlcy5nZXQoJ2MnKSA+PSAyNTApKTtcblxuICB9KTtcblxuXG5cblxuXG4gIGRlc2NyaWJlKCdoYXMgcmVhc29uYWJsZSB3ZWlnaHRlZCBkaXN0cmlidXRpb24gaW4gRFNMJywgYXN5bmMgdWl0ID0+IHtcblxuICAgIGNvbnN0IHdlaWdodGVkID0gc21gXG4gICAgICBhIDAuNSUgLT4gW2IgZCBlXTtcbiAgICAgIGIgMC41JSAtPiBbYSBkIGVdO1xuICAgICAgYyAwLjUlIC0+IFthIGIgZCBlXTtcbiAgICAgIGQgMC41JSAtPiBbYSBiIGVdO1xuICAgICAgW2EgYiBkXSA8LSAwLjUlIGU7XG4gICAgICBbYSBiIGQgZV0gNCUgLT4gYztcbiAgICBgO1xuXG4gICAgY29uc3QgcmVzID0gd2VpZ2h0ZWQucHJvYmFiaWxpc3RpY19oaXN0b193YWxrKDI1MDApO1xuXG4gICAgLy8gc3RhdGlzdGljYWxseSBlYWNoIHNob3VsZCBiZSBhcm91bmQgMzc1LCBvciAxMDUwIGZvciBjLiAgcmFpc2UgYWxhcm1zIGlmIHRoZXkgYXJlbid0IDI1MCwgb3IgODAwIGZvciBjLlxuICAgIHVpdCgnYSBleHBlY3RzIDM3NSByZXF1aXJlcyAyNTAnLCAgdCA9PiB0LmlzKHRydWUsIHJlcy5nZXQoJ2EnKSA+PSAyNTApKTtcbiAgICB1aXQoJ2IgZXhwZWN0cyAzNzUgcmVxdWlyZXMgMjUwJywgIHQgPT4gdC5pcyh0cnVlLCByZXMuZ2V0KCdiJykgPj0gMjUwKSk7XG4gICAgdWl0KCdjIGV4cGVjdHMgMTA1MCByZXF1aXJlcyA4MDAnLCB0ID0+IHQuaXModHJ1ZSwgcmVzLmdldCgnYycpID49IDgwMCkpO1xuICAgIHVpdCgnZCBleHBlY3RzIDM3NSByZXF1aXJlcyAyNTAnLCAgdCA9PiB0LmlzKHRydWUsIHJlcy5nZXQoJ2MnKSA+PSAyNTApKTtcbiAgICB1aXQoJ2UgZXhwZWN0cyAzNzUgcmVxdWlyZXMgMjUwJywgIHQgPT4gdC5pcyh0cnVlLCByZXMuZ2V0KCdjJykgPj0gMjUwKSk7XG5cbiAgfSk7XG5cbiAgLy8gc3RvY2hhc3RpY3Mgd291bGQgaGVscCwgZWcgXCJldmVyeSByZXR1cm5lZCBpdGVtIGlzIGEgbWVtYmVyXCIgYW5kIFwiaW4gYVxuICAvLyBzdWZmaWNpZW50IGxpc3QgYW55IHBvc2l0aXZlIHNhbXBsZSBzaXplIGlzIHJlYXNvbmFibGVcIiBhbmQgXCJhbHdheXNcbiAgLy8gcmV0dXJucyB0aGUgcmlnaHQgc2FtcGxlIHNpemVcIiAtIHdoYXJnYXJibCB0b2RvXG5cblxufSk7XG5cblxuXG5cblxuLy8gc3RvY2hhYmxlXG4iXX0=