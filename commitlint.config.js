export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'perf', 'ci'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'core',
        'react',
        'devtools',
        'types',
        'scope',
        'task',
        'worker',
        'handler',
        'stream',
        'scheduler',
        'authority',
        'api',
        'deps',
        'release',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
}
