// =============================================================================
// AI CRYPTO TRADING AGENT - ESLINT CONFIGURATION
// =============================================================================
// Security-focused linting configuration for financial trading system
// Enforces strict code quality and security best practices
// =============================================================================

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      // =============================================================================
      // SECURITY RULES - CRITICAL FOR FINANCIAL SYSTEM
      // =============================================================================
      
      // Prevent potential security vulnerabilities
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      
      // Prevent dangerous global usage
      'no-global-assign': 'error',
      'no-implicit-globals': 'error',
      
      // Prevent prototype pollution
      'no-proto': 'error',
      'no-extend-native': 'error',
      
      // =============================================================================
      // TYPESCRIPT SPECIFIC RULES
      // =============================================================================
      
      // Type safety - critical for trading calculations
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      
      // Strict null checks - prevent runtime errors
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-non-null-assertion': 'error',
      
      // Function and variable declarations
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      
      // =============================================================================
      // CODE QUALITY RULES
      // =============================================================================
      
      // Complexity management
      'complexity': ['error', { max: 15 }],
      'max-depth': ['error', 4],
      'max-lines-per-function': ['error', { max: 100 }],
      'max-params': ['error', 5],
      
      // Error handling
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      
      // Best practices
      'no-console': 'warn', // Use proper logging instead
      'no-debugger': 'error',
      'no-alert': 'error',
      
      // =============================================================================
      // FINANCIAL CALCULATION SAFETY
      // =============================================================================
      
      // Prevent floating point precision issues
      'no-floating-decimal': 'error',
      'no-implicit-coercion': 'error',
      
      // Ensure proper comparisons
      'eqeqeq': ['error', 'always'],
      'no-eq-null': 'error',
      
      // =============================================================================
      // ASYNC/AWAIT SAFETY
      // =============================================================================
      
      // Proper async handling - critical for API calls
      'require-await': 'error',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'prefer-promise-reject-errors': 'error',
      
      // =============================================================================
      // VARIABLE AND SCOPE MANAGEMENT
      // =============================================================================
      
      // Prevent variable shadowing and confusion
      'no-shadow': 'error',
      'no-undef': 'error',
      'no-unused-vars': 'off', // Handled by TypeScript
      'no-use-before-define': 'error',
      
      // Const correctness
      'prefer-const': 'error',
      'no-var': 'error',
      
      // =============================================================================
      // IMPORT/EXPORT RULES
      // =============================================================================
      
      // Module system safety
      'no-duplicate-imports': 'error',
      'sort-imports': ['error', {
        'ignoreCase': true,
        'ignoreDeclarationSort': true
      }],
      
      // =============================================================================
      // FORMATTING AND STYLE
      // =============================================================================
      
      // Consistent formatting
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      
      // Spacing
      'space-before-function-paren': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      
      // =============================================================================
      // DOCUMENTATION REQUIREMENTS
      // =============================================================================
      
      // Require JSDoc for public APIs
      'valid-jsdoc': ['error', {
        'requireReturn': true,
        'requireReturnDescription': true,
        'requireParamDescription': true
      }]
    }
  },
  {
    // Test files have slightly relaxed rules
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'max-lines-per-function': 'off',
      'complexity': 'off'
    }
  },
  {
    // Configuration files
    files: ['*.config.js', '*.config.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off'
    }
  }
];

// =============================================================================
// SECURITY NOTES
// =============================================================================
// 1. These rules are designed to prevent common security vulnerabilities
// 2. Pay special attention to rules marked as 'error' - they must not be ignored
// 3. Regularly update ESLint and security-related plugins
// 4. Consider using additional security linting tools like eslint-plugin-security
// 5. Review and audit any rule exceptions carefully
// =============================================================================