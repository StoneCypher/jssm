'use strict';

var _templateObject = _taggedTemplateLiteral([' Solid \'Heat\' <-> \'Cool\' Liquid \'Heat\' <-> \'Cool\' Gas \'Heat\' <-> \'Cool\' Plasma; '], [' Solid \'Heat\' <-> \'Cool\' Liquid \'Heat\' <-> \'Cool\' Gas \'Heat\' <-> \'Cool\' Plasma; ']);

var _avaSpec = require('ava-spec');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }
/* eslint-disable max-len */

var jssm = require('../../../build/jssm.es5.js'),
    sm = jssm.sm;

(0, _avaSpec.describe)('matter', async function (it) {

    var matter = sm(_templateObject);

    it('starts Solid', function (t) {
        return t.is('Solid', matter.state());
    });
    it('Heat is true', function (t) {
        return t.is(true, matter.action('Heat'));
    });
    it('is now Liquid', function (t) {
        return t.is('Liquid', matter.state());
    });
    it('Heat is true', function (t) {
        return t.is(true, matter.action('Heat'));
    });
    it('is now Gas', function (t) {
        return t.is('Gas', matter.state());
    });
    it('Heat is true', function (t) {
        return t.is(true, matter.action('Heat'));
    });
    it('is now Plasma', function (t) {
        return t.is('Plasma', matter.state());
    });
    it('Heat is false', function (t) {
        return t.is(false, matter.action('Heat'));
    });
    it('is now Plasma', function (t) {
        return t.is('Plasma', matter.state());
    });
    it('Cool is true', function (t) {
        return t.is(true, matter.action('Cool'));
    });
    it('is now Gas', function (t) {
        return t.is('Gas', matter.state());
    });
    it('Cool is true', function (t) {
        return t.is(true, matter.action('Cool'));
    });
    it('is now Liquid', function (t) {
        return t.is('Liquid', matter.state());
    });
    it('Cool is true', function (t) {
        return t.is(true, matter.action('Cool'));
    });
    it('is now Solid', function (t) {
        return t.is('Solid', matter.state());
    });
    it('Cool is false', function (t) {
        return t.is(false, matter.action('Cool'));
    });
    it('is now Solid', function (t) {
        return t.is('Solid', matter.state());
    });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90ZXN0cy9wYXJzZSBhY3Rpb25zLmpzIl0sIm5hbWVzIjpbImpzc20iLCJyZXF1aXJlIiwic20iLCJpdCIsIm1hdHRlciIsInQiLCJpcyIsInN0YXRlIiwiYWN0aW9uIl0sIm1hcHBpbmdzIjoiOzs7O0FBR0E7OztBQUZBOztBQUlBLElBQU1BLE9BQU9DLFFBQVEsNEJBQVIsQ0FBYjtBQUFBLElBQ01DLEtBQU9GLEtBQUtFLEVBRGxCOztBQU9BLHVCQUFTLFFBQVQsRUFBbUIsZ0JBQU1DLEVBQU4sRUFBWTs7QUFFM0IsUUFBTUMsU0FBU0YsRUFBVCxpQkFBTjs7QUFFQUMsT0FBSSxjQUFKLEVBQXVCO0FBQUEsZUFBS0UsRUFBRUMsRUFBRixDQUFLLE9BQUwsRUFBZUYsT0FBT0csS0FBUCxFQUFmLENBQUw7QUFBQSxLQUF2QjtBQUNBSixPQUFJLGNBQUosRUFBdUI7QUFBQSxlQUFLRSxFQUFFQyxFQUFGLENBQUssSUFBTCxFQUFlRixPQUFPSSxNQUFQLENBQWMsTUFBZCxDQUFmLENBQUw7QUFBQSxLQUF2QjtBQUNBTCxPQUFJLGVBQUosRUFBdUI7QUFBQSxlQUFLRSxFQUFFQyxFQUFGLENBQUssUUFBTCxFQUFlRixPQUFPRyxLQUFQLEVBQWYsQ0FBTDtBQUFBLEtBQXZCO0FBQ0FKLE9BQUksY0FBSixFQUF1QjtBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxJQUFMLEVBQWVGLE9BQU9JLE1BQVAsQ0FBYyxNQUFkLENBQWYsQ0FBTDtBQUFBLEtBQXZCO0FBQ0FMLE9BQUksWUFBSixFQUF1QjtBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxLQUFMLEVBQWVGLE9BQU9HLEtBQVAsRUFBZixDQUFMO0FBQUEsS0FBdkI7QUFDQUosT0FBSSxjQUFKLEVBQXVCO0FBQUEsZUFBS0UsRUFBRUMsRUFBRixDQUFLLElBQUwsRUFBZUYsT0FBT0ksTUFBUCxDQUFjLE1BQWQsQ0FBZixDQUFMO0FBQUEsS0FBdkI7QUFDQUwsT0FBSSxlQUFKLEVBQXVCO0FBQUEsZUFBS0UsRUFBRUMsRUFBRixDQUFLLFFBQUwsRUFBZUYsT0FBT0csS0FBUCxFQUFmLENBQUw7QUFBQSxLQUF2QjtBQUNBSixPQUFJLGVBQUosRUFBdUI7QUFBQSxlQUFLRSxFQUFFQyxFQUFGLENBQUssS0FBTCxFQUFlRixPQUFPSSxNQUFQLENBQWMsTUFBZCxDQUFmLENBQUw7QUFBQSxLQUF2QjtBQUNBTCxPQUFJLGVBQUosRUFBdUI7QUFBQSxlQUFLRSxFQUFFQyxFQUFGLENBQUssUUFBTCxFQUFlRixPQUFPRyxLQUFQLEVBQWYsQ0FBTDtBQUFBLEtBQXZCO0FBQ0FKLE9BQUksY0FBSixFQUF1QjtBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxJQUFMLEVBQWVGLE9BQU9JLE1BQVAsQ0FBYyxNQUFkLENBQWYsQ0FBTDtBQUFBLEtBQXZCO0FBQ0FMLE9BQUksWUFBSixFQUF1QjtBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxLQUFMLEVBQWVGLE9BQU9HLEtBQVAsRUFBZixDQUFMO0FBQUEsS0FBdkI7QUFDQUosT0FBSSxjQUFKLEVBQXVCO0FBQUEsZUFBS0UsRUFBRUMsRUFBRixDQUFLLElBQUwsRUFBZUYsT0FBT0ksTUFBUCxDQUFjLE1BQWQsQ0FBZixDQUFMO0FBQUEsS0FBdkI7QUFDQUwsT0FBSSxlQUFKLEVBQXVCO0FBQUEsZUFBS0UsRUFBRUMsRUFBRixDQUFLLFFBQUwsRUFBZUYsT0FBT0csS0FBUCxFQUFmLENBQUw7QUFBQSxLQUF2QjtBQUNBSixPQUFJLGNBQUosRUFBdUI7QUFBQSxlQUFLRSxFQUFFQyxFQUFGLENBQUssSUFBTCxFQUFlRixPQUFPSSxNQUFQLENBQWMsTUFBZCxDQUFmLENBQUw7QUFBQSxLQUF2QjtBQUNBTCxPQUFJLGNBQUosRUFBdUI7QUFBQSxlQUFLRSxFQUFFQyxFQUFGLENBQUssT0FBTCxFQUFlRixPQUFPRyxLQUFQLEVBQWYsQ0FBTDtBQUFBLEtBQXZCO0FBQ0FKLE9BQUksZUFBSixFQUF1QjtBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxLQUFMLEVBQWVGLE9BQU9JLE1BQVAsQ0FBYyxNQUFkLENBQWYsQ0FBTDtBQUFBLEtBQXZCO0FBQ0FMLE9BQUksY0FBSixFQUF1QjtBQUFBLGVBQUtFLEVBQUVDLEVBQUYsQ0FBSyxPQUFMLEVBQWVGLE9BQU9HLEtBQVAsRUFBZixDQUFMO0FBQUEsS0FBdkI7QUFFSCxDQXRCRCIsImZpbGUiOiJwYXJzZSBhY3Rpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5cbmltcG9ydCB7ZGVzY3JpYmV9IGZyb20gJ2F2YS1zcGVjJztcblxuY29uc3QganNzbSA9IHJlcXVpcmUoJy4uLy4uLy4uL2J1aWxkL2pzc20uZXM1LmpzJyksXG4gICAgICBzbSAgID0ganNzbS5zbTtcblxuXG5cblxuXG5kZXNjcmliZSgnbWF0dGVyJywgYXN5bmMgaXQgPT4ge1xuXG4gICAgY29uc3QgbWF0dGVyID0gc21gIFNvbGlkICdIZWF0JyA8LT4gJ0Nvb2wnIExpcXVpZCAnSGVhdCcgPC0+ICdDb29sJyBHYXMgJ0hlYXQnIDwtPiAnQ29vbCcgUGxhc21hOyBgO1xuXG4gICAgaXQoICdzdGFydHMgU29saWQnLCAgICB0ID0+IHQuaXMoJ1NvbGlkJywgIG1hdHRlci5zdGF0ZSgpICAgICAgICApKTtcbiAgICBpdCggJ0hlYXQgaXMgdHJ1ZScsICAgIHQgPT4gdC5pcyh0cnVlLCAgICAgbWF0dGVyLmFjdGlvbignSGVhdCcpICkpO1xuICAgIGl0KCAnaXMgbm93IExpcXVpZCcsICAgdCA9PiB0LmlzKCdMaXF1aWQnLCBtYXR0ZXIuc3RhdGUoKSAgICAgICAgKSk7XG4gICAgaXQoICdIZWF0IGlzIHRydWUnLCAgICB0ID0+IHQuaXModHJ1ZSwgICAgIG1hdHRlci5hY3Rpb24oJ0hlYXQnKSApKTtcbiAgICBpdCggJ2lzIG5vdyBHYXMnLCAgICAgIHQgPT4gdC5pcygnR2FzJywgICAgbWF0dGVyLnN0YXRlKCkgICAgICAgICkpO1xuICAgIGl0KCAnSGVhdCBpcyB0cnVlJywgICAgdCA9PiB0LmlzKHRydWUsICAgICBtYXR0ZXIuYWN0aW9uKCdIZWF0JykgKSk7XG4gICAgaXQoICdpcyBub3cgUGxhc21hJywgICB0ID0+IHQuaXMoJ1BsYXNtYScsIG1hdHRlci5zdGF0ZSgpICAgICAgICApKTtcbiAgICBpdCggJ0hlYXQgaXMgZmFsc2UnLCAgIHQgPT4gdC5pcyhmYWxzZSwgICAgbWF0dGVyLmFjdGlvbignSGVhdCcpICkpO1xuICAgIGl0KCAnaXMgbm93IFBsYXNtYScsICAgdCA9PiB0LmlzKCdQbGFzbWEnLCBtYXR0ZXIuc3RhdGUoKSAgICAgICAgKSk7XG4gICAgaXQoICdDb29sIGlzIHRydWUnLCAgICB0ID0+IHQuaXModHJ1ZSwgICAgIG1hdHRlci5hY3Rpb24oJ0Nvb2wnKSApKTtcbiAgICBpdCggJ2lzIG5vdyBHYXMnLCAgICAgIHQgPT4gdC5pcygnR2FzJywgICAgbWF0dGVyLnN0YXRlKCkgICAgICAgICkpO1xuICAgIGl0KCAnQ29vbCBpcyB0cnVlJywgICAgdCA9PiB0LmlzKHRydWUsICAgICBtYXR0ZXIuYWN0aW9uKCdDb29sJykgKSk7XG4gICAgaXQoICdpcyBub3cgTGlxdWlkJywgICB0ID0+IHQuaXMoJ0xpcXVpZCcsIG1hdHRlci5zdGF0ZSgpICAgICAgICApKTtcbiAgICBpdCggJ0Nvb2wgaXMgdHJ1ZScsICAgIHQgPT4gdC5pcyh0cnVlLCAgICAgbWF0dGVyLmFjdGlvbignQ29vbCcpICkpO1xuICAgIGl0KCAnaXMgbm93IFNvbGlkJywgICAgdCA9PiB0LmlzKCdTb2xpZCcsICBtYXR0ZXIuc3RhdGUoKSAgICAgICAgKSk7XG4gICAgaXQoICdDb29sIGlzIGZhbHNlJywgICB0ID0+IHQuaXMoZmFsc2UsICAgIG1hdHRlci5hY3Rpb24oJ0Nvb2wnKSApKTtcbiAgICBpdCggJ2lzIG5vdyBTb2xpZCcsICAgIHQgPT4gdC5pcygnU29saWQnLCAgbWF0dGVyLnN0YXRlKCkgICAgICAgICkpO1xuXG59KTtcbiJdfQ==