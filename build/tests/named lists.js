'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js');

(0, _avaSpec.describe)('named lists', async function (it) {

  it('alone', function (t) {
    return t.notThrows(function () {
      jssm.parse('&b: [a c e];');
    });
  });
  it('before trans', function (t) {
    return t.notThrows(function () {
      jssm.parse('&b: [a c e]; a->c;');
    });
  });
  it('after trans', function (t) {
    return t.notThrows(function () {
      jssm.parse('a->c; &b: [a c e];');
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9uYW1lZCBsaXN0cy5qcyJdLCJuYW1lcyI6WyJqc3NtIiwicmVxdWlyZSIsIml0IiwidCIsIm5vdFRocm93cyIsInBhcnNlIl0sIm1hcHBpbmdzIjoiOztBQUNBOztBQUVBLElBQU1BLE9BQU9DLFFBQVEsNEJBQVIsQ0FBYjs7QUFNQSx1QkFBUyxhQUFULEVBQXdCLGdCQUFNQyxFQUFOLEVBQVk7O0FBRWxDQSxLQUFHLE9BQUgsRUFBbUI7QUFBQSxXQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFSixXQUFLSyxLQUFMLENBQVcsY0FBWDtBQUE2QixLQUFqRCxDQUFMO0FBQUEsR0FBbkI7QUFDQUgsS0FBRyxjQUFILEVBQW1CO0FBQUEsV0FBS0MsRUFBRUMsU0FBRixDQUFZLFlBQU07QUFBRUosV0FBS0ssS0FBTCxDQUFXLG9CQUFYO0FBQW1DLEtBQXZELENBQUw7QUFBQSxHQUFuQjtBQUNBSCxLQUFHLGFBQUgsRUFBbUI7QUFBQSxXQUFLQyxFQUFFQyxTQUFGLENBQVksWUFBTTtBQUFFSixXQUFLSyxLQUFMLENBQVcsb0JBQVg7QUFBbUMsS0FBdkQsQ0FBTDtBQUFBLEdBQW5CO0FBRUQsQ0FORCIsImZpbGUiOiJuYW1lZCBsaXN0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKTtcblxuXG5cblxuXG5kZXNjcmliZSgnbmFtZWQgbGlzdHMnLCBhc3luYyBpdCA9PiB7XG5cbiAgaXQoJ2Fsb25lJywgICAgICAgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBqc3NtLnBhcnNlKCcmYjogW2EgYyBlXTsnKTsgfSkgKTtcbiAgaXQoJ2JlZm9yZSB0cmFucycsIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBqc3NtLnBhcnNlKCcmYjogW2EgYyBlXTsgYS0+YzsnKTsgfSkgKTtcbiAgaXQoJ2FmdGVyIHRyYW5zJywgIHQgPT4gdC5ub3RUaHJvd3MoKCkgPT4geyBqc3NtLnBhcnNlKCdhLT5jOyAmYjogW2EgYyBlXTsnKTsgfSkgKTtcblxufSk7XG4iXX0=