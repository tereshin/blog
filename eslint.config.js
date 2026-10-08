import js from '@eslint/js'
import boundaries from 'eslint-plugin-boundaries'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Слои FSD: app → pages → widgets → features → entities → shared.
// Слой импортирует только нижележащие; slice не импортирует соседний slice того же слоя.
const FSD_LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared']
const WEB_SRC = 'apps/web/src'

const layer_elements = FSD_LAYERS.map((layer) =>
  layer === 'app' || layer === 'shared'
    ? { type: layer, pattern: `${WEB_SRC}/${layer}` }
    : { type: layer, pattern: `${WEB_SRC}/${layer}/*`, capture: ['slice'] },
)

function lowerLayers(layer) {
  const index = FSD_LAYERS.indexOf(layer)
  return FSD_LAYERS.slice(index + 1)
}

const SLICED_LAYERS = new Set(['pages', 'widgets', 'features', 'entities'])

const fsd_policies = FSD_LAYERS.flatMap((layer) => {
  const policies = [
    // Слой импортирует только нижележащие.
    {
      from: { element: { type: layer } },
      allow: { to: { element: { type: lowerLayers(layer) } } },
    },
  ]
  policies.push(
    SLICED_LAYERS.has(layer)
      ? {
          // Внутри слоя — только свой slice: соседний slice того же слоя импортировать нельзя.
          from: { element: { type: layer } },
          allow: {
            to: {
              element: { type: layer, captured: { slice: '{{ from.element.captured.slice }}' } },
            },
          },
        }
      : {
          from: { element: { type: layer } },
          allow: { to: { element: { type: layer } } },
        },
  )
  return policies
})

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.min.js',
      '**/playwright-report/**',
      '**/storybook-static/**',
      '**/.storybook/**',
      '**/test-results/**',
      'pnpm-lock.yaml',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Только named exports (react-architecture.mdc).
      'no-restricted-exports': [
        'error',
        { restrictDefaultExports: { direct: true, named: true, defaultFrom: true, namedFrom: true, namespaceFrom: true } },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Default export запрещён: используйте named export.' },
      ],
      'no-console': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description', minimumDescriptionLength: 10 }],
    },
  },
  {
    // Конфиги инструментов требуют default export.
    files: [
      '*.config.{js,ts}',
      '**/*.config.{js,ts}',
      '**/.storybook/*.{ts,tsx}',
      // Storybook требует default export метаданных (CSF).
      '**/*.stories.tsx',
    ],
    rules: {
      'no-restricted-exports': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Скрипты командной строки: вывод в консоль — их назначение.
    files: ['infra/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks, boundaries },
    settings: {
      'boundaries/elements': layer_elements,
      'import/resolver': { typescript: { project: 'apps/web/tsconfig.json' } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            ...fsd_policies,
            // Внешние пакеты доступны всем слоям.
            { allow: { to: { module: { origin: 'external' } } } },
          ],
        },
      ],
      // Импорт между slices только через index.ts: глубокие пути `@/features/x/ui/Y` запрещены.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/pages/*/*', '@/widgets/*/*', '@/features/*/*', '@/entities/*/*'],
              message: 'Глубокие импорты запрещены: импортируйте через index.ts slice.',
            },
          ],
        },
      ],
    },
  },
  {
    // React.lazy-страницы — единственное исключение из правила про default export.
    files: ['apps/web/src/pages/*/ui/*Page.tsx'],
    rules: { 'no-restricted-exports': 'off', 'no-restricted-syntax': 'off' },
  },
)
