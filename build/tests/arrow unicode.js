'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../build/jssm.es5.js');
/* eslint-disable max-len */

(0, _avaSpec.describe)('arrow_direction', async function (it) {

  it('←', function (t) {
    return t.is('left', jssm.arrow_direction('←'));
  });
  it('⇐', function (t) {
    return t.is('left', jssm.arrow_direction('⇐'));
  });
  it('↚', function (t) {
    return t.is('left', jssm.arrow_direction('↚'));
  });

  it('→', function (t) {
    return t.is('right', jssm.arrow_direction('→'));
  });
  it('⇒', function (t) {
    return t.is('right', jssm.arrow_direction('⇒'));
  });
  it('↛', function (t) {
    return t.is('right', jssm.arrow_direction('↛'));
  });

  it('↔', function (t) {
    return t.is('both', jssm.arrow_direction('↔'));
  });
  it('⇔', function (t) {
    return t.is('both', jssm.arrow_direction('⇔'));
  });
  it('↮', function (t) {
    return t.is('both', jssm.arrow_direction('↮'));
  });

  it('←⇒', function (t) {
    return t.is('both', jssm.arrow_direction('←⇒'));
  });
  it('⇐→', function (t) {
    return t.is('both', jssm.arrow_direction('⇐→'));
  });
  it('←↛', function (t) {
    return t.is('both', jssm.arrow_direction('←↛'));
  });
  it('↚→', function (t) {
    return t.is('both', jssm.arrow_direction('↚→'));
  });
  it('⇐↛', function (t) {
    return t.is('both', jssm.arrow_direction('⇐↛'));
  });
  it('↚⇒', function (t) {
    return t.is('both', jssm.arrow_direction('↚⇒'));
  });
});

(0, _avaSpec.describe)('arrow_left_kind', async function (it) {

  it('→', function (t) {
    return t.is('none', jssm.arrow_left_kind('→'));
  });
  it('⇒', function (t) {
    return t.is('none', jssm.arrow_left_kind('⇒'));
  });
  it('↛', function (t) {
    return t.is('none', jssm.arrow_left_kind('↛'));
  });

  it('←', function (t) {
    return t.is('legal', jssm.arrow_left_kind('←'));
  });
  it('↔', function (t) {
    return t.is('legal', jssm.arrow_left_kind('↔'));
  });
  it('←⇒', function (t) {
    return t.is('legal', jssm.arrow_left_kind('←⇒'));
  });
  it('←↛', function (t) {
    return t.is('legal', jssm.arrow_left_kind('←↛'));
  });

  it('⇐', function (t) {
    return t.is('main', jssm.arrow_left_kind('⇐'));
  });
  it('⇔', function (t) {
    return t.is('main', jssm.arrow_left_kind('⇔'));
  });
  it('⇐→', function (t) {
    return t.is('main', jssm.arrow_left_kind('⇐→'));
  });
  it('⇐↛', function (t) {
    return t.is('main', jssm.arrow_left_kind('⇐↛'));
  });

  it('↚', function (t) {
    return t.is('forced', jssm.arrow_left_kind('↚'));
  });
  it('↮', function (t) {
    return t.is('forced', jssm.arrow_left_kind('↮'));
  });
  it('↚→', function (t) {
    return t.is('forced', jssm.arrow_left_kind('↚→'));
  });
  it('↚⇒', function (t) {
    return t.is('forced', jssm.arrow_left_kind('↚⇒'));
  });
});

(0, _avaSpec.describe)('arrow_right_kind', async function (it) {

  it('←', function (t) {
    return t.is('none', jssm.arrow_right_kind('←'));
  });
  it('⇐', function (t) {
    return t.is('none', jssm.arrow_right_kind('⇐'));
  });
  it('↚', function (t) {
    return t.is('none', jssm.arrow_right_kind('↚'));
  });

  it('→', function (t) {
    return t.is('legal', jssm.arrow_right_kind('→'));
  });
  it('↔', function (t) {
    return t.is('legal', jssm.arrow_right_kind('↔'));
  });
  it('⇐→', function (t) {
    return t.is('legal', jssm.arrow_right_kind('⇐→'));
  });
  it('↚→', function (t) {
    return t.is('legal', jssm.arrow_right_kind('↚→'));
  });

  it('⇒', function (t) {
    return t.is('main', jssm.arrow_right_kind('⇒'));
  });
  it('⇔', function (t) {
    return t.is('main', jssm.arrow_right_kind('⇔'));
  });
  it('←⇒', function (t) {
    return t.is('main', jssm.arrow_right_kind('←⇒'));
  });
  it('↚⇒', function (t) {
    return t.is('main', jssm.arrow_right_kind('↚⇒'));
  });

  it('↛', function (t) {
    return t.is('forced', jssm.arrow_right_kind('↛'));
  });
  it('↮', function (t) {
    return t.is('forced', jssm.arrow_right_kind('↮'));
  });
  it('←↛', function (t) {
    return t.is('forced', jssm.arrow_right_kind('←↛'));
  });
  it('⇐↛', function (t) {
    return t.is('forced', jssm.arrow_right_kind('⇐↛'));
  });
});

// stochable
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9hcnJvdyB1bmljb2RlLmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwiaXQiLCJ0IiwiaXMiLCJhcnJvd19kaXJlY3Rpb24iLCJhcnJvd19sZWZ0X2tpbmQiLCJhcnJvd19yaWdodF9raW5kIl0sIm1hcHBpbmdzIjoiOztBQUdBOztBQUVBLElBQU1BLE9BQU9DLFFBQVEsNEJBQVIsQ0FBYjtBQUpBOztBQVVBLHVCQUFTLGlCQUFULEVBQTRCLGdCQUFNQyxFQUFOLEVBQVk7O0FBRXRDQSxLQUFHLEdBQUgsRUFBUTtBQUFBLFdBQUtDLEVBQUVDLEVBQUYsQ0FBSyxNQUFMLEVBQWFKLEtBQUtLLGVBQUwsQ0FBcUIsR0FBckIsQ0FBYixDQUFMO0FBQUEsR0FBUjtBQUNBSCxLQUFHLEdBQUgsRUFBUTtBQUFBLFdBQUtDLEVBQUVDLEVBQUYsQ0FBSyxNQUFMLEVBQWFKLEtBQUtLLGVBQUwsQ0FBcUIsR0FBckIsQ0FBYixDQUFMO0FBQUEsR0FBUjtBQUNBSCxLQUFHLEdBQUgsRUFBUTtBQUFBLFdBQUtDLEVBQUVDLEVBQUYsQ0FBSyxNQUFMLEVBQWFKLEtBQUtLLGVBQUwsQ0FBcUIsR0FBckIsQ0FBYixDQUFMO0FBQUEsR0FBUjs7QUFFQUgsS0FBRyxHQUFILEVBQVE7QUFBQSxXQUFLQyxFQUFFQyxFQUFGLENBQUssT0FBTCxFQUFjSixLQUFLSyxlQUFMLENBQXFCLEdBQXJCLENBQWQsQ0FBTDtBQUFBLEdBQVI7QUFDQUgsS0FBRyxHQUFILEVBQVE7QUFBQSxXQUFLQyxFQUFFQyxFQUFGLENBQUssT0FBTCxFQUFjSixLQUFLSyxlQUFMLENBQXFCLEdBQXJCLENBQWQsQ0FBTDtBQUFBLEdBQVI7QUFDQUgsS0FBRyxHQUFILEVBQVE7QUFBQSxXQUFLQyxFQUFFQyxFQUFGLENBQUssT0FBTCxFQUFjSixLQUFLSyxlQUFMLENBQXFCLEdBQXJCLENBQWQsQ0FBTDtBQUFBLEdBQVI7O0FBRUFILEtBQUcsR0FBSCxFQUFRO0FBQUEsV0FBS0MsRUFBRUMsRUFBRixDQUFLLE1BQUwsRUFBYUosS0FBS0ssZUFBTCxDQUFxQixHQUFyQixDQUFiLENBQUw7QUFBQSxHQUFSO0FBQ0FILEtBQUcsR0FBSCxFQUFRO0FBQUEsV0FBS0MsRUFBRUMsRUFBRixDQUFLLE1BQUwsRUFBYUosS0FBS0ssZUFBTCxDQUFxQixHQUFyQixDQUFiLENBQUw7QUFBQSxHQUFSO0FBQ0FILEtBQUcsR0FBSCxFQUFRO0FBQUEsV0FBS0MsRUFBRUMsRUFBRixDQUFLLE1BQUwsRUFBYUosS0FBS0ssZUFBTCxDQUFxQixHQUFyQixDQUFiLENBQUw7QUFBQSxHQUFSOztBQUVBSCxLQUFHLElBQUgsRUFBUztBQUFBLFdBQUtDLEVBQUVDLEVBQUYsQ0FBSyxNQUFMLEVBQWFKLEtBQUtLLGVBQUwsQ0FBcUIsSUFBckIsQ0FBYixDQUFMO0FBQUEsR0FBVDtBQUNBSCxLQUFHLElBQUgsRUFBUztBQUFBLFdBQUtDLEVBQUVDLEVBQUYsQ0FBSyxNQUFMLEVBQWFKLEtBQUtLLGVBQUwsQ0FBcUIsSUFBckIsQ0FBYixDQUFMO0FBQUEsR0FBVDtBQUNBSCxLQUFHLElBQUgsRUFBUztBQUFBLFdBQUtDLEVBQUVDLEVBQUYsQ0FBSyxNQUFMLEVBQWFKLEtBQUtLLGVBQUwsQ0FBcUIsSUFBckIsQ0FBYixDQUFMO0FBQUEsR0FBVDtBQUNBSCxLQUFHLElBQUgsRUFBUztBQUFBLFdBQUtDLEVBQUVDLEVBQUYsQ0FBSyxNQUFMLEVBQWFKLEtBQUtLLGVBQUwsQ0FBcUIsSUFBckIsQ0FBYixDQUFMO0FBQUEsR0FBVDtBQUNBSCxLQUFHLElBQUgsRUFBUztBQUFBLFdBQUtDLEVBQUVDLEVBQUYsQ0FBSyxNQUFMLEVBQWFKLEtBQUtLLGVBQUwsQ0FBcUIsSUFBckIsQ0FBYixDQUFMO0FBQUEsR0FBVDtBQUNBSCxLQUFHLElBQUgsRUFBUztBQUFBLFdBQUtDLEVBQUVDLEVBQUYsQ0FBSyxNQUFMLEVBQWFKLEtBQUtLLGVBQUwsQ0FBcUIsSUFBckIsQ0FBYixDQUFMO0FBQUEsR0FBVDtBQUVELENB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RUFBRUMsRUFBRixDQUFLLE1BQUwsRUFBYUosS0FBS08sZ0JBQUwsQ0FBc0IsSUFBdEIsQ0FBYixDQUFMO0FBQUEsR0FBVDs7QUFFQUwsS0FBRyxHQUFILEVBQVE7QUFBQSxXQUFLQyxFQUFFQyxFQUFGLENBQUssUUFBTCxFQUFlSixLQUFLTyxnQkFBTCxDQUFzQixHQUF0QixDQUFmLENBQUw7QUFBQSxHQUFSO0FBQ0FMLEtBQUcsR0FBSCxFQUFRO0FBQUEsV0FBS0MsRUFBRUMsRUFBRixDQUFLLFFBQUwsRUFBZUosS0FBS08sZ0JBQUwsQ0FBc0IsR0FBdEIsQ0FBZixDQUFMO0FBQUEsR0FBUjtBQUNBTCxLQUFHLElBQUgsRUFBUztBQUFBLFdBQUtDLEVBQUVDLEVBQUYsQ0FBSyxRQUFMLEVBQWVKLEtBQUtPLGdCQUFMLENBQXNCLElBQXRCLENBQWYsQ0FBTDtBQUFBLEdBQVQ7QUFDQUwsS0FBRyxJQUFILEVBQVM7QUFBQSxXQUFLQyxFQUFFQyxFQUFGLENBQUssUUFBTCxFQUFlSixLQUFLTyxnQkFBTCxDQUFzQixJQUF0QixDQUFmLENBQUw7QUFBQSxHQUFUO0FBRUQsQ0FyQkQ7O0FBdUJBIiwiZmlsZSI6ImFycm93IHVuaWNvZGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cblxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKTtcblxuXG5cblxuXG5kZXNjcmliZSgnYXJyb3dfZGlyZWN0aW9uJywgYXN5bmMgaXQgPT4ge1xuXG4gIGl0KCfihpAnLCB0ID0+IHQuaXMoJ2xlZnQnLCBqc3NtLmFycm93X2RpcmVjdGlvbign4oaQJykpKTtcbiAgaXQoJ+KHkCcsIHQgPT4gdC5pcygnbGVmdCcsIGpzc20uYXJyb3dfZGlyZWN0aW9uKCfih5AnKSkpO1xuICBpdCgn4oaaJywgdCA9PiB0LmlzKCdsZWZ0JywganNzbS5hcnJvd19kaXJlY3Rpb24oJ+KGmicpKSk7XG5cbiAgaXQoJ+KGkicsIHQgPT4gdC5pcygncmlnaHQnLCBqc3NtLmFycm93X2RpcmVjdGlvbign4oaSJykpKTtcbiAgaXQoJ+KHkicsIHQgPT4gdC5pcygncmlnaHQnLCBqc3NtLmFycm93X2RpcmVjdGlvbign4oeSJykpKTtcbiAgaXQoJ+KGmycsIHQgPT4gdC5pcygncmlnaHQnLCBqc3NtLmFycm93X2RpcmVjdGlvbign4oabJykpKTtcblxuICBpdCgn4oaUJywgdCA9PiB0LmlzKCdib3RoJywganNzbS5hcnJvd19kaXJlY3Rpb24oJ+KGlCcpKSk7XG4gIGl0KCfih5QnLCB0ID0+IHQuaXMoJ2JvdGgnLCBqc3NtLmFycm93X2RpcmVjdGlvbign4oeUJykpKTtcbiAgaXQoJ+KGricsIHQgPT4gdC5pcygnYm90aCcsIGpzc20uYXJyb3dfZGlyZWN0aW9uKCfihq4nKSkpO1xuXG4gIGl0KCfihpDih5InLCB0ID0+IHQuaXMoJ2JvdGgnLCBqc3NtLmFycm93X2RpcmVjdGlvbign4oaQ4oeSJykpKTtcbiAgaXQoJ+KHkOKGkicsIHQgPT4gdC5pcygnYm90aCcsIGpzc20uYXJyb3dfZGlyZWN0aW9uKCfih5DihpInKSkpO1xuICBpdCgn4oaQ4oabJywgdCA9PiB0LmlzKCdib3RoJywganNzbS5hcnJvd19kaXJlY3Rpb24oJ+KGkOKGmycpKSk7XG4gIGl0KCfihprihpInLCB0ID0+IHQuaXMoJ2JvdGgnLCBqc3NtLmFycm93X2RpcmVjdGlvbign4oaa4oaSJykpKTtcbiAgaXQoJ+KHkOKGmycsIHQgPT4gdC5pcygnYm90aCcsIGpzc20uYXJyb3dfZGlyZWN0aW9uKCfih5DihpsnKSkpO1xuICBpdCgn4oaa4oeSJywgdCA9PiB0LmlzKCdib3RoJywganNzbS5hcnJvd19kaXJlY3Rpb24oJ+KGmuKHkicpKSk7XG5cbn0pO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdhcnJvd19sZWZ0X2tpbmQnLCBhc3luYyBpdCA9PiB7XG5cbiAgaXQoJ+KGkicsIHQgPT4gdC5pcygnbm9uZScsIGpzc20uYXJyb3dfbGVmdF9raW5kKCfihpInKSkpO1xuICBpdCgn4oeSJywgdCA9PiB0LmlzKCdub25lJywganNzbS5hcnJvd19sZWZ0X2tpbmQoJ+KHkicpKSk7XG4gIGl0KCfihpsnLCB0ID0+IHQuaXMoJ25vbmUnLCBqc3NtLmFycm93X2xlZnRfa2luZCgn4oabJykpKTtcblxuICBpdCgn4oaQJywgdCA9PiB0LmlzKCdsZWdhbCcsIGpzc20uYXJyb3dfbGVmdF9raW5kKCfihpAnKSkpO1xuICBpdCgn4oaUJywgdCA9PiB0LmlzKCdsZWdhbCcsIGpzc20uYXJyb3dfbGVmdF9raW5kKCfihpQnKSkpO1xuICBpdCgn4oaQ4oeSJywgdCA9PiB0LmlzKCdsZWdhbCcsIGpzc20uYXJyb3dfbGVmdF9raW5kKCfihpDih5InKSkpO1xuICBpdCgn4oaQ4oabJywgdCA9PiB0LmlzKCdsZWdhbCcsIGpzc20uYXJyb3dfbGVmdF9raW5kKCfihpDihpsnKSkpO1xuXG4gIGl0KCfih5AnLCB0ID0+IHQuaXMoJ21haW4nLCBqc3NtLmFycm93X2xlZnRfa2luZCgn4oeQJykpKTtcbiAgaXQoJ+KHlCcsIHQgPT4gdC5pcygnbWFpbicsIGpzc20uYXJyb3dfbGVmdF9raW5kKCfih5QnKSkpO1xuICBpdCgn4oeQ4oaSJywgdCA9PiB0LmlzKCdtYWluJywganNzbS5hcnJvd19sZWZ0X2tpbmQoJ+KHkOKGkicpKSk7XG4gIGl0KCfih5DihpsnLCB0ID0+IHQuaXMoJ21haW4nLCBqc3NtLmFycm93X2xlZnRfa2luZCgn4oeQ4oabJykpKTtcblxuICBpdCgn4oaaJywgdCA9PiB0LmlzKCdmb3JjZWQnLCBqc3NtLmFycm93X2xlZnRfa2luZCgn4oaaJykpKTtcbiAgaXQoJ+KGricsIHQgPT4gdC5pcygnZm9yY2VkJywganNzbS5hcnJvd19sZWZ0X2tpbmQoJ+KGricpKSk7XG4gIGl0KCfihprihpInLCB0ID0+IHQuaXMoJ2ZvcmNlZCcsIGpzc20uYXJyb3dfbGVmdF9raW5kKCfihprihpInKSkpO1xuICBpdCgn4oaa4oeSJywgdCA9PiB0LmlzKCdmb3JjZWQnLCBqc3NtLmFycm93X2xlZnRfa2luZCgn4oaa4oeSJykpKTtcblxufSk7XG5cblxuXG5cblxuZGVzY3JpYmUoJ2Fycm93X3JpZ2h0X2tpbmQnLCBhc3luYyBpdCA9PiB7XG5cbiAgaXQoJ+KGkCcsIHQgPT4gdC5pcygnbm9uZScsIGpzc20uYXJyb3dfcmlnaHRfa2luZCgn4oaQJykpKTtcbiAgaXQoJ+KHkCcsIHQgPT4gdC5pcygnbm9uZScsIGpzc20uYXJyb3dfcmlnaHRfa2luZCgn4oeQJykpKTtcbiAgaXQoJ+KGmicsIHQgPT4gdC5pcygnbm9uZScsIGpzc20uYXJyb3dfcmlnaHRfa2luZCgn4oaaJykpKTtcblxuICBpdCgn4oaSJywgdCA9PiB0LmlzKCdsZWdhbCcsIGpzc20uYXJyb3dfcmlnaHRfa2luZCgn4oaSJykpKTtcbiAgaXQoJ+KGlCcsIHQgPT4gdC5pcygnbGVnYWwnLCBqc3NtLmFycm93X3JpZ2h0X2tpbmQoJ+KGlCcpKSk7XG4gIGl0KCfih5DihpInLCB0ID0+IHQuaXMoJ2xlZ2FsJywganNzbS5hcnJvd19yaWdodF9raW5kKCfih5DihpInKSkpO1xuICBpdCgn4oaa4oaSJywgdCA9PiB0LmlzKCdsZWdhbCcsIGpzc20uYXJyb3dfcmlnaHRfa2luZCgn4oaa4oaSJykpKTtcblxuICBpdCgn4oeSJywgdCA9PiB0LmlzKCdtYWluJywganNzbS5hcnJvd19yaWdodF9raW5kKCfih5InKSkpO1xuICBpdCgn4oeUJywgdCA9PiB0LmlzKCdtYWluJywganNzbS5hcnJvd19yaWdodF9raW5kKCfih5QnKSkpO1xuICBpdCgn4oaQ4oeSJywgdCA9PiB0LmlzKCdtYWluJywganNzbS5hcnJvd19yaWdodF9raW5kKCfihpDih5InKSkpO1xuICBpdCgn4oaa4oeSJywgdCA9PiB0LmlzKCdtYWluJywganNzbS5hcnJvd19yaWdodF9raW5kKCfihprih5InKSkpO1xuXG4gIGl0KCfihpsnLCB0ID0+IHQuaXMoJ2ZvcmNlZCcsIGpzc20uYXJyb3dfcmlnaHRfa2luZCgn4oabJykpKTtcbiAgaXQoJ+KGricsIHQgPT4gdC5pcygnZm9yY2VkJywganNzbS5hcnJvd19yaWdodF9raW5kKCfihq4nKSkpO1xuICBpdCgn4oaQ4oabJywgdCA9PiB0LmlzKCdmb3JjZWQnLCBqc3NtLmFycm93X3JpZ2h0X2tpbmQoJ+KGkOKGmycpKSk7XG4gIGl0KCfih5DihpsnLCB0ID0+IHQuaXMoJ2ZvcmNlZCcsIGpzc20uYXJyb3dfcmlnaHRfa2luZCgn4oeQ4oabJykpKTtcblxufSk7XG5cbi8vIHN0b2NoYWJsZVxuIl19