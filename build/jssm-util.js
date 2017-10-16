'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

// this is explicitly about other peoples' data, so it has to be weakly typed
var weighted_rand_select = function weighted_rand_select(options) {
    var probability_property = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'probability';


    if (!Array.isArray(options)) {
        throw new TypeError('options must be a non-empty array of objects');
    }

    if (!(_typeof(options[0]) === 'object')) {
        throw new TypeError('options must be a non-empty array of objects');
    }

    var frand = function frand(cap) {
        return Math.random() * cap;
    },
        or_one = function or_one(item) {
        return item === undefined ? 1 : item;
    },
        prob_sum = options.reduce(function (acc, val) {
        return acc + or_one(val[probability_property]);
    }, 0),
        rnd = frand(prob_sum);

    var cursor = 0,
        cursor_sum = 0;

    while ((cursor_sum += or_one(options[cursor++][probability_property])) <= rnd) {} // eslint-disable-line no-empty,fp/no-loops
    return options[cursor - 1];
};
/* eslint-enable flowtype/no-weak-types */

var seq = function seq(n) {
    return new Array(n).fill(true).map(function (_, i) {
        return i;
    });
};

var histograph = function histograph(a // eslint-disable-line flowtype/no-weak-types

) {
    return a.sort().reduce(function (m, v) {
        return m.set(v, m.has(v) ? m.get(v) + 1 : 1), m;
    }, new Map());
}; // eslint-disable-line flowtype/no-weak-types,no-sequences


var weighted_sample_select = function weighted_sample_select(n, options, probability_property // eslint-disable-line flowtype/no-weak-types

) {
    return seq(n).map(function (_i) {
        return weighted_rand_select(options, probability_property);
    });
}; // eslint-disable-line flowtype/no-weak-types


var weighted_histo_key = function weighted_histo_key(n, opts, prob_prop, extract // eslint-disable-line flowtype/no-weak-types

) {
    return histograph(weighted_sample_select(n, opts, prob_prop).map(function (s) {
        return s[extract];
    }));
}; // eslint-disable-line flowtype/no-weak-types


exports.seq = seq;
exports.histograph = histograph;
exports.weighted_histo_key = weighted_histo_key;
exports.weighted_rand_select = weighted_rand_select;
exports.weighted_sample_select = weighted_sample_select;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLXV0aWwuanMiXSwibmFtZXMiOlsid2VpZ2h0ZWRfcmFuZF9zZWxlY3QiLCJvcHRpb25zIiwicHJvYmFiaWxpdHlfcHJvcGVydHkiLCJBcnJheSIsImlzQXJyYXkiLCJUeXBlRXJyb3IiLCJmcmFuZCIsImNhcCIsIk1hdGgiLCJyYW5kb20iLCJvcl9vbmUiLCJpdGVtIiwidW5kZWZpbmVkIiwicHJvYl9zdW0iLCJyZWR1Y2UiLCJhY2MiLCJ2YWwiLCJybmQiLCJjdXJzb3IiLCJjdXJzb3Jfc3VtIiwic2VxIiwibiIsImZpbGwiLCJtYXAiLCJfIiwiaSIsImhpc3RvZ3JhcGgiLCJhIiwic29ydCIsIm0iLCJ2Iiwic2V0IiwiaGFzIiwiZ2V0IiwiTWFwIiwid2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCIsIl9pIiwid2VpZ2h0ZWRfaGlzdG9fa2V5Iiwib3B0cyIsInByb2JfcHJvcCIsImV4dHJhY3QiLCJzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQU9BO0FBRUEsSUFBTUEsdUJBQWlDLFNBQWpDQSxvQkFBaUMsQ0FBQ0MsT0FBRCxFQUE0RTtBQUFBLFFBQXREQyxvQkFBc0QsdUVBQXZCLGFBQXVCOzs7QUFFakgsUUFBSSxDQUFDQyxNQUFNQyxPQUFOLENBQWNILE9BQWQsQ0FBTCxFQUE2QjtBQUMzQixjQUFNLElBQUlJLFNBQUosQ0FBYyw4Q0FBZCxDQUFOO0FBQ0Q7O0FBRUQsUUFBSSxFQUFFLFFBQU9KLFFBQVEsQ0FBUixDQUFQLE1BQXNCLFFBQXhCLENBQUosRUFBdUM7QUFDckMsY0FBTSxJQUFJSSxTQUFKLENBQWMsOENBQWQsQ0FBTjtBQUNEOztBQUVELFFBQU1DLFFBQXdCLFNBQXhCQSxLQUF3QixDQUFDQyxHQUFEO0FBQUEsZUFBaUJDLEtBQUtDLE1BQUwsS0FBZ0JGLEdBQWpDO0FBQUEsS0FBOUI7QUFBQSxRQUNNRyxTQUF3QixTQUF4QkEsTUFBd0IsQ0FBQ0MsSUFBRDtBQUFBLGVBQWlCQSxTQUFTQyxTQUFULEdBQW9CLENBQXBCLEdBQXdCRCxJQUF6QztBQUFBLEtBRDlCO0FBQUEsUUFFTUUsV0FBd0JaLFFBQVFhLE1BQVIsQ0FBZ0IsVUFBQ0MsR0FBRCxFQUFNQyxHQUFOO0FBQUEsZUFBMEJELE1BQU1MLE9BQU9NLElBQUlkLG9CQUFKLENBQVAsQ0FBaEM7QUFBQSxLQUFoQixFQUFtRixDQUFuRixDQUY5QjtBQUFBLFFBR01lLE1BQXdCWCxNQUFNTyxRQUFOLENBSDlCOztBQUtBLFFBQU1LLFNBQXdCLENBQTlCO0FBQUEsUUFDTUMsYUFBd0IsQ0FEOUI7O0FBR0EsV0FBTyxDQUFDQSxjQUFjVCxPQUFRVCxPQUFELENBQWNpQixRQUFkLEVBQXdCaEIsb0JBQXhCLENBQVAsQ0FBZixLQUF5RWUsR0FBaEYsRUFBcUYsQ0FBRyxDQWxCeUIsQ0FrQnhCO0FBQ3pGLFdBQU9oQixRQUFRaUIsU0FBTyxDQUFmLENBQVA7QUFFRCxDQXJCRDtBQXNCQTs7QUFNQSxJQUFNRSxNQUFnQixTQUFoQkEsR0FBZ0IsQ0FBQ0MsQ0FBRDtBQUFBLFdBRWpCLElBQUlsQixLQUFKLENBQVVrQixDQUFWLENBQUQsQ0FBZUMsSUFBZixDQUFvQixJQUFwQixFQUNlQyxHQURmLENBQ29CLFVBQUNDLENBQUQsRUFBSUMsQ0FBSjtBQUFBLGVBQWtCQSxDQUFsQjtBQUFBLEtBRHBCLENBRmtCO0FBQUEsQ0FBdEI7O0FBU0EsSUFBTUMsYUFBdUIsU0FBdkJBLFVBQXVCLENBQUNDLENBQUQsQ0FBc0M7O0FBQXRDO0FBQUEsV0FFekJBLEVBQUVDLElBQUYsR0FBU2QsTUFBVCxDQUFpQixVQUFDZSxDQUFELEVBQUdDLENBQUg7QUFBQSxlQUEwQkQsRUFBRUUsR0FBRixDQUFNRCxDQUFOLEVBQVVELEVBQUVHLEdBQUYsQ0FBTUYsQ0FBTixJQUFVRCxFQUFFSSxHQUFGLENBQU1ILENBQU4sSUFBUyxDQUFuQixHQUF1QixDQUFqQyxHQUF1Q0QsQ0FBakU7QUFBQSxLQUFqQixFQUFzRixJQUFJSyxHQUFKLEVBQXRGLENBRnlCO0FBQUEsQ0FBN0IsQyxDQUV3Rzs7O0FBTXhHLElBQU1DLHlCQUFtQyxTQUFuQ0Esc0JBQW1DLENBQUNkLENBQUQsRUFBWXBCLE9BQVosRUFBbUNDLG9CQUFuQyxDQUFnRjs7QUFBaEY7QUFBQSxXQUVyQ2tCLElBQUlDLENBQUosRUFBT0UsR0FBUCxDQUFZLFVBQUNhLEVBQUQ7QUFBQSxlQUFhcEMscUJBQXFCQyxPQUFyQixFQUE4QkMsb0JBQTlCLENBQWI7QUFBQSxLQUFaLENBRnFDO0FBQUEsQ0FBekMsQyxDQUVtRjs7O0FBTW5GLElBQU1tQyxxQkFBK0IsU0FBL0JBLGtCQUErQixDQUFDaEIsQ0FBRCxFQUFZaUIsSUFBWixFQUFnQ0MsU0FBaEMsRUFBbURDLE9BQW5ELENBQW1GOztBQUFuRjtBQUFBLFdBRWpDZCxXQUFXUyx1QkFBdUJkLENBQXZCLEVBQTBCaUIsSUFBMUIsRUFBZ0NDLFNBQWhDLEVBQTJDaEIsR0FBM0MsQ0FBZ0QsVUFBQ2tCLENBQUQ7QUFBQSxlQUFZQSxFQUFFRCxPQUFGLENBQVo7QUFBQSxLQUFoRCxDQUFYLENBRmlDO0FBQUEsQ0FBckMsQyxDQUV5Rjs7O1FBTWhGcEIsRyxHQUFBQSxHO1FBQUtNLFUsR0FBQUEsVTtRQUFZVyxrQixHQUFBQSxrQjtRQUFvQnJDLG9CLEdBQUFBLG9CO1FBQXNCbUMsc0IsR0FBQUEsc0IiLCJmaWxlIjoianNzbS11dGlsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyBAZmxvd1xuXG5cblxuXG5cbi8vIHRoaXMgaXMgZXhwbGljaXRseSBhYm91dCBvdGhlciBwZW9wbGVzJyBkYXRhLCBzbyBpdCBoYXMgdG8gYmUgd2Vha2x5IHR5cGVkXG4vKiBlc2xpbnQtZGlzYWJsZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzICovXG5jb25zdCB3ZWlnaHRlZF9yYW5kX3NlbGVjdDogRnVuY3Rpb24gPSAob3B0aW9uczogQXJyYXk8YW55PiwgcHJvYmFiaWxpdHlfcHJvcGVydHk6IHN0cmluZyA9ICdwcm9iYWJpbGl0eScpOiBhbnkgPT4ge1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShvcHRpb25zKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbnMgbXVzdCBiZSBhIG5vbi1lbXB0eSBhcnJheSBvZiBvYmplY3RzJyk7XG4gIH1cblxuICBpZiAoISh0eXBlb2Ygb3B0aW9uc1swXSA9PT0gJ29iamVjdCcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9ucyBtdXN0IGJlIGEgbm9uLWVtcHR5IGFycmF5IG9mIG9iamVjdHMnKTtcbiAgfVxuXG4gIGNvbnN0IGZyYW5kICAgICAgOiBGdW5jdGlvbiA9IChjYXApOiBudW1iZXIgPT4gTWF0aC5yYW5kb20oKSAqIGNhcCxcbiAgICAgICAgb3Jfb25lICAgICA6IEZ1bmN0aW9uID0gKGl0ZW0pOiBhbnkgICA9PiBpdGVtID09PSB1bmRlZmluZWQ/IDEgOiBpdGVtLFxuICAgICAgICBwcm9iX3N1bSAgIDogbnVtYmVyICAgPSBvcHRpb25zLnJlZHVjZSggKGFjYywgdmFsOmFueSk6IG51bWJlciA9PiBhY2MgKyBvcl9vbmUodmFsW3Byb2JhYmlsaXR5X3Byb3BlcnR5XSksIDAgKSxcbiAgICAgICAgcm5kICAgICAgICA6IG51bWJlciAgID0gZnJhbmQocHJvYl9zdW0pO1xuXG4gIGxldCAgIGN1cnNvciAgICAgOiBudW1iZXIgICA9IDAsXG4gICAgICAgIGN1cnNvcl9zdW0gOiBudW1iZXIgICA9IDA7XG5cbiAgd2hpbGUgKChjdXJzb3Jfc3VtICs9IG9yX29uZSgob3B0aW9uczphbnkpW2N1cnNvcisrXVtwcm9iYWJpbGl0eV9wcm9wZXJ0eV0pKSA8PSBybmQpIHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5LGZwL25vLWxvb3BzXG4gIHJldHVybiBvcHRpb25zW2N1cnNvci0xXTtcblxufTtcbi8qIGVzbGludC1lbmFibGUgZmxvd3R5cGUvbm8td2Vhay10eXBlcyAqL1xuXG5cblxuXG5cbmNvbnN0IHNlcTogRnVuY3Rpb24gPSAobjogbnVtYmVyKTogQXJyYXk8bnVtYmVyPiA9PlxuXG4gICAgKG5ldyBBcnJheShuKSkuZmlsbCh0cnVlKVxuICAgICAgICAgICAgICAgICAgLm1hcCggKF8sIGkpOiBudW1iZXIgPT4gaSApO1xuXG5cblxuXG5cbmNvbnN0IGhpc3RvZ3JhcGg6IEZ1bmN0aW9uID0gKGEgOiBBcnJheTxhbnk+KTogTWFwPGFueSwgbnVtYmVyPiA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcblxuICAgIGEuc29ydCgpLnJlZHVjZSggKG0sdik6IE1hcDxhbnksIGFueT4gPT4gKCBtLnNldCh2LCAobS5oYXModik/IG0uZ2V0KHYpKzEgOiAxKSkgLCBtKSwgbmV3IE1hcCgpICk7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXMsbm8tc2VxdWVuY2VzXG5cblxuXG5cblxuY29uc3Qgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdDogRnVuY3Rpb24gPSAobjogbnVtYmVyLCBvcHRpb25zOiBBcnJheTxtaXhlZD4sIHByb2JhYmlsaXR5X3Byb3BlcnR5OiBzdHJpbmcpOiBBcnJheTxhbnk+ID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuXG4gICAgc2VxKG4pLm1hcCggKF9pKTogYW55ID0+IHdlaWdodGVkX3JhbmRfc2VsZWN0KG9wdGlvbnMsIHByb2JhYmlsaXR5X3Byb3BlcnR5KSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuXG5cblxuXG5cbmNvbnN0IHdlaWdodGVkX2hpc3RvX2tleTogRnVuY3Rpb24gPSAobjogbnVtYmVyLCBvcHRzOiBBcnJheTxtaXhlZD4sIHByb2JfcHJvcDogc3RyaW5nLCBleHRyYWN0OiBzdHJpbmcpOiBBcnJheTxhbnk+ID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuXG4gICAgaGlzdG9ncmFwaCh3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0KG4sIG9wdHMsIHByb2JfcHJvcCkubWFwKCAocyk6IGFueSA9PiBzW2V4dHJhY3RdKSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZmxvd3R5cGUvbm8td2Vhay10eXBlc1xuXG5cblxuXG5cbmV4cG9ydCB7IHNlcSwgaGlzdG9ncmFwaCwgd2VpZ2h0ZWRfaGlzdG9fa2V5LCB3ZWlnaHRlZF9yYW5kX3NlbGVjdCwgd2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCB9O1xuIl19