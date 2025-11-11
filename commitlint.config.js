/**
 * Commitlint Configuration
 * Enforces conventional commit message format
 *
 * Format: <type>(<scope>): <subject>
 * Example: feat(auth): add user login functionality
 *
 * Docs: https://commitlint.js.org/
 */

export default {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Type enum - allowed commit types
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation changes
        'style', // Code style changes (formatting, semicolons, etc)
        'refactor', // Code refactoring (neither fixes bug nor adds feature)
        'perf', // Performance improvements
        'test', // Adding or updating tests
        'chore', // Maintenance tasks (deps, configs, etc)
        'ci', // CI/CD changes
        'build', // Build system changes
        'revert', // Revert previous commit
      ],
    ],

    // Subject case - enforce lowercase
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],

    // Subject empty - subject is required
    'subject-empty': [2, 'never'],

    // Subject full stop - no period at end
    'subject-full-stop': [2, 'never', '.'],

    // Type case - enforce lowercase
    'type-case': [2, 'always', 'lower-case'],

    // Type empty - type is required
    'type-empty': [2, 'never'],

    // Scope case - enforce lowercase (when scope is used)
    'scope-case': [2, 'always', 'lower-case'],

    // Header max length - 100 characters
    'header-max-length': [2, 'always', 100],

    // Body leading blank - require blank line before body
    'body-leading-blank': [1, 'always'],

    // Footer leading blank - require blank line before footer
    'footer-leading-blank': [1, 'always'],
  },
};
