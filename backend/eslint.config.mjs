import jsdoc from 'eslint-plugin-jsdoc';
import noSecrets from 'eslint-plugin-no-secrets';
import pluginSecurity from 'eslint-plugin-security';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  jsdoc.configs['flat/recommended'],
  pluginSecurity.configs.recommended,
  {
    ignores: [
      '**/*.json',
      '**/*.sh',
      '**/*.production',
      '**/Dockerfile',
      '**/*.sql',
      '**/*.prisma',
      '**/*.toml',
      '**/test/**',
      '**/tests/**',
      '**/seed.ts',
      'eslint.config.mjs',
    ],
  },
  ...compat.extends(
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ),
  {
    plugins: {
      jsdoc,
      '@typescript-eslint': typescriptEslint,
      'no-secrets': noSecrets,
    },

    languageOptions: {
      globals: {
        ...globals.browaser,
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'commonjs',

      parserOptions: {
        project: './tsconfig.eslint.json',
        sourceTypo: 'module',
        tsconfigRootDir: __dirname,
        projectService: {
          defaultProject: './tsconfig.eslint.json',
        },
      },
    },

    rules: {
      'no-secrets/no-secrets': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
          },
        },
      ],

      'jsdoc/check-alignment': 'error',
      'jsdoc/check-indentation': 'error',
      'jsdoc/newline-after-description': 'off',
      'jsdoc/require-asterisk-prefix': ['error', 'always'],
      'jsdoc/empty-tags': 'error',
      'jsdoc/require-param-type': 'error',

      'id-denylist': [
        'error',
        'any',
        'Number',
        'String',
        'Boolean',
        'Undefined',
        'Null',
      ],

      '@typescript-eslint/typedef': 'off',
      '@typescript-eslint/unified-signatures': 'error',
      '@typescript-eslint/adjacent-overload-signatures': 'error',

      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'array',
        },
      ],

      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            Object: {
              message: 'Avoid using the `Object` type. Did you mean `object`?',
              fixWith: 'object',
            },

            Function: {
              message:
                'Avoid using the `Function` type. Prefer a specific function type, like `() => void`.',
              fixWith: 'function',
            },

            Boolean: {
              message:
                'Avoid using the `Boolean` type. Did you mean `boolean`?',
              fixWith: 'boolean',
            },

            Number: {
              message: 'Avoid using the `Number` type. Did you mean `number`?',
              fixWith: 'number',
            },

            String: {
              message: 'Avoid using the `String` type. Did you mean `string`?',
              fixWith: 'string',
            },

            Symbol: {
              message: 'Avoid using the `Symbol` type. Did you mean `symbol`?',
              fixWith: 'symbol',
            },
          },
        },
      ],

      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'forbid',
        },
      ],

      '@typescript-eslint/promise-function-async': [
        'error',
        { allowAny: false },
      ],
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': ['warn'],

      '@typescript-eslint/restrict-template-expressions': [
        'off',
        {
          allowBoolean: true,
        },
      ],

      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-parameter-properties': 'off',

      '@typescript-eslint/no-shadow': [
        'error',
        {
          hoist: 'all',
        },
      ],

      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-unused-expressions': 'error',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/prefer-namespace-keyword': 'error',

      '@typescript-eslint/triple-slash-reference': [
        'error',
        {
          path: 'always',
          types: 'prefer-import',
          lib: 'always',
        },
      ],

      'func-style': ['error', 'declaration', { allowArrowFunctions: false }],
      'require-await': 'off',
      'no-empty-function': 'off',
    },
  },
];
