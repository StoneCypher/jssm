'use strict';

var _avaSpec = require('ava-spec');

var jssm = require('../../../../build/jssm.es5.js'),
    sm = jssm.sm;
/* eslint-disable max-len */

(0, _avaSpec.describe)('english/1', async function (_parse_it) {

  // TRANSLATORS
  // Please translate this token block.
  // When writing out symbols, please skip ' " : {}
  // After this token block is complete, the job is complete
  //
  // If your language needs tests that are missing from here, add them, and
  // please mention why in a comment or in the github issue, so that we can
  // do a better job for you later

  var testTokens = ['English', // The language's native name
  'english', // The language's name in English.  If they're the same, use a lower case letter to make them different
  'first', 'second', 'ends_with_number_10', 'middle_10_number', '10_starts_with_number', 'all_digits_0123456789', 'common_accented_letters_éÉëïöËÏÖæÆœŒß', 'common_symbols_-!@#$%^&*()?.,/[]=+#|~'];

  // TRANSLATORS
  // the job is now complete


  var foreignTarget = sm([testTokens.join(' -> ') + ';']);
  (0, _avaSpec.describe)('contains all states', async function (it) {
    testTokens.map(function (tok) {
      return it(tok, function (t) {
        return t.is(true, foreignTarget.states().includes(tok));
      });
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy90ZXN0cy9sYW5ndWFnZSBzdXBwb3J0L2VuZ2xpc2guanMiXSwibmFtZXMiOlsianNzbSIsInJlcXVpcmUiLCJzbSIsIl9wYXJzZV9pdCIsInRlc3RUb2tlbnMiLCJmb3JlaWduVGFyZ2V0Iiwiam9pbiIsIml0IiwibWFwIiwidG9rIiwidCIsImlzIiwic3RhdGVzIiwiaW5jbHVkZXMiXSwibWFwcGluZ3MiOiI7O0FBR0E7O0FBRUEsSUFBTUEsT0FBT0MsUUFBUSwrQkFBUixDQUFiO0FBQUEsSUFDTUMsS0FBT0YsS0FBS0UsRUFEbEI7QUFKQTs7QUFXQSx1QkFBUyxXQUFULEVBQXNCLGdCQUFNQyxTQUFOLEVBQW1COztBQUV2QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLE1BQU1DLGFBQWEsQ0FDakIsU0FEaUIsRUFDTTtBQUN2QixXQUZpQixFQUVNO0FBQ3ZCLFNBSGlCLEVBR1IsUUFIUSxFQUlqQixxQkFKaUIsRUFJTSxrQkFKTixFQUkwQix1QkFKMUIsRUFLakIsdUJBTGlCLEVBTWpCLHVDQU5pQixFQU9qQix1Q0FQaUIsQ0FBbkI7O0FBVUE7QUFDQTs7O0FBSUEsTUFBTUMsZ0JBQWdCSCxHQUFHLENBQUNFLFdBQVdFLElBQVgsQ0FBZ0IsTUFBaEIsSUFBMEIsR0FBM0IsQ0FBSCxDQUF0QjtBQUNBLHlCQUFTLHFCQUFULEVBQWdDLGdCQUFNQyxFQUFOLEVBQVk7QUFDMUNILGVBQVdJLEdBQVgsQ0FBZTtBQUFBLGFBQU9ELEdBQUdFLEdBQUgsRUFBUTtBQUFBLGVBQUtDLEVBQUVDLEVBQUYsQ0FBSyxJQUFMLEVBQVdOLGNBQWNPLE1BQWQsR0FBdUJDLFFBQXZCLENBQWdDSixHQUFoQyxDQUFYLENBQUw7QUFBQSxPQUFSLENBQVA7QUFBQSxLQUFmO0FBQ0QsR0FGRDtBQUlELENBL0JEIiwiZmlsZSI6ImVuZ2xpc2guanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cblxuaW1wb3J0IHtkZXNjcmliZX0gZnJvbSAnYXZhLXNwZWMnO1xuXG5jb25zdCBqc3NtID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vYnVpbGQvanNzbS5lczUuanMnKSxcbiAgICAgIHNtICAgPSBqc3NtLnNtO1xuXG5cblxuXG5cbmRlc2NyaWJlKCdlbmdsaXNoLzEnLCBhc3luYyBfcGFyc2VfaXQgPT4ge1xuXG4gIC8vIFRSQU5TTEFUT1JTXG4gIC8vIFBsZWFzZSB0cmFuc2xhdGUgdGhpcyB0b2tlbiBibG9jay5cbiAgLy8gV2hlbiB3cml0aW5nIG91dCBzeW1ib2xzLCBwbGVhc2Ugc2tpcCAnIFwiIDoge31cbiAgLy8gQWZ0ZXIgdGhpcyB0b2tlbiBibG9jayBpcyBjb21wbGV0ZSwgdGhlIGpvYiBpcyBjb21wbGV0ZVxuICAvL1xuICAvLyBJZiB5b3VyIGxhbmd1YWdlIG5lZWRzIHRlc3RzIHRoYXQgYXJlIG1pc3NpbmcgZnJvbSBoZXJlLCBhZGQgdGhlbSwgYW5kXG4gIC8vIHBsZWFzZSBtZW50aW9uIHdoeSBpbiBhIGNvbW1lbnQgb3IgaW4gdGhlIGdpdGh1YiBpc3N1ZSwgc28gdGhhdCB3ZSBjYW5cbiAgLy8gZG8gYSBiZXR0ZXIgam9iIGZvciB5b3UgbGF0ZXJcblxuICBjb25zdCB0ZXN0VG9rZW5zID0gW1xuICAgICdFbmdsaXNoJywgICAgICAgICAgICAgLy8gVGhlIGxhbmd1YWdlJ3MgbmF0aXZlIG5hbWVcbiAgICAnZW5nbGlzaCcsICAgICAgICAgICAgIC8vIFRoZSBsYW5ndWFnZSdzIG5hbWUgaW4gRW5nbGlzaC4gIElmIHRoZXkncmUgdGhlIHNhbWUsIHVzZSBhIGxvd2VyIGNhc2UgbGV0dGVyIHRvIG1ha2UgdGhlbSBkaWZmZXJlbnRcbiAgICAnZmlyc3QnLCAnc2Vjb25kJyxcbiAgICAnZW5kc193aXRoX251bWJlcl8xMCcsICdtaWRkbGVfMTBfbnVtYmVyJywgJzEwX3N0YXJ0c193aXRoX251bWJlcicsXG4gICAgJ2FsbF9kaWdpdHNfMDEyMzQ1Njc4OScsXG4gICAgJ2NvbW1vbl9hY2NlbnRlZF9sZXR0ZXJzX8Opw4nDq8Ovw7bDi8OPw5bDpsOGxZPFksOfJyxcbiAgICAnY29tbW9uX3N5bWJvbHNfLSFAIyQlXiYqKCk/LiwvW109KyN8fidcbiAgXTtcblxuICAvLyBUUkFOU0xBVE9SU1xuICAvLyB0aGUgam9iIGlzIG5vdyBjb21wbGV0ZVxuXG5cblxuICBjb25zdCBmb3JlaWduVGFyZ2V0ID0gc20oW3Rlc3RUb2tlbnMuam9pbignIC0+ICcpICsgJzsnXSk7XG4gIGRlc2NyaWJlKCdjb250YWlucyBhbGwgc3RhdGVzJywgYXN5bmMgaXQgPT4ge1xuICAgIHRlc3RUb2tlbnMubWFwKHRvayA9PiBpdCh0b2ssIHQgPT4gdC5pcyh0cnVlLCBmb3JlaWduVGFyZ2V0LnN0YXRlcygpLmluY2x1ZGVzKHRvaykpKSk7XG4gIH0pO1xuXG59KTtcblxuIl19