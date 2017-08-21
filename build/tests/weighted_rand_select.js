'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js');
/* eslint-disable fp/no-loops */

(0, _avaSpec.describe)('weighted_rand_select/2', async function (it) {

                var fruit = [{ label: 'apple', probability: 0.1 }, { label: 'orange', probability: 0.4 }, { label: 'banana', probability: 0.5 }];

                var acc = {};
                for (var i = 0; i < 10000; ++i) {
                                acc[jssm.weighted_rand_select(fruit).label] = (acc[jssm.weighted_rand_select(fruit).label] || 0) + 1;
                }

                it('banana baseline', function (t) {
                                return t.deepEqual(true, acc.banana > 3000);
                });

                it('requires an array', function (t) {
                                return t.throws(function () {
                                                return jssm.weighted_rand_select('not_an_array');
                                });
                });
                it('requires members to be objects', function (t) {
                                return t.throws(function () {
                                                return jssm.weighted_rand_select(['not_an_obj']);
                                });
                });
});

// stochable
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy93ZWlnaHRlZF9yYW5kX3NlbGVjdC5qcyJdLCJuYW1lcyI6WyJqc3NtIiwicmVxdWlyZSIsIml0IiwiZnJ1aXQiLCJsYWJlbCIsInByb2JhYmlsaXR5IiwiYWNjIiwiaSIsIndlaWdodGVkX3JhbmRfc2VsZWN0IiwidCIsImRlZXBFcXVhbCIsImJhbmFuYSIsInRocm93cyJdLCJtYXBwaW5ncyI6Ijs7QUFHQTs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFKQTs7QUFVQSx1QkFBUyx3QkFBVCxFQUFtQyxnQkFBTUMsRUFBTixFQUFZOztBQUU3QyxvQkFBTUMsUUFBUSxDQUFFLEVBQUVDLE9BQU8sT0FBVCxFQUFtQkMsYUFBYSxHQUFoQyxFQUFGLEVBQ0UsRUFBRUQsT0FBTyxRQUFULEVBQW1CQyxhQUFhLEdBQWhDLEVBREYsRUFFRSxFQUFFRCxPQUFPLFFBQVQsRUFBbUJDLGFBQWEsR0FBaEMsRUFGRixDQUFkOztBQUlBLG9CQUFNQyxNQUFNLEVBQVo7QUFDQSxxQkFBSyxJQUFJQyxJQUFFLENBQVgsRUFBY0EsSUFBRSxLQUFoQixFQUF1QixFQUFFQSxDQUF6QixFQUE0QjtBQUN4QkQsb0NBQUlOLEtBQUtRLG9CQUFMLENBQTBCTCxLQUExQixFQUFpQ0MsS0FBckMsSUFBOEMsQ0FBQ0UsSUFBSU4sS0FBS1Esb0JBQUwsQ0FBMEJMLEtBQTFCLEVBQWlDQyxLQUFyQyxLQUErQyxDQUFoRCxJQUFxRCxDQUFuRztBQUNIOztBQUVERixtQkFBRyxpQkFBSCxFQUFzQjtBQUFBLHVDQUFLTyxFQUFFQyxTQUFGLENBQVksSUFBWixFQUFrQkosSUFBSUssTUFBSixHQUFhLElBQS9CLENBQUw7QUFBQSxpQkFBdEI7O0FBRUFULG1CQUFHLG1CQUFILEVBQXFDO0FBQUEsdUNBQUtPLEVBQUVHLE1BQUYsQ0FBUztBQUFBLHVEQUFNWixLQUFLUSxvQkFBTCxDQUEyQixjQUEzQixDQUFOO0FBQUEsaUNBQVQsQ0FBTDtBQUFBLGlCQUFyQztBQUNBTixtQkFBRyxnQ0FBSCxFQUFxQztBQUFBLHVDQUFLTyxFQUFFRyxNQUFGLENBQVM7QUFBQSx1REFBTVosS0FBS1Esb0JBQUwsQ0FBMkIsQ0FBQyxZQUFELENBQTNCLENBQU47QUFBQSxpQ0FBVCxDQUFMO0FBQUEsaUJBQXJDO0FBRUQsQ0FoQkQ7O0FBa0JBIiwiZmlsZSI6IndlaWdodGVkX3JhbmRfc2VsZWN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKiBlc2xpbnQtZGlzYWJsZSBmcC9uby1sb29wcyAqL1xuXG5pbXBvcnQge2Rlc2NyaWJlfSBmcm9tICdhdmEtc3BlYyc7XG5cbmNvbnN0IGpzc20gPSByZXF1aXJlKCcuLi8uLi8uLi9idWlsZC9qc3NtLmVzNS5qcycpO1xuXG5cblxuXG5cbmRlc2NyaWJlKCd3ZWlnaHRlZF9yYW5kX3NlbGVjdC8yJywgYXN5bmMgaXQgPT4ge1xuXG4gIGNvbnN0IGZydWl0ID0gWyB7IGxhYmVsOiAnYXBwbGUnLCAgcHJvYmFiaWxpdHk6IDAuMSB9LFxuICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ29yYW5nZScsIHByb2JhYmlsaXR5OiAwLjQgfSxcbiAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdiYW5hbmEnLCBwcm9iYWJpbGl0eTogMC41IH0gXTtcblxuICBjb25zdCBhY2MgPSB7fTtcbiAgZm9yIChsZXQgaT0wOyBpPDEwMDAwOyArK2kpIHtcbiAgICAgIGFjY1tqc3NtLndlaWdodGVkX3JhbmRfc2VsZWN0KGZydWl0KS5sYWJlbF0gPSAoYWNjW2pzc20ud2VpZ2h0ZWRfcmFuZF9zZWxlY3QoZnJ1aXQpLmxhYmVsXSB8fCAwKSArIDE7XG4gIH1cblxuICBpdCgnYmFuYW5hIGJhc2VsaW5lJywgdCA9PiB0LmRlZXBFcXVhbCh0cnVlLCBhY2MuYmFuYW5hID4gMzAwMCApKTtcblxuICBpdCgncmVxdWlyZXMgYW4gYXJyYXknLCAgICAgICAgICAgICAgdCA9PiB0LnRocm93cygoKSA9PiBqc3NtLndlaWdodGVkX3JhbmRfc2VsZWN0KCAnbm90X2FuX2FycmF5JyApKSk7XG4gIGl0KCdyZXF1aXJlcyBtZW1iZXJzIHRvIGJlIG9iamVjdHMnLCB0ID0+IHQudGhyb3dzKCgpID0+IGpzc20ud2VpZ2h0ZWRfcmFuZF9zZWxlY3QoIFsnbm90X2FuX29iaiddICkpKTtcblxufSk7XG5cbi8vIHN0b2NoYWJsZVxuIl19