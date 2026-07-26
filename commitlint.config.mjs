/**
 *  Commitlint configuration — enforces Conventional Commits on PR commit
 *  ranges in CI (fsl#1851).  The repo has written Conventional Commits by
 *  discipline since long before this config; mechanical enforcement protects
 *  the changelog generator, which parses commit subjects.
 *
 *  Merge commits are exempt.  commitlint's default ignores cover git's own
 *  wording (`Merge pull request`, `Merge branch`, `Merge remote-tracking`),
 *  but a hand-titled merge written in house style — `merge: main 5.163.4 up
 *  into the 6.0.0-alpha integration line` — parses as a Conventional Commit
 *  whose type is `merge`, which is not in the enum, so it failed the very
 *  rule this config says merges are exempt from.  {@link ignores} closes that
 *  gap, so the exemption follows the intent rather than git's exact phrasing.
 *
 *  The subject and body length caps are relaxed: house commit style writes
 *  long, paragraph-rich bodies, and the default 100-char lines would reject
 *  them.
 */

export default {
  extends: ['@commitlint/config-conventional'],

  //  a hand-titled merge commit, e.g. `merge: main 5.163.4 up into …`.  Kept
  //  deliberately narrow: only the leading `merge:` token, so a real commit
  //  that merely mentions merging ("fix(git): stop merge: from …") is still
  //  linted normally.
  ignores: [ (message) => /^merge:/i.test(message) ],

  rules: {
    'body-max-line-length'   : [0],
    'footer-max-line-length' : [0],
    'header-max-length'      : [2, 'always', 140],

    //  house subjects open with proper nouns ("ESLint 10 …", "One Merge")
    //  and read as prose; the type(scope): structure is what the changelog
    //  parser needs, not case policing
    'subject-case': [0],
  },
};
