'use strict';

var _avaSpec = require('ava-spec');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var jssm = require('../../../build/jssm.es5.js');

(0, _avaSpec.describe)('weighted_histo_key/2', async function (it) {

                var fruit = [{ label: 'apple', probability: 0.1 }, { label: 'orange', probability: 0.4 }, { label: 'banana', probability: 0.5 }];

                var out = jssm.weighted_histo_key(10000, fruit, 'probability', 'label');

                it('produces a well formed probability map', function (t) {
                                return t.deepEqual(3, [].concat(_toConsumableArray(out.keys())).length);
                });
});

// stochable
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy93ZWlnaHRlZF9oaXN0b19rZXkuanMiXSwibmFtZXMiOlsianNzbSIsInJlcXVpcmUiLCJpdCIsImZydWl0IiwibGFiZWwiLCJwcm9iYWJpbGl0eSIsIm91dCIsIndlaWdodGVkX2hpc3RvX2tleSIsInQiLCJkZWVwRXF1YWwiLCJrZXlzIiwibGVuZ3RoIl0sIm1hcHBpbmdzIjoiOztBQUNBOzs7O0FBRUEsSUFBTUEsT0FBT0MsUUFBUSw0QkFBUixDQUFiOztBQU1BLHVCQUFTLHNCQUFULEVBQWlDLGdCQUFNQyxFQUFOLEVBQVk7O0FBRTNDLG9CQUFNQyxRQUFRLENBQUUsRUFBRUMsT0FBTyxPQUFULEVBQW1CQyxhQUFhLEdBQWhDLEVBQUYsRUFDRSxFQUFFRCxPQUFPLFFBQVQsRUFBbUJDLGFBQWEsR0FBaEMsRUFERixFQUVFLEVBQUVELE9BQU8sUUFBVCxFQUFtQkMsYUFBYSxHQUFoQyxFQUZGLENBQWQ7O0FBSUEsb0JBQU1DLE1BQU1OLEtBQUtPLGtCQUFMLENBQXdCLEtBQXhCLEVBQStCSixLQUEvQixFQUFzQyxhQUF0QyxFQUFxRCxPQUFyRCxDQUFaOztBQUVBRCxtQkFBRyx3Q0FBSCxFQUE2QztBQUFBLHVDQUFLTSxFQUFFQyxTQUFGLENBQVksQ0FBWixFQUFlLDZCQUFLSCxJQUFJSSxJQUFKLEVBQUwsR0FBaUJDLE1BQWhDLENBQUw7QUFBQSxpQkFBN0M7QUFFRCxDQVZEOztBQVlBIiwiZmlsZSI6IndlaWdodGVkX2hpc3RvX2tleS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKTtcblxuXG5cblxuXG5kZXNjcmliZSgnd2VpZ2h0ZWRfaGlzdG9fa2V5LzInLCBhc3luYyBpdCA9PiB7XG5cbiAgY29uc3QgZnJ1aXQgPSBbIHsgbGFiZWw6ICdhcHBsZScsICBwcm9iYWJpbGl0eTogMC4xIH0sXG4gICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnb3JhbmdlJywgcHJvYmFiaWxpdHk6IDAuNCB9LFxuICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ2JhbmFuYScsIHByb2JhYmlsaXR5OiAwLjUgfSBdO1xuXG4gIGNvbnN0IG91dCA9IGpzc20ud2VpZ2h0ZWRfaGlzdG9fa2V5KDEwMDAwLCBmcnVpdCwgJ3Byb2JhYmlsaXR5JywgJ2xhYmVsJyk7XG5cbiAgaXQoJ3Byb2R1Y2VzIGEgd2VsbCBmb3JtZWQgcHJvYmFiaWxpdHkgbWFwJywgdCA9PiB0LmRlZXBFcXVhbCgzLCBbLi4uIG91dC5rZXlzKCldLmxlbmd0aCApKTtcblxufSk7XG5cbi8vIHN0b2NoYWJsZVxuIl19