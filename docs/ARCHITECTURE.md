# ContextForge TypeScript Rewrite

## Overview

This is a greenfield rewrite of ContextForge - a context window management application for LLM interactions. The rewrite moves from a Python backend (FastAPI) + React frontend architecture to a pure TypeScript stack using Convex as the backend platform.

## Design Principles

1. **Simple over overengineered** - Fewer moving parts, less abstraction
2. **Server-side logic** - Core business logic runs on Convex, ensuring consistent state
3. **Real-time by default** - Convex provides automatic state synchronization
4. **Type-safe throughout** - End-to-end TypeScript from database to UI

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | Convex | Database, real-time sync, server functions, auth |
| **Frontend** | React | UI components |
| **Routing** | TanStack Router | Type-safe client-side routing |
| **LLM Integration** | Vercel AI SDK | LLM abstraction, streaming |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Testing** | Vitest + Playwright | Unit/integration + E2E |
| **Package Manager** | pnpm | Fast, disk-efficient |

### What We're NOT Using

| Removed | Reason |
|---------|--------|
| Zustand | Convex handles server state reactively; React useState/useContext sufficient for UI state |
| React Query | Convex's `useQuery`/`useMutation` provide built-in caching and reactivity |
| FastAPI | Replaced by Convex functions |
| JSON file persistence | Replaced by Convex database |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           React + TanStack Router           │
│  ┌───────────────────────────────────────┐  │
│  │  useState for UI-only state           │  │
│  │  useQuery(api.*) for server data      │  │
│  │  useMutation(api.*) for changes       │  │
│  │  useChat() for AI streaming           │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│              Convex Backend                 │
│  ┌─────────────┐ ┌─────────────┐           │
│  │  Queries    │ │  Mutations  │           │
│  │  (reads)    │ │  (writes)   │           │
│  └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐           │
│  │  Actions    │ │ HTTP Actions│           │
│  │ (side effects)│ (streaming) │           │
│  └─────────────┘ └─────────────┘           │
│  ┌─────────────────────────────────────┐   │
│  │  Zone logic, token counting,        │   │
│  │  compression - all server-side      │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│           Convex Database                   │
│  blocks, zones, sessions, messages          │
└─────────────────────────────────────────────┘
```

---

## Why Convex?

### Problems It Solves

1. **Real-time synchronization** - When any client mutates data, all subscribed clients update automatically. No manual cache invalidation.

2. **End-to-end type safety** - Schema defines types that flow through queries, mutations, and into React components.

3. **Server-side logic** - Token counting, zone budget enforcement, and compression run on the server with guaranteed consistency.

4. **Zero infrastructure** - No database setup, no server management, no deployment configuration.

### Convex vs Traditional Backend

| Aspect | FastAPI + JSON | Convex |
|--------|----------------|--------|
| Data sync | Manual polling/SSE | Automatic reactivity |
| Cache invalidation | Manual | Never think about it |
| Type safety | Pydantic ↔ TypeScript gap | Unified TypeScript |
| Multi-user | Session isolation code | Built-in |
| Persistence | JSON files | Document database |

---

## Core Domain Model

### Zones

Three-zone architecture for context window management:

| Zone | Purpose | Characteristics |
|------|---------|-----------------|
| **PERMANENT** | System prompts, tool definitions | Never evicted, always included |
| **STABLE** | Task context, compressed history | Rarely changes, cached per session |
| **WORKING** | Recent messages, active edits | Frequently changes, first to evict |

### Blocks

Content blocks are the fundamental unit:

```typescript
// Conceptual schema (Convex format TBD)
{
  id: Id<"blocks">,
  content: string,
  zone: "PERMANENT" | "STABLE" | "WORKING",
  type: BlockType,
  tokens: number,        // Computed server-side
  position: number,      // Order within zone
  metadata: object,
  createdAt: number,
  updatedAt: number,
}
```

### Block Types

Semantic content types (from original implementation):

- `SYSTEM_MESSAGE`, `USER_MESSAGE`, `ASSISTANT_MESSAGE`
- `CODE`, `ERROR`, `TEST`, `DOCUMENTATION`
- `TASK`, `DECISION`, `SCHEMA`, `QUERY`, `RESULT`
- `PERSONA`, `MECHANIC`, `PARADIGM` (game design)
- And others as needed

---

## Key Implementation Details

### Token Counting

Server-side using JavaScript tokenizer library:

```typescript
// In Convex mutation
import { encode } from "gpt-tokenizer"; // or tiktoken WASM

export const createBlock = mutation({
  handler: async (ctx, args) => {
    const tokens = encode(args.content).length;
    // ... store with token count
  },
});
```

### LLM Streaming

Using Vercel AI SDK in Convex HTTP actions:

```typescript
// convex/http.ts
import { httpAction } from "./_generated/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export const chat = httpAction(async (ctx, request) => {
  const { messages, context } = await request.json();

  const result = await streamText({
    model: openai("gpt-4o"),
    system: context, // Assembled from blocks
    messages,
  });

  return result.toDataStreamResponse();
});
```

Convex added `TextDecoderStream` support (April 2025) specifically for this use case.

### State Management

| State Type | Solution |
|------------|----------|
| Server data (blocks, zones) | `useQuery(api.blocks.list)` |
| Mutations | `useMutation(api.blocks.create)` |
| UI-only (dialogs, selections) | React `useState` |
| Shared UI state | React `useContext` if needed |

No Zustand, no Redux, no React Query wrapper.

---

## Testing Strategy

### Unit/Integration Tests

Using `convex-test` with Vitest:

```typescript
import { convexTest } from "convex-test";
import { api } from "./_generated/api";

test("create block computes tokens", async () => {
  const t = convexTest();
  const id = await t.mutation(api.blocks.create, {
    content: "Hello world",
    zone: "WORKING",
    type: "NOTE",
  });
  const block = await t.query(api.blocks.get, { id });
  expect(block.tokens).toBe(2);
});
```

### E2E Tests

Using Playwright against local Convex backend:

```bash
npx convex dev --once    # Start local backend
npx playwright test      # Run E2E tests
```

---

## Migration from Original ContextForge

### What Carries Over

- Core concepts: zones, blocks, token budgets
- Block types and their semantics
- UI patterns: three-zone layout, drag-drop, block editing
- LLM integration patterns

### What Changes

- Python → TypeScript (complete rewrite)
- FastAPI → Convex functions
- JSON persistence → Convex database
- Zustand + React Query → Convex hooks
- Manual session management → Convex built-in

### What's Deferred

- Compression engine (evaluate if needed with Convex)
- Design by Contract middleware (evaluate TypeScript alternatives)
- Policy system (may simplify given server-side logic)

---

## Project Structure (Planned)

```
ContextForgeTS/
├── convex/
│   ├── schema.ts          # Database schema
│   ├── blocks.ts          # Block CRUD operations
│   ├── zones.ts           # Zone management
│   ├── chat.ts            # LLM integration
│   └── http.ts            # HTTP actions (streaming)
├── src/
│   ├── components/
│   │   ├── zones/         # Zone panels
│   │   ├── blocks/        # Block cards
│   │   ├── editor/        # Block editor
│   │   └── chat/          # Chat/brainstorm UI
│   ├── routes/            # TanStack Router routes
│   ├── lib/               # Utilities
│   └── main.tsx           # Entry point
├── tests/
│   ├── convex/            # Convex function tests
│   └── e2e/               # Playwright tests
├── docs/
│   └── ARCHITECTURE.md    # This document
└── package.json
```

---

## Setup (From Scratch)

```bash
# 1. Initialize Vite + React + TypeScript
pnpm create vite@latest . -- --template react-ts

# 2. Install Convex
pnpm add convex

# 3. Install TanStack Router
pnpm add @tanstack/react-router

# 4. Install Tailwind + utilities
pnpm add -D tailwindcss postcss autoprefixer
pnpm add class-variance-authority clsx tailwind-merge

# 5. Initialize Tailwind
pnpx tailwindcss init -p

# 6. Initialize Convex (creates convex/ folder)
pnpx convex dev
```

---

## Open Questions

1. **Token counting library** - `gpt-tokenizer` vs `tiktoken` WASM. Need to evaluate bundle size and accuracy.

2. **Auth requirements** - Do we need multi-user auth or is single-user sufficient for MVP?

3. **Compression** - Is LLM-based compression still needed, or does Convex's storage make it less critical?

4. **Offline support** - Convex has limited offline. Is this a requirement?

---

## References

- [Convex Documentation](https://docs.convex.dev/)
- [Convex Testing](https://docs.convex.dev/testing)
- [TanStack Router](https://tanstack.com/router/latest)
- [Vercel AI SDK](https://ai-sdk.dev/)
- [Convex + Vercel AI SDK Integration](https://www.arhamhumayun.com/blog/streamed-ai-response)
