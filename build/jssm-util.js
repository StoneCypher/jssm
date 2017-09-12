'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLXV0aWwuanMiXSwibmFtZXMiOlsid2VpZ2h0ZWRfcmFuZF9zZWxlY3QiLCJvcHRpb25zIiwicHJvYmFiaWxpdHlfcHJvcGVydHkiLCJBcnJheSIsImlzQXJyYXkiLCJUeXBlRXJyb3IiLCJmcmFuZCIsImNhcCIsIk1hdGgiLCJyYW5kb20iLCJvcl9vbmUiLCJpdGVtIiwidW5kZWZpbmVkIiwicHJvYl9zdW0iLCJyZWR1Y2UiLCJhY2MiLCJ2YWwiLCJybmQiLCJjdXJzb3IiLCJjdXJzb3Jfc3VtIiwic2VxIiwibiIsImZpbGwiLCJtYXAiLCJfIiwiaSIsImhpc3RvZ3JhcGgiLCJhIiwic29ydCIsIm0iLCJ2Iiwic2V0IiwiaGFzIiwiZ2V0IiwiTWFwIiwid2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCIsIl9pIiwid2VpZ2h0ZWRfaGlzdG9fa2V5Iiwib3B0cyIsInByb2JfcHJvcCIsImV4dHJhY3QiLCJzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUlBLElBQU1BLHVCQUFpQyxTQUFqQ0Esb0JBQWlDLENBQUNDLE9BQUQsRUFBNEU7QUFBQSxRQUF0REMsb0JBQXNELHVFQUF2QixhQUF1Qjs7O0FBRWpILFFBQUksQ0FBQ0MsTUFBTUMsT0FBTixDQUFjSCxPQUFkLENBQUwsRUFBNkI7QUFDM0IsY0FBTSxJQUFJSSxTQUFKLENBQWMsOENBQWQsQ0FBTjtBQUNEOztBQUVELFFBQUksRUFBRSxRQUFPSixRQUFRLENBQVIsQ0FBUCxNQUFzQixRQUF4QixDQUFKLEVBQXVDO0FBQ3JDLGNBQU0sSUFBSUksU0FBSixDQUFjLDhDQUFkLENBQU47QUFDRDs7QUFFRCxRQUFNQyxRQUF3QixTQUF4QkEsS0FBd0IsQ0FBQ0MsR0FBRDtBQUFBLGVBQWlCQyxLQUFLQyxNQUFMLEtBQWdCRixHQUFqQztBQUFBLEtBQTlCO0FBQUEsUUFDTUcsU0FBd0IsU0FBeEJBLE1BQXdCLENBQUNDLElBQUQ7QUFBQSxlQUFpQkEsU0FBU0MsU0FBVCxHQUFvQixDQUFwQixHQUF3QkQsSUFBekM7QUFBQSxLQUQ5QjtBQUFBLFFBRU1FLFdBQXdCWixRQUFRYSxNQUFSLENBQWdCLFVBQUNDLEdBQUQsRUFBTUMsR0FBTjtBQUFBLGVBQTBCRCxNQUFNTCxPQUFPTSxJQUFJZCxvQkFBSixDQUFQLENBQWhDO0FBQUEsS0FBaEIsRUFBbUYsQ0FBbkYsQ0FGOUI7QUFBQSxRQUdNZSxNQUF3QlgsTUFBTU8sUUFBTixDQUg5Qjs7QUFLQSxRQUFNSyxTQUF3QixDQUE5QjtBQUFBLFFBQ01DLGFBQXdCLENBRDlCOztBQUdBLFdBQU8sQ0FBQ0EsY0FBY1QsT0FBUVQsT0FBRCxDQUFjaUIsUUFBZCxFQUF3QmhCLG9CQUF4QixDQUFQLENBQWYsS0FBeUVlLEdBQWhGLEVBQXFGLENBQUcsQ0FsQnlCLENBa0J4QjtBQUN6RixXQUFPaEIsUUFBUWlCLFNBQU8sQ0FBZixDQUFQO0FBRUQsQ0FyQkQ7QUFzQkE7O0FBTUEsSUFBTUUsTUFBZ0IsU0FBaEJBLEdBQWdCLENBQUNDLENBQUQ7QUFBQSxXQUVqQixJQUFJbEIsS0FBSixDQUFVa0IsQ0FBVixDQUFELENBQWVDLElBQWYsQ0FBb0IsSUFBcEIsRUFDZUMsR0FEZixDQUNvQixVQUFDQyxDQUFELEVBQUlDLENBQUo7QUFBQSxlQUFrQkEsQ0FBbEI7QUFBQSxLQURwQixDQUZrQjtBQUFBLENBQXRCOztBQVNBLElBQU1DLGFBQXVCLFNBQXZCQSxVQUF1QixDQUFDQyxDQUFELENBQW9COztBQUFwQjtBQUFBLFdBRXpCQSxFQUFFQyxJQUFGLEdBQVNkLE1BQVQsQ0FBaUIsVUFBQ2UsQ0FBRCxFQUFHQyxDQUFIO0FBQUEsZUFBMEJELEVBQUVFLEdBQUYsQ0FBTUQsQ0FBTixFQUFVRCxFQUFFRyxHQUFGLENBQU1GLENBQU4sSUFBVUQsRUFBRUksR0FBRixDQUFNSCxDQUFOLElBQVMsQ0FBbkIsR0FBdUIsQ0FBakMsR0FBdUNELENBQWpFO0FBQUEsS0FBakIsRUFBc0YsSUFBSUssR0FBSixFQUF0RixDQUZ5QjtBQUFBLENBQTdCLEMsQ0FFd0c7OztBQU14RyxJQUFNQyx5QkFBbUMsU0FBbkNBLHNCQUFtQyxDQUFDZCxDQUFELEVBQVlwQixPQUFaLEVBQW1DQyxvQkFBbkMsQ0FBZ0Y7O0FBQWhGO0FBQUEsV0FFckNrQixJQUFJQyxDQUFKLEVBQU9FLEdBQVAsQ0FBWSxVQUFDYSxFQUFEO0FBQUEsZUFBYXBDLHFCQUFxQkMsT0FBckIsRUFBOEJDLG9CQUE5QixDQUFiO0FBQUEsS0FBWixDQUZxQztBQUFBLENBQXpDLEMsQ0FFbUY7OztBQU1uRixJQUFNbUMscUJBQStCLFNBQS9CQSxrQkFBK0IsQ0FBQ2hCLENBQUQsRUFBWWlCLElBQVosRUFBZ0NDLFNBQWhDLEVBQW1EQyxPQUFuRCxDQUFtRjs7QUFBbkY7QUFBQSxXQUVqQ2QsV0FBV1MsdUJBQXVCZCxDQUF2QixFQUEwQmlCLElBQTFCLEVBQWdDQyxTQUFoQyxFQUEyQ2hCLEdBQTNDLENBQWdELFVBQUNrQixDQUFEO0FBQUEsZUFBWUEsRUFBRUQsT0FBRixDQUFaO0FBQUEsS0FBaEQsQ0FBWCxDQUZpQztBQUFBLENBQXJDLEMsQ0FFeUY7OztRQU1oRnBCLEcsR0FBQUEsRztRQUFLTSxVLEdBQUFBLFU7UUFBWVcsa0IsR0FBQUEsa0I7UUFBb0JyQyxvQixHQUFBQSxvQjtRQUFzQm1DLHNCLEdBQUFBLHNCIiwiZmlsZSI6Impzc20tdXRpbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gQGZsb3dcblxuLyogZXNsaW50LWRpc2FibGUgZmxvd3R5cGUvbm8td2Vhay10eXBlcyAqL1xuY29uc3Qgd2VpZ2h0ZWRfcmFuZF9zZWxlY3Q6IEZ1bmN0aW9uID0gKG9wdGlvbnM6IEFycmF5PGFueT4sIHByb2JhYmlsaXR5X3Byb3BlcnR5OiBzdHJpbmcgPSAncHJvYmFiaWxpdHknKTogYW55ID0+IHtcblxuICBpZiAoIUFycmF5LmlzQXJyYXkob3B0aW9ucykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb25zIG11c3QgYmUgYSBub24tZW1wdHkgYXJyYXkgb2Ygb2JqZWN0cycpO1xuICB9XG5cbiAgaWYgKCEodHlwZW9mIG9wdGlvbnNbMF0gPT09ICdvYmplY3QnKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbnMgbXVzdCBiZSBhIG5vbi1lbXB0eSBhcnJheSBvZiBvYmplY3RzJyk7XG4gIH1cblxuICBjb25zdCBmcmFuZCAgICAgIDogRnVuY3Rpb24gPSAoY2FwKTogbnVtYmVyID0+IE1hdGgucmFuZG9tKCkgKiBjYXAsXG4gICAgICAgIG9yX29uZSAgICAgOiBGdW5jdGlvbiA9IChpdGVtKTogYW55ICAgPT4gaXRlbSA9PT0gdW5kZWZpbmVkPyAxIDogaXRlbSxcbiAgICAgICAgcHJvYl9zdW0gICA6IG51bWJlciAgID0gb3B0aW9ucy5yZWR1Y2UoIChhY2MsIHZhbDphbnkpOiBudW1iZXIgPT4gYWNjICsgb3Jfb25lKHZhbFtwcm9iYWJpbGl0eV9wcm9wZXJ0eV0pLCAwICksXG4gICAgICAgIHJuZCAgICAgICAgOiBudW1iZXIgICA9IGZyYW5kKHByb2Jfc3VtKTtcblxuICBsZXQgICBjdXJzb3IgICAgIDogbnVtYmVyICAgPSAwLFxuICAgICAgICBjdXJzb3Jfc3VtIDogbnVtYmVyICAgPSAwO1xuXG4gIHdoaWxlICgoY3Vyc29yX3N1bSArPSBvcl9vbmUoKG9wdGlvbnM6YW55KVtjdXJzb3IrK11bcHJvYmFiaWxpdHlfcHJvcGVydHldKSkgPD0gcm5kKSB7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eSxmcC9uby1sb29wc1xuICByZXR1cm4gb3B0aW9uc1tjdXJzb3ItMV07XG5cbn07XG4vKiBlc2xpbnQtZW5hYmxlIGZsb3d0eXBlL25vLXdlYWstdHlwZXMgKi9cblxuXG5cblxuXG5jb25zdCBzZXE6IEZ1bmN0aW9uID0gKG46IG51bWJlcik6IEFycmF5PG51bWJlcj4gPT5cblxuICAgIChuZXcgQXJyYXkobikpLmZpbGwodHJ1ZSlcbiAgICAgICAgICAgICAgICAgIC5tYXAoIChfLCBpKTogbnVtYmVyID0+IGkgKTtcblxuXG5cblxuXG5jb25zdCBoaXN0b2dyYXBoOiBGdW5jdGlvbiA9IChhIDogQXJyYXk8YW55PikgPT4gLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzXG5cbiAgICBhLnNvcnQoKS5yZWR1Y2UoIChtLHYpOiBNYXA8YW55LCBhbnk+ID0+ICggbS5zZXQodiwgKG0uaGFzKHYpPyBtLmdldCh2KSsxIDogMSkpICwgbSksIG5ldyBNYXAoKSApOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmbG93dHlwZS9uby13ZWFrLXR5cGVzLG5vLXNlcXVlbmNlc1xuXG5cblxuXG5cbmNvbnN0IHdlaWdodGVkX3NhbXBsZV9zZWxlY3Q6IEZ1bmN0aW9uID0gKG46IG51bWJlciwgb3B0aW9uczogQXJyYXk8bWl4ZWQ+LCBwcm9iYWJpbGl0eV9wcm9wZXJ0eTogc3RyaW5nKTogQXJyYXk8YW55PiA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcblxuICAgIHNlcShuKS5tYXAoIChfaSk6IGFueSA9PiB3ZWlnaHRlZF9yYW5kX3NlbGVjdChvcHRpb25zLCBwcm9iYWJpbGl0eV9wcm9wZXJ0eSkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcblxuXG5cblxuXG5jb25zdCB3ZWlnaHRlZF9oaXN0b19rZXk6IEZ1bmN0aW9uID0gKG46IG51bWJlciwgb3B0czogQXJyYXk8bWl4ZWQ+LCBwcm9iX3Byb3A6IHN0cmluZywgZXh0cmFjdDogc3RyaW5nKTogQXJyYXk8YW55PiA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcblxuICAgIGhpc3RvZ3JhcGgod2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdChuLCBvcHRzLCBwcm9iX3Byb3ApLm1hcCggKHMpOiBhbnkgPT4gc1tleHRyYWN0XSkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZsb3d0eXBlL25vLXdlYWstdHlwZXNcblxuXG5cblxuXG5leHBvcnQgeyBzZXEsIGhpc3RvZ3JhcGgsIHdlaWdodGVkX2hpc3RvX2tleSwgd2VpZ2h0ZWRfcmFuZF9zZWxlY3QsIHdlaWdodGVkX3NhbXBsZV9zZWxlY3QgfTtcbiJdfQ==