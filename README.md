# ContextForge TypeScript

A context window management application for LLM interactions. This is a greenfield TypeScript rewrite of the original Python-based ContextForge.

## What is ContextForge?

ContextForge helps manage the context window when working with Large Language Models. It organizes content into a **three-zone architecture**:

| Zone | Purpose | Behavior |
|------|---------|----------|
| **Permanent** | System prompts, tool definitions | Never evicted, always included |
| **Stable** | Task context, compressed history | Rarely changes, cached per session |
| **Working** | Recent messages, active edits | Frequently changes, first to evict |

Key features:
- **Visual zone management** - Drag and drop content between zones
- **Real-time token counting** - Know exactly how much context you're using
- **Server-side logic** - Token counting and zone enforcement on Convex
- **Multi-client sync** - Changes sync instantly across tabs/devices

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | [Convex](https://convex.dev) - Real-time database + serverless functions |
| Frontend | React 19 + TypeScript |
| Routing | TanStack Router |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Testing | Vitest (unit) + Playwright (E2E) |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
# Clone and install
cd ContextForgeTS
pnpm install

# Start Convex backend (first terminal)
pnpm exec convex dev

# Start frontend (second terminal)
pnpm dev
```

Visit `http://localhost:5173`

### Environment Variables

Copy `.env.example` to `.env.local` for local development. The Convex CLI auto-generates this when you run `convex dev`.

## Development

```bash
# Run all checks
pnpm lint && pnpm test:run && pnpm build

# Format code
pnpm format

# Run E2E tests (requires app running)
pnpm test:e2e
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Design decisions and technical overview
- [Structure](docs/STRUCTURE.md) - Repository layout
- [Progress](docs/PROGRESS.md) - Development log and decisions
- [References](docs/REFERENCES.md) - Useful links and resources

## License

MIT
