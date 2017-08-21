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

    while ((cursor_sum += or_one(options[cursor++][probability_property])) <= rnd) {}
    return options[cursor - 1];
};

var seq = function seq(n) {
    return new Array(n).fill(true).map(function (_, i) {
        return i;
    });
};

var histograph = function histograph(a) {
    return a.sort().reduce(function (m, v) {
        return m.set(v, m.has(v) ? m.get(v) + 1 : 1), m;
    }, new Map());
};

var weighted_sample_select = function weighted_sample_select(n, options, probability_property) {
    return seq(n).map(function (i) {
        return weighted_rand_select(options, probability_property);
    });
};

var weighted_histo_key = function weighted_histo_key(n, options, probability_property, extract) {
    return histograph(weighted_sample_select(n, options, probability_property).map(function (s) {
        return s[extract];
    }));
};

exports.seq = seq;
exports.histograph = histograph;
exports.weighted_histo_key = weighted_histo_key;
exports.weighted_rand_select = weighted_rand_select;
exports.weighted_sample_select = weighted_sample_select;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9qcy9qc3NtLXV0aWwuanMiXSwibmFtZXMiOlsid2VpZ2h0ZWRfcmFuZF9zZWxlY3QiLCJvcHRpb25zIiwicHJvYmFiaWxpdHlfcHJvcGVydHkiLCJBcnJheSIsImlzQXJyYXkiLCJUeXBlRXJyb3IiLCJmcmFuZCIsIk1hdGgiLCJyYW5kb20iLCJjYXAiLCJvcl9vbmUiLCJpdGVtIiwidW5kZWZpbmVkIiwicHJvYl9zdW0iLCJyZWR1Y2UiLCJhY2MiLCJ2YWwiLCJybmQiLCJjdXJzb3IiLCJjdXJzb3Jfc3VtIiwic2VxIiwibiIsImZpbGwiLCJtYXAiLCJfIiwiaSIsImhpc3RvZ3JhcGgiLCJhIiwic29ydCIsIm0iLCJ2Iiwic2V0IiwiaGFzIiwiZ2V0IiwiTWFwIiwid2VpZ2h0ZWRfc2FtcGxlX3NlbGVjdCIsIndlaWdodGVkX2hpc3RvX2tleSIsImV4dHJhY3QiLCJzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUNBLElBQU1BLHVCQUF1QixTQUF2QkEsb0JBQXVCLENBQUNDLE9BQUQsRUFBeUU7QUFBQSxRQUFsREMsb0JBQWtELHVFQUFsQixhQUFrQjs7O0FBRXBHLFFBQUksQ0FBQ0MsTUFBTUMsT0FBTixDQUFjSCxPQUFkLENBQUwsRUFBNkI7QUFDM0IsY0FBTSxJQUFJSSxTQUFKLENBQWMsOENBQWQsQ0FBTjtBQUNEOztBQUVELFFBQUksRUFBRSxRQUFPSixRQUFRLENBQVIsQ0FBUCxNQUFzQixRQUF4QixDQUFKLEVBQXVDO0FBQ3JDLGNBQU0sSUFBSUksU0FBSixDQUFjLDhDQUFkLENBQU47QUFDRDs7QUFFRCxRQUFNQyxRQUFhLFNBQWJBLEtBQWE7QUFBQSxlQUFPQyxLQUFLQyxNQUFMLEtBQWdCQyxHQUF2QjtBQUFBLEtBQW5CO0FBQUEsUUFDTUMsU0FBYSxTQUFiQSxNQUFhO0FBQUEsZUFBUUMsU0FBU0MsU0FBVCxHQUFvQixDQUFwQixHQUF3QkQsSUFBaEM7QUFBQSxLQURuQjtBQUFBLFFBRU1FLFdBQWFaLFFBQVFhLE1BQVIsQ0FBZ0IsVUFBQ0MsR0FBRCxFQUFNQyxHQUFOO0FBQUEsZUFBa0JELE1BQU1MLE9BQU9NLElBQUlkLG9CQUFKLENBQVAsQ0FBeEI7QUFBQSxLQUFoQixFQUEyRSxDQUEzRSxDQUZuQjtBQUFBLFFBR01lLE1BQWFYLE1BQU1PLFFBQU4sQ0FIbkI7O0FBS0EsUUFBTUssU0FBYSxDQUFuQjtBQUFBLFFBQ01DLGFBQWEsQ0FEbkI7O0FBR0EsV0FBTyxDQUFDQSxjQUFjVCxPQUFRVCxPQUFELENBQWNpQixRQUFkLEVBQXdCaEIsb0JBQXhCLENBQVAsQ0FBZixLQUF5RWUsR0FBaEYsRUFBcUYsQ0FBRztBQUN4RixXQUFPaEIsUUFBUWlCLFNBQU8sQ0FBZixDQUFQO0FBRUQsQ0FyQkQ7O0FBMkJBLElBQU1FLE1BQU0sU0FBTkEsR0FBTSxDQUFDQyxDQUFEO0FBQUEsV0FFUCxJQUFJbEIsS0FBSixDQUFVa0IsQ0FBVixDQUFELENBQWVDLElBQWYsQ0FBb0IsSUFBcEIsRUFBMEJDLEdBQTFCLENBQStCLFVBQUNDLENBQUQsRUFBR0MsQ0FBSDtBQUFBLGVBQVNBLENBQVQ7QUFBQSxLQUEvQixDQUZRO0FBQUEsQ0FBWjs7QUFRQSxJQUFNQyxhQUFhLFNBQWJBLFVBQWEsQ0FBQ0MsQ0FBRDtBQUFBLFdBRWZBLEVBQUVDLElBQUYsR0FBU2QsTUFBVCxDQUFpQixVQUFDZSxDQUFELEVBQUdDLENBQUg7QUFBQSxlQUFXRCxFQUFFRSxHQUFGLENBQU1ELENBQU4sRUFBVUQsRUFBRUcsR0FBRixDQUFNRixDQUFOLElBQVVELEVBQUVJLEdBQUYsQ0FBTUgsQ0FBTixJQUFTLENBQW5CLEdBQXVCLENBQWpDLEdBQXVDRCxDQUFsRDtBQUFBLEtBQWpCLEVBQXVFLElBQUlLLEdBQUosRUFBdkUsQ0FGZTtBQUFBLENBQW5COztBQVFBLElBQU1DLHlCQUF5QixTQUF6QkEsc0JBQXlCLENBQUNkLENBQUQsRUFBYXBCLE9BQWIsRUFBcUNDLG9CQUFyQztBQUFBLFdBRTNCa0IsSUFBSUMsQ0FBSixFQUFPRSxHQUFQLENBQVc7QUFBQSxlQUFLdkIscUJBQXFCQyxPQUFyQixFQUE4QkMsb0JBQTlCLENBQUw7QUFBQSxLQUFYLENBRjJCO0FBQUEsQ0FBL0I7O0FBUUEsSUFBTWtDLHFCQUFxQixTQUFyQkEsa0JBQXFCLENBQUNmLENBQUQsRUFBYXBCLE9BQWIsRUFBcUNDLG9CQUFyQyxFQUFvRW1DLE9BQXBFO0FBQUEsV0FFdkJYLFdBQVdTLHVCQUF1QmQsQ0FBdkIsRUFBMEJwQixPQUExQixFQUFtQ0Msb0JBQW5DLEVBQXlEcUIsR0FBekQsQ0FBOEQsVUFBQ2UsQ0FBRDtBQUFBLGVBQVdBLEVBQUVELE9BQUYsQ0FBWDtBQUFBLEtBQTlELENBQVgsQ0FGdUI7QUFBQSxDQUEzQjs7UUFRU2pCLEcsR0FBQUEsRztRQUFLTSxVLEdBQUFBLFU7UUFBWVUsa0IsR0FBQUEsa0I7UUFBb0JwQyxvQixHQUFBQSxvQjtRQUFzQm1DLHNCLEdBQUFBLHNCIiwiZmlsZSI6Impzc20tdXRpbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuY29uc3Qgd2VpZ2h0ZWRfcmFuZF9zZWxlY3QgPSAob3B0aW9ucyA6IEFycmF5PGFueT4sIHByb2JhYmlsaXR5X3Byb3BlcnR5IDogc3RyaW5nID0gJ3Byb2JhYmlsaXR5JykgPT4ge1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShvcHRpb25zKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbnMgbXVzdCBiZSBhIG5vbi1lbXB0eSBhcnJheSBvZiBvYmplY3RzJyk7XG4gIH1cblxuICBpZiAoISh0eXBlb2Ygb3B0aW9uc1swXSA9PT0gJ29iamVjdCcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9ucyBtdXN0IGJlIGEgbm9uLWVtcHR5IGFycmF5IG9mIG9iamVjdHMnKTtcbiAgfVxuXG4gIGNvbnN0IGZyYW5kICAgICAgPSBjYXAgPT4gTWF0aC5yYW5kb20oKSAqIGNhcCxcbiAgICAgICAgb3Jfb25lICAgICA9IGl0ZW0gPT4gaXRlbSA9PT0gdW5kZWZpbmVkPyAxIDogaXRlbSxcbiAgICAgICAgcHJvYl9zdW0gICA9IG9wdGlvbnMucmVkdWNlKCAoYWNjLCB2YWw6YW55KSA9PiBhY2MgKyBvcl9vbmUodmFsW3Byb2JhYmlsaXR5X3Byb3BlcnR5XSksIDAgKSxcbiAgICAgICAgcm5kICAgICAgICA9IGZyYW5kKHByb2Jfc3VtKTtcblxuICB2YXIgICBjdXJzb3IgICAgID0gMCxcbiAgICAgICAgY3Vyc29yX3N1bSA9IDA7XG5cbiAgd2hpbGUgKChjdXJzb3Jfc3VtICs9IG9yX29uZSgob3B0aW9uczphbnkpW2N1cnNvcisrXVtwcm9iYWJpbGl0eV9wcm9wZXJ0eV0pKSA8PSBybmQpIHsgfVxuICByZXR1cm4gb3B0aW9uc1tjdXJzb3ItMV07XG5cbn07XG5cblxuXG5cblxuY29uc3Qgc2VxID0gKG4gOiBudW1iZXIpID0+XG5cbiAgICAobmV3IEFycmF5KG4pKS5maWxsKHRydWUpLm1hcCggKF8saSkgPT4gaSApO1xuXG5cblxuXG5cbmNvbnN0IGhpc3RvZ3JhcGggPSAoYSA6IEFycmF5PGFueT4pID0+XG5cbiAgICBhLnNvcnQoKS5yZWR1Y2UoIChtLHYpID0+ICggbS5zZXQodiwgKG0uaGFzKHYpPyBtLmdldCh2KSsxIDogMSkpICwgbSksIG5ldyBNYXAoKSApO1xuXG5cblxuXG5cbmNvbnN0IHdlaWdodGVkX3NhbXBsZV9zZWxlY3QgPSAobiA6IG51bWJlciwgb3B0aW9ucyA6IEFycmF5PG1peGVkPiwgcHJvYmFiaWxpdHlfcHJvcGVydHkgOiBzdHJpbmcpID0+XG5cbiAgICBzZXEobikubWFwKGkgPT4gd2VpZ2h0ZWRfcmFuZF9zZWxlY3Qob3B0aW9ucywgcHJvYmFiaWxpdHlfcHJvcGVydHkpKTtcblxuXG5cblxuXG5jb25zdCB3ZWlnaHRlZF9oaXN0b19rZXkgPSAobiA6IG51bWJlciwgb3B0aW9ucyA6IEFycmF5PG1peGVkPiwgcHJvYmFiaWxpdHlfcHJvcGVydHkgOiBzdHJpbmcsIGV4dHJhY3QgOiBzdHJpbmcpID0+XG5cbiAgICBoaXN0b2dyYXBoKHdlaWdodGVkX3NhbXBsZV9zZWxlY3Qobiwgb3B0aW9ucywgcHJvYmFiaWxpdHlfcHJvcGVydHkpLm1hcCggKHM6YW55KSA9PiBzW2V4dHJhY3RdKSk7XG5cblxuXG5cblxuZXhwb3J0IHsgc2VxLCBoaXN0b2dyYXBoLCB3ZWlnaHRlZF9oaXN0b19rZXksIHdlaWdodGVkX3JhbmRfc2VsZWN0LCB3ZWlnaHRlZF9zYW1wbGVfc2VsZWN0IH07XG4iXX0=