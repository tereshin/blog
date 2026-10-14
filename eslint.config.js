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

const DEFAULT_EXPORT_RESTRICTION = {
  selector: 'ExportDefaultDeclaration',
  message: 'Default export запрещён: используйте named export.',
}

const BACKEND_SYNTAX_RESTRICTIONS = [
  DEFAULT_EXPORT_RESTRICTION,
  {
    selector: "CallExpression[callee.property.name='catch'] > ArrowFunctionExpression[body.type='Identifier'][body.name='undefined']",
    message: 'Ошибку нельзя проглатывать: залогируйте её или пробросьте с cause.',
  },
  {
    selector: "CallExpression[callee.property.name='catch'] > ArrowFunctionExpression[body.type='BlockStatement'][body.body.length=0]",
    message: 'Ошибку нельзя проглатывать: залогируйте её или пробросьте с cause.',
  },
]

// react-naming.mdc: данные — snake_case, булевы — с префиксом, функции и компоненты — camelCase/PascalCase.
const WEB_NAMING_CONVENTION = [
  // Варианты cva именуются как в react-components.mdc: `button_variants`.
  { selector: 'variable', types: ['function'], filter: { regex: '_variants$', match: true }, format: ['snake_case'] },
  { selector: 'variable', types: ['function'], format: ['camelCase', 'PascalCase'] },
  {
    selector: 'variable',
    types: ['boolean'],
    format: ['snake_case', 'UPPER_CASE'],
    custom: { regex: '^(is|has|can|should|IS|HAS|CAN|SHOULD)_', match: true },
  },
  { selector: 'variable', modifiers: ['const', 'global'], format: ['UPPER_CASE', 'snake_case', 'camelCase', 'PascalCase'] },
  // PascalCase — динамический компонент (`const Tag = ordered ? 'ol' : 'ul'`).
  { selector: 'variable', format: ['snake_case', 'UPPER_CASE', 'PascalCase'], leadingUnderscore: 'allow' },
  // Имена из чужих API (useQuery, HeroUI) при деструктуризации не переименовываются.
  { selector: 'variable', modifiers: ['destructured'], format: null },
  { selector: 'parameter', format: ['snake_case', 'camelCase'], leadingUnderscore: 'allow' },
  { selector: 'typeLike', format: ['PascalCase'] },
]

/** Путь в соседний модуль мимо его index.ts; `prefix` — подъём до папки modules/. */
function crossModulePattern(prefix) {
  return {
    regex: `^${prefix}[^/.]+/(?!index\\.ts$).+`,
    message: 'Соседний модуль импортируется только через его index.ts.',
  }
}

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
      'no-restricted-syntax': ['error', DEFAULT_EXPORT_RESTRICTION],
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
    // node-microservices.mdc: конфигурация, ошибки, размер файлов.
    files: ['services/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
    ignores: ['**/*.test.ts', '**/testing.ts'],
    rules: {
      'max-lines': ['error', { max: 300 }],
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'process.env читается только в src/config/env.ts.' },
      ],
      'no-restricted-syntax': [
        'error',
        ...BACKEND_SYNTAX_RESTRICTIONS,
      ],
    },
  },
  {
    files: ['services/*/src/config/env.ts', 'packages/config/src/define-env.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    // Файлы модуля: соседний модуль — только через его index.ts.
    files: ['services/*/src/modules/*/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [crossModulePattern('\\.\\./')] }],
    },
  },
  {
    files: ['services/*/src/modules/*/*/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [crossModulePattern('\\.\\./\\.\\./')] }],
    },
  },
  {
    // Сервис не знает про HTTP, ORM и брокер — только порты из *.types.ts.
    files: ['services/*/src/modules/**/*.service.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            crossModulePattern('\\.\\./'),
            {
              group: ['fastify', 'drizzle-orm', 'drizzle-orm/*', 'nats', '@nats-io/*', '@blog/broker', '@blog/db-kit', '**/infra/db/*'],
              message: 'Сервис зависит только от интерфейсов из *.types.ts; реализация подставляется в app.ts.',
            },
          ],
        },
      ],
    },
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
    // Текст интерфейса — только из словарей. Истории и страницы с default export исключены ниже.
    files: ['apps/web/src/**/*.tsx'],
    ignores: ['**/*.stories.tsx', 'apps/web/src/pages/*/ui/*Page.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        DEFAULT_EXPORT_RESTRICTION,
        { selector: 'JSXText[value=/[A-Za-zА-Яа-яЁё]/]', message: 'Текст интерфейса берётся из словарей i18n, не из литерала в JSX.' },
        {
          selector: "JSXAttribute[name.name='key'] Identifier[name=/^(i|idx|index)$/]",
          message: 'Ключ списка — стабильный id, не индекс (react-performance.mdc).',
        },
      ],
    },
  },
  {
    // react-architecture.mdc: файл > 200 строк — сигнал к декомпозиции.
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.stories.tsx', '**/*.d.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      'max-lines': ['error', { max: 200 }],
      '@typescript-eslint/naming-convention': ['warn', ...WEB_NAMING_CONVENTION],
    },
  },
  {
    // React.lazy-страницы — единственное исключение из правила про default export.
    files: ['apps/web/src/pages/*/ui/*Page.tsx'],
    rules: { 'no-restricted-exports': 'off', 'no-restricted-syntax': 'off' },
  },
)
