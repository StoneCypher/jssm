'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js');
/* eslint-disable max-len */

(0, _avaSpec.describe)('arrow_direction', async function (it) {

  it('<-', function (t) {
    return t.is('left', jssm.arrow_direction('<-'));
  });
  it('<=', function (t) {
    return t.is('left', jssm.arrow_direction('<='));
  });
  it('<~', function (t) {
    return t.is('left', jssm.arrow_direction('<~'));
  });

  it('->', function (t) {
    return t.is('right', jssm.arrow_direction('->'));
  });
  it('=>', function (t) {
    return t.is('right', jssm.arrow_direction('=>'));
  });
  it('~>', function (t) {
    return t.is('right', jssm.arrow_direction('~>'));
  });

  it('<->', function (t) {
    return t.is('both', jssm.arrow_direction('<->'));
  });
  it('<=>', function (t) {
    return t.is('both', jssm.arrow_direction('<=>'));
  });
  it('<~>', function (t) {
    return t.is('both', jssm.arrow_direction('<~>'));
  });

  it('<-=>', function (t) {
    return t.is('both', jssm.arrow_direction('<-=>'));
  });
  it('<=->', function (t) {
    return t.is('both', jssm.arrow_direction('<=->'));
  });
  it('<-~>', function (t) {
    return t.is('both', jssm.arrow_direction('<-~>'));
  });
  it('<~->', function (t) {
    return t.is('both', jssm.arrow_direction('<~->'));
  });
  it('<=~>', function (t) {
    return t.is('both', jssm.arrow_direction('<=~>'));
  });
  it('<~=>', function (t) {
    return t.is('both', jssm.arrow_direction('<~=>'));
  });
});

(0, _avaSpec.describe)('arrow_left_kind', async function (it) {

  it('->', function (t) {
    return t.is('none', jssm.arrow_left_kind('->'));
  });
  it('=>', function (t) {
    return t.is('none', jssm.arrow_left_kind('=>'));
  });
  it('~>', function (t) {
    return t.is('none', jssm.arrow_left_kind('~>'));
  });

  it('<-', function (t) {
    return t.is('legal', jssm.arrow_left_kind('<-'));
  });
  it('<->', function (t) {
    return t.is('legal', jssm.arrow_left_kind('<->'));
  });
  it('<-=>', function (t) {
    return t.is('legal', jssm.arrow_left_kind('<-=>'));
  });
  it('<-~>', function (t) {
    return t.is('legal', jssm.arrow_left_kind('<-~>'));
  });

  it('<=', function (t) {
    return t.is('main', jssm.arrow_left_kind('<='));
  });
  it('<=>', function (t) {
    return t.is('main', jssm.arrow_left_kind('<=>'));
  });
  it('<=->', function (t) {
    return t.is('main', jssm.arrow_left_kind('<=->'));
  });
  it('<=~>', function (t) {
    return t.is('main', jssm.arrow_left_kind('<=~>'));
  });

  it('<~', function (t) {
    return t.is('forced', jssm.arrow_left_kind('<~'));
  });
  it('<~>', function (t) {
    return t.is('forced', jssm.arrow_left_kind('<~>'));
  });
  it('<~->', function (t) {
    return t.is('forced', jssm.arrow_left_kind('<~->'));
  });
  it('<~=>', function (t) {
    return t.is('forced', jssm.arrow_left_kind('<~=>'));
  });
});

(0, _avaSpec.describe)('arrow_right_kind', async function (it) {

  it('<-', function (t) {
    return t.is('none', jssm.arrow_right_kind('<-'));
  });
  it('<=', function (t) {
    return t.is('none', jssm.arrow_right_kind('<='));
  });
  it('<~', function (t) {
    return t.is('none', jssm.arrow_right_kind('<~'));
  });

  it('->', function (t) {
    return t.is('legal', jssm.arrow_right_kind('->'));
  });
  it('<->', function (t) {
    return t.is('legal', jssm.arrow_right_kind('<->'));
  });
  it('<=->', function (t) {
    return t.is('legal', jssm.arrow_right_kind('<=->'));
  });
  it('<~->', function (t) {
    return t.is('legal', jssm.arrow_right_kind('<~->'));
  });

  it('=>', function (t) {
    return t.is('main', jssm.arrow_right_kind('=>'));
  });
  it('<=>', function (t) {
    return t.is('main', jssm.arrow_right_kind('<=>'));
  });
  it('<-=>', function (t) {
    return t.is('main', jssm.arrow_right_kind('<-=>'));
  });
  it('<~=>', function (t) {
    return t.is('main', jssm.arrow_right_kind('<~=>'));
  });

  it('~>', function (t) {
    return t.is('forced', jssm.arrow_right_kind('~>'));
  });
  it('<~>', function (t) {
    return t.is('forced', jssm.arrow_right_kind('<~>'));
  });
  it('<-~>', function (t) {
    return t.is('forced', jssm.arrow_right_kind('<-~>'));
  });
  it('<=~>', function (t) {
    return t.is('forced', jssm.arrow_right_kind('<=~>'));
  });
});

(0, _avaSpec.describe)('error catchery', async function (_parse_it) {

  (0, _avaSpec.describe)('unknown arrow direction', async function (it) {
    it('throws', function (t) {
      return t.throws(function () {
        jssm.arrow_direction('boop');
      });
    });
  });

  (0, _avaSpec.describe)('unknown arrow left kind', async function (it) {
    it('throws', function (t) {
      return t.throws(function () {
        jssm.arrow_left_kind('boop');
      });
    });
  });

  (0, _avaSpec.describe)('unknown arrow right kind', async function (it) {
    it('throws', function (t) {
      return t.throws(function () {
        jssm.arrow_right_kind('boop');
      });
    });
  });
});

// stochable
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9hcnJvdy5qcyJdLCJuYW1lcyI6WyJqc3NtIiwicmVxdWlyZSIsIml0IiwidCIsImlzIiwiYXJyb3dfZGlyZWN0aW9uIiwiYXJyb3dfbGVmdF9raW5kIiwiYXJyb3dfcmlnaHRfa2luZCIsIl9wYXJzZV9pdCIsInRocm93cyJdLCJtYXBwaW5ncyI6Ijs7QUFHQTs7QUFFQSxJQUFNQSxPQUFPQyxRQUFRLDRCQUFSLENBQWI7QUFKQTs7QUFVQSx1QkFBUyxpQkFBVCxFQUE0QixnQkFBTUMsRUFBTixFQUFZOztBQUV0Q0EsS0FBRyxJQUFILEVBQVc7QUFBQSxXQUFLQyxFQUFFQyxFQUFGLENBQUssTUFBTCxFQUFjSixLQUFLSyxlQUFMLENBQXFCLElBQXJCLENBQWQsQ0FBTDtBQUFBLEdBQVg7QUFDQUgsS0FBRyxJQUFILEVBQVc7QUFBQSxXQUFLQyxFQUFFQyxFQUFGLENBQUssTUFBTCxFQUFjSixLQUFLSyxlQUFMLENBQXFCLElBQXJCLENBQWQsQ0FBTDtBQUFBLEdBQVg7QUFDQUgsS0FBRyxJQUFILEVBQVc7QUFBQSxXQUFLQyxFQUFFQyxFQUFGLENBQUssTUFBTCxFQUFjSixLQUFLSyxlQUFMLENBQXFCLElBQXJCLENBQWQsQ0FBTDtBQUFBLEdBQVg7O0FBRUFILEtBQUcsSUFBSCxFQUFXO0FBQUEsV0FBS0MsRUFBRUMsRUFBRixDQUFLLE9BQUwsRUFBY0osS0FBS0ssZUFBTCxDQUFxQixJQUFyQixDQUFkLENBQUw7QUFBQSxHQUFYO0FBQ0FILEtBQUcsSUFBSCxFQUFXO0FBQUEsV0FBS0MsRUFBRUMsRUFBRixDQUFLLE9BQUwsRUFBY0osS0FBS0ssZUFBTCxDQUFxQixJQUFyQixDQUFkLENBQUw7QUFBQSxHQUFYO0FBQ0FILEtBQUcsSUFBSCxFQUFXO0FBQUEsV0FBS0MsRUFBRUMsRUFBRixDQUFLLE9BQUwsRUFBY0osS0FBS0ssZUFBTCxDQUFxQixJQUFyQixDQUFkLENBQUw7QUFBQSxHQUFYOztBQUVBSCxLQUFHLEtB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QUFNSixFQUFOLEVBQVk7QUFDL0NBLE9BQUcsUUFBSCxFQUFhO0FBQUEsYUFBS0MsRUFBRU0sTUFBRixDQUFVLFlBQU07QUFDaENULGFBQUtPLGdCQUFMLENBQXNCLE1BQXRCO0FBQ0QsT0FGaUIsQ0FBTDtBQUFBLEtBQWI7QUFHRCxHQUpEO0FBTUQsQ0FwQkQ7O0FBc0JBIiwiZmlsZSI6ImFycm93LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5cbmltcG9ydCB7ZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QganNzbSA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ2Fycm93X2RpcmVjdGlvbicsIGFzeW5jIGl0ID0+IHtcblxuICBpdCgnPC0nLCAgIHQgPT4gdC5pcygnbGVmdCcsICBqc3NtLmFycm93X2RpcmVjdGlvbignPC0nKSAgICkgKTtcbiAgaXQoJzw9JywgICB0ID0+IHQuaXMoJ2xlZnQnLCAganNzbS5hcnJvd19kaXJlY3Rpb24oJzw9JykgICApICk7XG4gIGl0KCc8ficsICAgdCA9PiB0LmlzKCdsZWZ0JywgIGpzc20uYXJyb3dfZGlyZWN0aW9uKCc8ficpICAgKSApO1xuXG4gIGl0KCctPicsICAgdCA9PiB0LmlzKCdyaWdodCcsIGpzc20uYXJyb3dfZGlyZWN0aW9uKCctPicpICAgKSApO1xuICBpdCgnPT4nLCAgIHQgPT4gdC5pcygncmlnaHQnLCBqc3NtLmFycm93X2RpcmVjdGlvbignPT4nKSAgICkgKTtcbiAgaXQoJ34+JywgICB0ID0+IHQuaXMoJ3JpZ2h0JywganNzbS5hcnJvd19kaXJlY3Rpb24oJ34+JykgICApICk7XG5cbiAgaXQoJzwtPicsICB0ID0+IHQuaXMoJ2JvdGgnLCAganNzbS5hcnJvd19kaXJlY3Rpb24oJzwtPicpICApICk7XG4gIGl0KCc8PT4nLCAgdCA9PiB0LmlzKCdib3RoJywgIGpzc20uYXJyb3dfZGlyZWN0aW9uKCc8PT4nKSAgKSApO1xuICBpdCgnPH4+JywgIHQgPT4gdC5pcygnYm90aCcsICBqc3NtLmFycm93X2RpcmVjdGlvbignPH4+JykgICkgKTtcblxuICBpdCgnPC09PicsIHQgPT4gdC5pcygnYm90aCcsICBqc3NtLmFycm93X2RpcmVjdGlvbignPC09PicpICkgKTtcbiAgaXQoJzw9LT4nLCB0ID0+IHQuaXMoJ2JvdGgnLCAganNzbS5hcnJvd19kaXJlY3Rpb24oJzw9LT4nKSApICk7XG4gIGl0KCc8LX4+JywgdCA9PiB0LmlzKCdib3RoJywgIGpzc20uYXJyb3dfZGlyZWN0aW9uKCc8LX4+JykgKSApO1xuICBpdCgnPH4tPicsIHQgPT4gdC5pcygnYm90aCcsICBqc3NtLmFycm93X2RpcmVjdGlvbignPH4tPicpICkgKTtcbiAgaXQoJzw9fj4nLCB0ID0+IHQuaXMoJ2JvdGgnLCAganNzbS5hcnJvd19kaXJlY3Rpb24oJzw9fj4nKSApICk7XG4gIGl0KCc8fj0+JywgdCA9PiB0LmlzKCdib3RoJywgIGpzc20uYXJyb3dfZGlyZWN0aW9uKCc8fj0+JykgKSApO1xuXG59KTtcblxuXG5cblxuXG5kZXNjcmliZSgnYXJyb3dfbGVmdF9raW5kJywgYXN5bmMgaXQgPT4ge1xuXG4gIGl0KCctPicsICAgdCA9PiB0LmlzKCdub25lJywgICBqc3NtLmFycm93X2xlZnRfa2luZCgnLT4nKSAgICkgKTtcbiAgaXQoJz0+JywgICB0ID0+IHQuaXMoJ25vbmUnLCAgIGpzc20uYXJyb3dfbGVmdF9raW5kKCc9PicpICAgKSApO1xuICBpdCgnfj4nLCAgIHQgPT4gdC5pcygnbm9uZScsICAganNzbS5hcnJvd19sZWZ0X2tpbmQoJ34+JykgICApICk7XG5cbiAgaXQoJzwtJywgICB0ID0+IHQuaXMoJ2xlZ2FsJywgIGpzc20uYXJyb3dfbGVmdF9raW5kKCc8LScpICAgKSApO1xuICBpdCgnPC0+JywgIHQgPT4gdC5pcygnbGVnYWwnLCAganNzbS5hcnJvd19sZWZ0X2tpbmQoJzwtPicpICApICk7XG4gIGl0KCc8LT0+JywgdCA9PiB0LmlzKCdsZWdhbCcsICBqc3NtLmFycm93X2xlZnRfa2luZCgnPC09PicpICkgKTtcbiAgaXQoJzwtfj4nLCB0ID0+IHQuaXMoJ2xlZ2FsJywgIGpzc20uYXJyb3dfbGVmdF9raW5kKCc8LX4+JykgKSApO1xuXG4gIGl0KCc8PScsICAgdCA9PiB0LmlzKCdtYWluJywgICBqc3NtLmFycm93X2xlZnRfa2luZCgnPD0nKSAgICkgKTtcbiAgaXQoJzw9PicsICB0ID0+IHQuaXMoJ21haW4nLCAgIGpzc20uYXJyb3dfbGVmdF9raW5kKCc8PT4nKSAgKSApO1xuICBpdCgnPD0tPicsIHQgPT4gdC5pcygnbWFpbicsICAganNzbS5hcnJvd19sZWZ0X2tpbmQoJzw9LT4nKSApICk7XG4gIGl0KCc8PX4+JywgdCA9PiB0LmlzKCdtYWluJywgICBqc3NtLmFycm93X2xlZnRfa2luZCgnPD1+PicpICkgKTtcblxuICBpdCgnPH4nLCAgIHQgPT4gdC5pcygnZm9yY2VkJywganNzbS5hcnJvd19sZWZ0X2tpbmQoJzx+JykgICApICk7XG4gIGl0KCc8fj4nLCAgdCA9PiB0LmlzKCdmb3JjZWQnLCBqc3NtLmFycm93X2xlZnRfa2luZCgnPH4+JykgICkgKTtcbiAgaXQoJzx+LT4nLCB0ID0+IHQuaXMoJ2ZvcmNlZCcsIGpzc20uYXJyb3dfbGVmdF9raW5kKCc8fi0+JykgKSApO1xuICBpdCgnPH49PicsIHQgPT4gdC5pcygnZm9yY2VkJywganNzbS5hcnJvd19sZWZ0X2tpbmQoJzx+PT4nKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdhcnJvd19yaWdodF9raW5kJywgYXN5bmMgaXQgPT4ge1xuXG4gIGl0KCc8LScsICAgdCA9PiB0LmlzKCdub25lJywgICBqc3NtLmFycm93X3JpZ2h0X2tpbmQoJzwtJykgICApICk7XG4gIGl0KCc8PScsICAgdCA9PiB0LmlzKCdub25lJywgICBqc3NtLmFycm93X3JpZ2h0X2tpbmQoJzw9JykgICApICk7XG4gIGl0KCc8ficsICAgdCA9PiB0LmlzKCdub25lJywgICBqc3NtLmFycm93X3JpZ2h0X2tpbmQoJzx+JykgICApICk7XG5cbiAgaXQoJy0+JywgICB0ID0+IHQuaXMoJ2xlZ2FsJywgIGpzc20uYXJyb3dfcmlnaHRfa2luZCgnLT4nKSAgICkgKTtcbiAgaXQoJzwtPicsICB0ID0+IHQuaXMoJ2xlZ2FsJywgIGpzc20uYXJyb3dfcmlnaHRfa2luZCgnPC0+JykgICkgKTtcbiAgaXQoJzw9LT4nLCB0ID0+IHQuaXMoJ2xlZ2FsJywgIGpzc20uYXJyb3dfcmlnaHRfa2luZCgnPD0tPicpICkgKTtcbiAgaXQoJzx+LT4nLCB0ID0+IHQuaXMoJ2xlZ2FsJywgIGpzc20uYXJyb3dfcmlnaHRfa2luZCgnPH4tPicpICkgKTtcblxuICBpdCgnPT4nLCAgIHQgPT4gdC5pcygnbWFpbicsICAganNzbS5hcnJvd19yaWdodF9raW5kKCc9PicpICAgKSApO1xuICBpdCgnPD0+JywgIHQgPT4gdC5pcygnbWFpbicsICAganNzbS5hcnJvd19yaWdodF9raW5kKCc8PT4nKSAgKSApO1xuICBpdCgnPC09PicsIHQgPT4gdC5pcygnbWFpbicsICAganNzbS5hcnJvd19yaWdodF9raW5kKCc8LT0+JykgKSApO1xuICBpdCgnPH49PicsIHQgPT4gdC5pcygnbWFpbicsICAganNzbS5hcnJvd19yaWdodF9raW5kKCc8fj0+JykgKSApO1xuXG4gIGl0KCd+PicsICAgdCA9PiB0LmlzKCdmb3JjZWQnLCBqc3NtLmFycm93X3JpZ2h0X2tpbmQoJ34+JykgICApICk7XG4gIGl0KCc8fj4nLCAgdCA9PiB0LmlzKCdmb3JjZWQnLCBqc3NtLmFycm93X3JpZ2h0X2tpbmQoJzx+PicpICApICk7XG4gIGl0KCc8LX4+JywgdCA9PiB0LmlzKCdmb3JjZWQnLCBqc3NtLmFycm93X3JpZ2h0X2tpbmQoJzwtfj4nKSApICk7XG4gIGl0KCc8PX4+JywgdCA9PiB0LmlzKCdmb3JjZWQnLCBqc3NtLmFycm93X3JpZ2h0X2tpbmQoJzw9fj4nKSApICk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdlcnJvciBjYXRjaGVyeScsIGFzeW5jIF9wYXJzZV9pdCA9PiB7XG5cbiAgZGVzY3JpYmUoJ3Vua25vd24gYXJyb3cgZGlyZWN0aW9uJywgYXN5bmMgaXQgPT4ge1xuICAgIGl0KCd0aHJvd3MnLCB0ID0+IHQudGhyb3dzKCAoKSA9PiB7XG4gICAgICBqc3NtLmFycm93X2RpcmVjdGlvbignYm9vcCcpO1xuICAgIH0gKSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd1bmtub3duIGFycm93IGxlZnQga2luZCcsIGFzeW5jIGl0ID0+IHtcbiAgICBpdCgndGhyb3dzJywgdCA9PiB0LnRocm93cyggKCkgPT4ge1xuICAgICAganNzbS5hcnJvd19sZWZ0X2tpbmQoJ2Jvb3AnKTtcbiAgICB9ICkpO1xuICB9KTtcblxuICBkZXNjcmliZSgndW5rbm93biBhcnJvdyByaWdodCBraW5kJywgYXN5bmMgaXQgPT4ge1xuICAgIGl0KCd0aHJvd3MnLCB0ID0+IHQudGhyb3dzKCAoKSA9PiB7XG4gICAgICBqc3NtLmFycm93X3JpZ2h0X2tpbmQoJ2Jvb3AnKTtcbiAgICB9ICkpO1xuICB9KTtcblxufSk7XG5cbi8vIHN0b2NoYWJsZVxuIl19