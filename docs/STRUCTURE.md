# Repository Structure

```
ContextForgeTS/
│
├── convex/                     # Convex backend
│   ├── _generated/             # Auto-generated types and API (gitignored)
│   ├── schema.ts               # Database schema definitions
│   └── counters.ts             # Example: counter queries/mutations
│
├── src/                        # Frontend source code
│   ├── components/
│   │   └── ui/                 # shadcn/ui components
│   │       └── button.tsx      # Button component
│   │
│   ├── lib/
│   │   └── utils.ts            # Utility functions (cn, etc.)
│   │
│   ├── test/                   # Unit tests (Vitest)
│   │   ├── setup.ts            # Test setup (jest-dom)
│   │   └── button.test.tsx     # Component tests
│   │
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Entry point + Convex provider
│   └── index.css               # Global styles + Tailwind
│
├── e2e/                        # End-to-end tests (Playwright)
│   └── app.spec.ts             # E2E test specs
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # Technical design and decisions
│   ├── STRUCTURE.md            # This file
│   ├── PROGRESS.md             # Development log
│   └── REFERENCES.md           # External resources and links
│
├── public/                     # Static assets
│   └── vite.svg
│
├── dist/                       # Production build output (gitignored)
│
│── Configuration Files ────────────────────────────────────────────
│
├── package.json                # Dependencies and scripts
├── pnpm-lock.yaml              # Lockfile
├── tsconfig.json               # TypeScript config (root)
├── tsconfig.app.json           # TypeScript config (app)
├── tsconfig.node.json          # TypeScript config (node/vite)
├── vite.config.ts              # Vite configuration
├── vitest.config.ts            # Vitest configuration
├── playwright.config.ts        # Playwright configuration
├── eslint.config.js            # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── .prettierignore             # Prettier ignore patterns
├── components.json             # shadcn/ui configuration
├── index.html                  # HTML entry point
│
│── Environment ────────────────────────────────────────────────────
│
├── .env.example                # Environment variable template
├── .env.local                  # Local environment (gitignored)
│
│── Git ────────────────────────────────────────────────────────────
│
├── .gitignore                  # Git ignore patterns
└── README.md                   # Project overview
```

## Key Directories

### `convex/`

Convex backend code. Files here define:
- **Schema** (`schema.ts`) - Database tables and their fields
- **Queries** - Read-only functions that subscribe to data
- **Mutations** - Functions that modify data
- **Actions** - Functions that call external APIs (e.g., LLMs)

The `_generated/` folder contains auto-generated TypeScript types. Never edit these manually.

### `src/`

React frontend code following a flat structure:
- Components go in `components/`
- Utilities go in `lib/`
- Tests go in `test/`

### `e2e/`

Playwright end-to-end tests. These run against the full application (Vite + Convex).

### `docs/`

Project documentation:
- `ARCHITECTURE.md` - Why decisions were made
- `STRUCTURE.md` - What goes where
- `PROGRESS.md` - What has been done
- `REFERENCES.md` - Helpful links

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `BlockCard.tsx` |
| Hooks | camelCase with `use` prefix | `useTheme.ts` |
| Utilities | camelCase | `utils.ts` |
| Convex functions | camelCase | `counters.ts` |
| Tests | `*.test.tsx` or `*.spec.ts` | `button.test.tsx` |
| E2E tests | `*.spec.ts` | `app.spec.ts` |

## Import Aliases

The `@/` alias points to `src/`:

```typescript
// Instead of
import { Button } from "../../../components/ui/button"

// Use
import { Button } from "@/components/ui/button"
```

Configured in `tsconfig.json` and `vite.config.ts`.
