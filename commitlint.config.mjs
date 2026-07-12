/**
 *  Commitlint configuration — enforces Conventional Commits on PR commit
 *  ranges in CI (fsl#1851).  The repo has written Conventional Commits by
 *  discipline since long before this config; mechanical enforcement protects
 *  the changelog generator, which parses commit subjects.
 *
 *  Merge commits are exempt by commitlint's default ignores.  The subject
 *  and body length caps are relaxed: house commit style writes long,
 *  paragraph-rich bodies, and the default 100-char lines would reject them.
 */

export default {
  extends: ['@commitlint/config-conventional'],
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
