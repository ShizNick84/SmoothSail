// =============================================================================
// AI CRYPTO TRADING AGENT - PRETTIER CONFIGURATION
// =============================================================================
// Code formatting configuration for consistent, readable code
// Optimized for financial trading system development
// =============================================================================

export default {
  // =============================================================================
  // BASIC FORMATTING
  // =============================================================================
  
  // Line length - balance readability with screen real estate
  printWidth: 100,
  
  // Indentation - 2 spaces for clean, readable code
  tabWidth: 2,
  useTabs: false,
  
  // Semicolons - always use for clarity and safety
  semi: true,
  
  // Quotes - single quotes for consistency
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // =============================================================================
  // OBJECT AND ARRAY FORMATTING
  // =============================================================================
  
  // Trailing commas - improve git diffs and reduce errors
  trailingComma: 'none',
  
  // Bracket spacing - improve readability
  bracketSpacing: true,
  bracketSameLine: false,
  
  // =============================================================================
  // FUNCTION AND ARROW FUNCTION FORMATTING
  // =============================================================================
  
  // Arrow function parentheses - consistent style
  arrowParens: 'avoid',
  
  // =============================================================================
  // LINE ENDINGS AND WHITESPACE
  // =============================================================================
  
  // Line endings - Unix style for consistency across platforms
  endOfLine: 'lf',
  
  // Whitespace handling
  insertPragma: false,
  requirePragma: false,
  
  // =============================================================================
  // FILE TYPE SPECIFIC OVERRIDES
  // =============================================================================
  
  overrides: [
    {
      // TypeScript files - strict formatting for type safety
      files: '*.ts',
      options: {
        parser: 'typescript',
        printWidth: 100,
        singleQuote: true,
        trailingComma: 'none'
      }
    },
    {
      // JSON files - standard JSON formatting
      files: '*.json',
      options: {
        parser: 'json',
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      // Configuration files - readable formatting
      files: ['*.config.js', '*.config.ts', '.eslintrc.*'],
      options: {
        printWidth: 120,
        singleQuote: true
      }
    },
    {
      // Documentation files
      files: '*.md',
      options: {
        parser: 'markdown',
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    {
      // Environment files - preserve exact formatting
      files: '.env*',
      options: {
        parser: 'sh',
        printWidth: 120
      }
    }
  ]
};

// =============================================================================
// FORMATTING NOTES
// =============================================================================
// 1. Consistent formatting improves code readability and maintainability
// 2. Automated formatting reduces time spent on style discussions
// 3. Git diffs are cleaner with consistent formatting
// 4. These settings are optimized for financial trading system development
// 5. Run 'npm run format' to apply formatting to all files
// =============================================================================