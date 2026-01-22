# Contributing to ContextForge

Thank you for your interest in contributing to ContextForge! This document provides guidelines and information for contributors.

## Getting Started

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `pnpm install`
3. **Set up environment**: `cp .env.example .env.local`
4. **Start development servers**:
   - Terminal 1: `pnpm exec convex dev`
   - Terminal 2: `pnpm dev`

## Development Workflow

### Before Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make sure you can run the existing tests:
   ```bash
   pnpm test:run
   pnpm lint
   ```

### Making Changes

1. **Write code** following the existing patterns
2. **Add tests** for new functionality
3. **Update documentation** if needed
4. **Run checks** before committing:
   ```bash
   pnpm lint
   pnpm format
   pnpm test:run
   pnpm exec tsc --noEmit
   ```

### Commit Messages

Use clear, descriptive commit messages:

```
Add OpenRouter provider for LLM access

- Create convex/lib/openrouter.ts API client
- Add HTTP endpoints for chat and brainstorm
- Update frontend to support provider selection
```

Format:
- First line: Brief summary (50 chars or less)
- Blank line
- Body: Detailed explanation if needed (wrap at 72 chars)

### Submitting Changes

1. Push your branch to your fork
2. Open a Pull Request against `main`
3. Fill out the PR template with:
   - What the change does
   - Why it's needed
   - How to test it

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode (`strict: true` in tsconfig)
- Prefer explicit types over `any`
- Use `type` for object shapes, `interface` for extendable contracts

### React

- Use functional components with hooks
- Prefer composition over inheritance
- Keep components focused and small
- Use the existing UI components from `@/components/ui`

### Convex

- Follow the patterns in existing files
- Use validators for all function arguments
- Handle errors gracefully
- See [docs/CONVEX_GUIDE.md](docs/CONVEX_GUIDE.md) for detailed patterns

### Formatting

- Run `pnpm format` before committing
- Prettier handles formatting automatically
- ESLint handles code quality rules

## Project Structure

```
contextforge/
├── convex/           # Backend - Convex functions and schema
│   ├── lib/          # Shared utilities (context, providers)
│   └── _generated/   # Auto-generated (don't edit)
├── src/
│   ├── routes/       # Page components (TanStack Router)
│   ├── components/   # Reusable React components
│   ├── hooks/        # Custom React hooks
│   ├── contexts/     # React context providers
│   └── lib/          # Utilities and helpers
├── docs/             # Documentation
└── e2e/              # End-to-end tests (Playwright)
```

## Adding a New LLM Provider

1. Create `convex/lib/yourprovider.ts` with:
   - `streamChat()` - async generator for streaming
   - `chat()` - non-streaming alternative
   - `checkHealth()` - health check function

2. Add HTTP endpoints in `convex/http.ts`:
   - `/api/yourprovider/chat` - single message
   - `/api/yourprovider/brainstorm` - multi-turn
   - `/api/health/yourprovider` - health check

3. Update combined health endpoint to include your provider

4. Add frontend support:
   - Update `Provider` type in `src/hooks/useBrainstorm.ts`
   - Add provider option in `src/components/BrainstormDialog.tsx`
   - Update health display in `src/components/BrainstormPanel.tsx`

5. Add environment variables to `.env.example`

6. Update README.md with setup instructions

## Testing

### Unit Tests (Vitest)

```bash
# Run all tests
pnpm test

# Run tests once
pnpm test:run

# Run specific test file
pnpm test src/lib/utils.test.ts
```

### E2E Tests (Playwright)

```bash
# Run E2E tests (requires app running)
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui
```

### Manual Testing

1. Test with Ollama (local, free)
2. Test with OpenRouter (if you have API key)
3. Test workflows: create template → create workflow → start project
4. Test brainstorming with conversation history

## Documentation

- Update relevant docs when changing functionality
- Add JSDoc comments to exported functions
- Keep README.md current with features

Key documentation files:
- `docs/ARCHITECTURE.md` - Technical design
- `docs/API_REFERENCE.md` - Convex function reference
- `docs/DATA_MODEL.md` - Schema documentation

## Getting Help

- Check existing [issues](https://github.com/OWNER/contextforge/issues)
- Read the documentation in `docs/`
- Ask questions in issues or discussions

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
