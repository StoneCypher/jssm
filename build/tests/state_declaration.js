'use strict';

var _templateObject = _taggedTemplateLiteral(['c: {}; a -> b;'], ['c: {}; a -> b;']),
    _templateObject2 = _taggedTemplateLiteral(['c: { }; a -> b;'], ['c: { }; a -> b;']),
    _templateObject3 = _taggedTemplateLiteral(['c: { node_color: red; }; a -> b;'], ['c: { node_color: red; }; a -> b;']),
    _templateObject4 = _taggedTemplateLiteral(['c: { };                                              a -> b;'], ['c: { };                                              a -> b;']),
    _templateObject5 = _taggedTemplateLiteral(['c: { node_color: red; };                             a -> b;'], ['c: { node_color: red; };                             a -> b;']),
    _templateObject6 = _taggedTemplateLiteral(['c: { node_color: red; node_shape: circle; };         a -> b;'], ['c: { node_color: red; node_shape: circle; };         a -> b;']),
    _templateObject7 = _taggedTemplateLiteral(['c: { node_color: red; }; c: { node_color: red; }; a -> b;'], ['c: { node_color: red; }; c: { node_color: red; }; a -> b;']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }
/* eslint-disable max-len */

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

(0, _avaSpec.describe)("doesn't throw", async function (it) {

  it('with no attributes', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject);
    });
  });
  it('with just whitespace', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject2);
    });
  });
  it('with just node color', function (t) {
    return t.notThrows(function () {
      var _foo = sm(_templateObject3);
    });
  });
});

(0, _avaSpec.describe)('can read declaration', async function (_it) {

  var mach0 = sm(_templateObject4);
  var mach1 = sm(_templateObject5);
  var mach2 = sm(_templateObject6);
  //  const machT = sm`c: { node_color: red; }; d: { node_shape: circle; }; a -> b;`;

  // const machP = sm`
  //   c: { node_shape: circle; node_color: red; };
  //   d: { node_shape: circle; node_color: red; };
  //   a -> b;
  // `;

  (0, _avaSpec.describe)('of w/ nothing', async function (_it2) {
    var decls = mach0.state_declarations();
    (0, _avaSpec.describe)('through .state_declarations/0', async function (it) {
      it('yielding map', function (t) {
        return t.is(true, decls instanceof Map);
      });
      it('list having size 1', function (t) {
        return t.is(1, decls.size);
      });
      it('props having length 0', function (t) {
        return t.is(0, decls.get('c').declarations.length);
      });
    });
  });

  (0, _avaSpec.describe)('of just w/ node_color', async function (_it1) {
    var decls = mach1.state_declarations();
    (0, _avaSpec.describe)('through .state_declarations/0', async function (it2) {
      it2('yielding map', function (t) {
        return t.is(true, decls instanceof Map);
      });
      it2('list having size 1', function (t) {
        return t.is(1, decls.size);
      });
      it2('props having length 1', function (t) {
        return t.is(1, decls.get('c').declarations.length);
      });
      // todo whargarbl check the actual members comeback
    });

    //  it('through .state_declaration/1',  t => t.is('left', mach1.state_declaration('c') ) );
  });

  (0, _avaSpec.describe)('of w/ node_color, node_shape', async function (it) {
    it('through .state_declaration/1', function (t) {
      return t.is('#ff0000ff', mach2.state_declaration('c').declarations[0].value);
    });
    it('through .state_declaration/1', function (t) {
      return t.is('circle', mach2.state_declaration('c').declarations[1].value);
    });
    it('through .state_declarations/0', function (t) {
      return t.is(1, mach2.state_declarations().size);
    });
    it('through .state_declarations/0', function (t) {
      return t.is(2, mach2.state_declarations().get('c').declarations.length);
    });
  });
  /*
    describe('of w/ node_color on c, node_shape on d', async it => {
      it('through .state_declaration/1',  t => t.is('left', machT.state_declaration('c') ) );
      it('through .state_declaration/1',  t => t.is('left', machT.state_declaration('d') ) );
      it('through .state_declarations/0', t => t.is('left', machT.state_declarations() ) );
    });
  
    describe('of w/ node_color, node_shape on each c and d', async it => {
      it('through .state_declaration/1',  t => t.is('left', machP.state_declaration('c') ) );
      it('through .state_declaration/1',  t => t.is('left', machP.state_declaration('d') ) );
      it('through .state_declarations/0', t => t.is('left', machP.state_declarations() ) );
    });
  */
});

(0, _avaSpec.describe)('error catchery', async function (_parse_it) {

  (0, _avaSpec.describe)('repeated declaration', async function (it) {
    it('throws', function (t) {
      return t.throws(function () {
        var _mach1 = sm(_templateObject7); // eslint-disable-line no-unused-vars
      });
    });
  });

  (0, _avaSpec.describe)('unknown state property', async function (it) {
    var prestate = {
      "start_states": ["b"],
      "transitions": [{ "from": "b", "to": "c", "kind": "legal", "forced_only": false, "main_path": false }],
      "state_declaration": [{ "state": "a", "declarations": [{ "key": "urgle bergle", "value": "circle" }] }] };

    it('throws', function (t) {
      return t.throws(function () {
        var _m0 = jssm.Machine(prestate);
      });
    });
  });

  (0, _avaSpec.describe)('transfer state properties throws on unknown key', async function (it) {
    it('throws', function (t) {
      return t.throws(function () {
        jssm.transfer_state_properties({ declarations: [{ key: 'agsrhdtjfy', value: 'seven' }] });
      });
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9zdGF0ZV9kZWNsYXJhdGlvbi5qcyJdLCJuYW1lcyI6WyJqc3NtIiwicmVxdWlyZSIsInNtIiwiaXQiLCJ0Iiwibm90VGhyb3dzIiwiX2ZvbyIsIl9pdCIsIm1hY2gwIiwibWFjaDEiLCJtYWNoMiIsIl9pdDIiLCJkZWNscyIsInN0YXRlX2RlY2xhcmF0aW9ucyIsImlzIiwiTWFwIiwic2l6ZSIsImdldCIsImRlY2xhcmF0aW9ucyIsImxlbmd0aCIsIl9pdDEiLCJpdDIiLCJzdGF0ZV9kZWNsYXJhdGlvbiIsInZhbHVlIiwiX3BhcnNlX2l0IiwidGhyb3dzIiwiX21hY2gxIiwicHJlc3RhdGUiLCJfbTAiLCJNYWNoaW5lIiwidHJhbnNmZXJfc3RhdGVfcHJvcGVydGllcyIsImtleSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUdBOzs7QUFGQTs7QUFJQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFBQSxJQUNNQyxLQUFPRixLQUFLRSxFQURsQjs7QUFPQSx1QkFBUyxlQUFULEVBQTBCLGdCQUFNQyxFQUFOLEVBQVk7O0FBRXBDQSxLQUFHLG9CQUFILEVBQTJCO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNQyxPQUFPSixFQUFQLGlCQUFOO0FBQWtDLEtBQXRELENBQUw7QUFBQSxHQUEzQjtBQUNBQyxLQUFHLHNCQUFILEVBQTJCO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNQyxPQUFPSixFQUFQLGtCQUFOO0FBQW1DLEtBQXZELENBQUw7QUFBQSxHQUEzQjtBQUNBQyxLQUFHLHNCQUFILEVBQTJCO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRSxVQUFNQyxPQUFPSixFQUFQLGtCQUFOO0FBQW9ELEtBQXhFLENBQUw7QUFBQSxHQUEzQjtBQUVELENBTkQ7O0FBWUEsdUJBQVMsc0JBQVQsRUFBaUMsZ0JBQU1LLEdBQU4sRUFBYTs7QUFF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LENBQUw7QUFBQSxLQUFiO0FBR0QsR0FKRDs7QUFNQSx5QkFBUyx3QkFBVCxFQUFtQyxnQkFBTUMsRUFBTixFQUFZO0FBQzdDLFFBQU13QixXQUFXO0FBQ2Ysc0JBQWUsQ0FBQyxHQUFELENBREE7QUFFZixxQkFBYyxDQUFDLEVBQUMsUUFBTyxHQUFSLEVBQVksTUFBSyxHQUFqQixFQUFxQixRQUFPLE9BQTVCLEVBQW9DLGVBQWMsS0FBbEQsRUFBd0QsYUFBWSxLQUFwRSxFQUFELENBRkM7QUFHZiwyQkFBb0IsQ0FBQyxFQUFDLFNBQVEsR0FBVCxFQUFhLGdCQUFlLENBQUMsRUFBQyxPQUFNLGNBQVAsRUFBc0IsU0FBUSxRQUE5QixFQUFELENBQTVCLEVBQUQsQ0FITCxFQUFqQjs7QUFLQXhCLE9BQUcsUUFBSCxFQUFhO0FBQUEsYUFBS0MsRUFBRXFCLE1BQUYsQ0FBVSxZQUFNO0FBQ2hDLFlBQU1HLE1BQU01QixLQUFLNkIsT0FBTCxDQUFhRixRQUFiLENBQVo7QUFDRCxPQUZpQixDQUFMO0FBQUEsS0FBYjtBQUdELEdBVEQ7O0FBV0EseUJBQVMsaURBQVQsRUFBNEQsZ0JBQU14QixFQUFOLEVBQVk7QUFDdEVBLE9BQUcsUUFBSCxFQUFhO0FBQUEsYUFBS0MsRUFBRXFCLE1BQUYsQ0FBVSxZQUFNO0FBQ2hDekIsYUFBSzhCLHlCQUFMLENBQStCLEVBQUNaLGNBQWMsQ0FBQyxFQUFDYSxLQUFLLFlBQU4sRUFBb0JSLE9BQU8sT0FBM0IsRUFBRCxDQUFmLEVBQS9CO0FBQ0QsT0FGaUIsQ0FBTDtBQUFBLEtBQWI7QUFHRCxHQUpEO0FBTUQsQ0F6QkQiLCJmaWxlIjoic3RhdGVfZGVjbGFyYXRpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cblxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKSxcbiAgICAgIHNtICAgPSBqc3NtLnNtO1xuXG5cblxuXG5cbmRlc2NyaWJlKFwiZG9lc24ndCB0aHJvd1wiLCBhc3luYyBpdCA9PiB7XG5cbiAgaXQoJ3dpdGggbm8gYXR0cmlidXRlcycsICAgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBjOiB7fTsgYSAtPiBiO2A7IH0pICk7XG4gIGl0KCd3aXRoIGp1c3Qgd2hpdGVzcGFjZScsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBjb25zdCBfZm9vID0gc21gYzogeyB9OyBhIC0+IGI7YDsgfSkgKTtcbiAgaXQoJ3dpdGgganVzdCBub2RlIGNvbG9yJywgdCA9PiB0Lm5vdFRocm93cygoKSA9PiB7IGNvbnN0IF9mb28gPSBzbWBjOiB7IG5vZGVfY29sb3I6IHJlZDsgfTsgYSAtPiBiO2A7IH0pICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdjYW4gcmVhZCBkZWNsYXJhdGlvbicsIGFzeW5jIF9pdCA9PiB7XG5cbiAgY29uc3QgbWFjaDAgPSBzbWBjOiB7IH07ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGEgLT4gYjtgO1xuICBjb25zdCBtYWNoMSA9IHNtYGM6IHsgbm9kZV9jb2xvcjogcmVkOyB9OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYSAtPiBiO2A7XG4gIGNvbnN0IG1hY2gyID0gc21gYzogeyBub2RlX2NvbG9yOiByZWQ7IG5vZGVfc2hhcGU6IGNpcmNsZTsgfTsgICAgICAgICBhIC0+IGI7YDtcbi8vICBjb25zdCBtYWNoVCA9IHNtYGM6IHsgbm9kZV9jb2xvcjogcmVkOyB9OyBkOiB7IG5vZGVfc2hhcGU6IGNpcmNsZTsgfTsgYSAtPiBiO2A7XG5cbiAgLy8gY29uc3QgbWFjaFAgPSBzbWBcbiAgLy8gICBjOiB7IG5vZGVfc2hhcGU6IGNpcmNsZTsgbm9kZV9jb2xvcjogcmVkOyB9O1xuICAvLyAgIGQ6IHsgbm9kZV9zaGFwZTogY2lyY2xlOyBub2RlX2NvbG9yOiByZWQ7IH07XG4gIC8vICAgYSAtPiBiO1xuICAvLyBgO1xuXG4gIGRlc2NyaWJlKCdvZiB3LyBub3RoaW5nJywgYXN5bmMgX2l0MiA9PiB7XG4gICAgY29uc3QgZGVjbHMgPSBtYWNoMC5zdGF0ZV9kZWNsYXJhdGlvbnMoKTtcbiAgICBkZXNjcmliZSgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb25zLzAnLCBhc3luYyBpdCA9PiB7XG4gICAgICBpdCgneWllbGRpbmcgbWFwJywgICAgICAgICAgdCA9PiB0LmlzKHRydWUsIGRlY2xzIGluc3RhbmNlb2YgTWFwKSk7XG4gICAgICBpdCgnbGlzdCBoYXZpbmcgc2l6ZSAxJywgICAgdCA9PiB0LmlzKDEsICAgIGRlY2xzLnNpemUpKTtcbiAgICAgIGl0KCdwcm9wcyBoYXZpbmcgbGVuZ3RoIDAnLCB0ID0+IHQuaXMoMCwgICAgZGVjbHMuZ2V0KCdjJykuZGVjbGFyYXRpb25zLmxlbmd0aCkpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnb2YganVzdCB3LyBub2RlX2NvbG9yJywgYXN5bmMgX2l0MSA9PiB7XG4gICAgY29uc3QgZGVjbHMgPSBtYWNoMS5zdGF0ZV9kZWNsYXJhdGlvbnMoKTtcbiAgICBkZXNjcmliZSgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb25zLzAnLCBhc3luYyBpdDIgPT4ge1xuICAgICAgaXQyKCd5aWVsZGluZyBtYXAnLCAgICAgICAgICB0ID0+IHQuaXModHJ1ZSwgZGVjbHMgaW5zdGFuY2VvZiBNYXApKTtcbiAgICAgIGl0MignbGlzdCBoYXZpbmcgc2l6ZSAxJywgICAgdCA9PiB0LmlzKDEsICAgIGRlY2xzLnNpemUpKTtcbiAgICAgIGl0MigncHJvcHMgaGF2aW5nIGxlbmd0aCAxJywgdCA9PiB0LmlzKDEsICAgIGRlY2xzLmdldCgnYycpLmRlY2xhcmF0aW9ucy5sZW5ndGgpKTtcbiAgICAgIC8vIHRvZG8gd2hhcmdhcmJsIGNoZWNrIHRoZSBhY3R1YWwgbWVtYmVycyBjb21lYmFja1xuICAgIH0pO1xuXG4vLyAgaXQoJ3Rocm91Z2ggLnN0YXRlX2RlY2xhcmF0aW9uLzEnLCAgdCA9PiB0LmlzKCdsZWZ0JywgbWFjaDEuc3RhdGVfZGVjbGFyYXRpb24oJ2MnKSApICk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdvZiB3LyBub2RlX2NvbG9yLCBub2RlX3NoYXBlJywgYXN5bmMgaXQgPT4ge1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbi8xJywgIHQgPT4gdC5pcygnI2ZmMDAwMGZmJywgbWFjaDIuc3RhdGVfZGVjbGFyYXRpb24oJ2MnKS5kZWNsYXJhdGlvbnNbMF0udmFsdWUgKSApO1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbi8xJywgIHQgPT4gdC5pcygnY2lyY2xlJywgbWFjaDIuc3RhdGVfZGVjbGFyYXRpb24oJ2MnKS5kZWNsYXJhdGlvbnNbMV0udmFsdWUgKSApO1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbnMvMCcsIHQgPT4gdC5pcygxLCBtYWNoMi5zdGF0ZV9kZWNsYXJhdGlvbnMoKS5zaXplICkgKTtcbiAgICBpdCgndGhyb3VnaCAuc3RhdGVfZGVjbGFyYXRpb25zLzAnLCB0ID0+IHQuaXMoMiwgbWFjaDIuc3RhdGVfZGVjbGFyYXRpb25zKCkuZ2V0KCdjJykuZGVjbGFyYXRpb25zLmxlbmd0aCApICk7XG4gIH0pO1xuLypcbiAgZGVzY3JpYmUoJ29mIHcvIG5vZGVfY29sb3Igb24gYywgbm9kZV9zaGFwZSBvbiBkJywgYXN5bmMgaXQgPT4ge1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbi8xJywgIHQgPT4gdC5pcygnbGVmdCcsIG1hY2hULnN0YXRlX2RlY2xhcmF0aW9uKCdjJykgKSApO1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbi8xJywgIHQgPT4gdC5pcygnbGVmdCcsIG1hY2hULnN0YXRlX2RlY2xhcmF0aW9uKCdkJykgKSApO1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbnMvMCcsIHQgPT4gdC5pcygnbGVmdCcsIG1hY2hULnN0YXRlX2RlY2xhcmF0aW9ucygpICkgKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ29mIHcvIG5vZGVfY29sb3IsIG5vZGVfc2hhcGUgb24gZWFjaCBjIGFuZCBkJywgYXN5bmMgaXQgPT4ge1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbi8xJywgIHQgPT4gdC5pcygnbGVmdCcsIG1hY2hQLnN0YXRlX2RlY2xhcmF0aW9uKCdjJykgKSApO1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbi8xJywgIHQgPT4gdC5pcygnbGVmdCcsIG1hY2hQLnN0YXRlX2RlY2xhcmF0aW9uKCdkJykgKSApO1xuICAgIGl0KCd0aHJvdWdoIC5zdGF0ZV9kZWNsYXJhdGlvbnMvMCcsIHQgPT4gdC5pcygnbGVmdCcsIG1hY2hQLnN0YXRlX2RlY2xhcmF0aW9ucygpICkgKTtcbiAgfSk7XG4qL1xufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ2Vycm9yIGNhdGNoZXJ5JywgYXN5bmMgX3BhcnNlX2l0ID0+IHtcblxuICBkZXNjcmliZSgncmVwZWF0ZWQgZGVjbGFyYXRpb24nLCBhc3luYyBpdCA9PiB7XG4gICAgaXQoJ3Rocm93cycsIHQgPT4gdC50aHJvd3MoICgpID0+IHtcbiAgICAgIGNvbnN0IF9tYWNoMSA9IHNtYGM6IHsgbm9kZV9jb2xvcjogcmVkOyB9OyBjOiB7IG5vZGVfY29sb3I6IHJlZDsgfTsgYSAtPiBiO2A7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW51c2VkLXZhcnNcbiAgICB9ICkpO1xuICB9KTtcblxuICBkZXNjcmliZSgndW5rbm93biBzdGF0ZSBwcm9wZXJ0eScsIGFzeW5jIGl0ID0+IHtcbiAgICBjb25zdCBwcmVzdGF0ZSA9IHtcbiAgICAgIFwic3RhcnRfc3RhdGVzXCI6W1wiYlwiXSxcbiAgICAgIFwidHJhbnNpdGlvbnNcIjpbe1wiZnJvbVwiOlwiYlwiLFwidG9cIjpcImNcIixcImtpbmRcIjpcImxlZ2FsXCIsXCJmb3JjZWRfb25seVwiOmZhbHNlLFwibWFpbl9wYXRoXCI6ZmFsc2V9XSxcbiAgICAgIFwic3RhdGVfZGVjbGFyYXRpb25cIjpbe1wic3RhdGVcIjpcImFcIixcImRlY2xhcmF0aW9uc1wiOlt7XCJrZXlcIjpcInVyZ2xlIGJlcmdsZVwiLFwidmFsdWVcIjpcImNpcmNsZVwifV19XX07XG5cbiAgICBpdCgndGhyb3dzJywgdCA9PiB0LnRocm93cyggKCkgPT4ge1xuICAgICAgY29uc3QgX20wID0ganNzbS5NYWNoaW5lKHByZXN0YXRlKTtcbiAgICB9ICkpO1xuICB9KTtcblxuICBkZXNjcmliZSgndHJhbnNmZXIgc3RhdGUgcHJvcGVydGllcyB0aHJvd3Mgb24gdW5rbm93biBrZXknLCBhc3luYyBpdCA9PiB7XG4gICAgaXQoJ3Rocm93cycsIHQgPT4gdC50aHJvd3MoICgpID0+IHtcbiAgICAgIGpzc20udHJhbnNmZXJfc3RhdGVfcHJvcGVydGllcyh7ZGVjbGFyYXRpb25zOiBbe2tleTogJ2Fnc3JoZHRqZnknLCB2YWx1ZTogJ3NldmVuJ31dfSk7XG4gICAgfSApKTtcbiAgfSk7XG5cbn0pO1xuIl19