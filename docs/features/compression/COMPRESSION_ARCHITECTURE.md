# Compression Architecture Documentation

## Overview

ContextForge implements a **hybrid compression architecture** that supports both client-side and server-side compression, enabling the system to work in two deployment modes:

- **Remote/Cloud Mode**: Client-side compression using Ollama or OpenRouter (user's own LLM providers)
- **Local Mode**: Server-side compression using Claude Code (via Convex backend)

This document explains how both approaches work, when each is used, and the complete message flow for each scenario.

---

## Architecture Decision: Why Hybrid?

### The Challenge

We have two deployment scenarios with different constraints:

1. **Remote Deployment (Cloud)**
   - Hosted on Convex Cloud
   - No access to Claude Code CLI
   - Users bring their own LLM providers (BYOK - Bring Your Own Keys)
   - Compression must happen client-side in the browser

2. **Local Deployment (Development)**
   - Running on local machine
   - Claude Code CLI available
   - Can use Claude Code for compression
   - Compression can happen server-side via Convex actions

### The Solution

We use **feature flags** and **provider detection** to automatically route compression requests to the appropriate implementation:

```typescript
// Feature flag (environment variable)
CLAUDE_CODE_ENABLED=true  // Local mode
CLAUDE_CODE_ENABLED=false // Remote mode (default)

// Provider detection (client-side)
if (openrouterApiKey) → use OpenRouter
else → use Ollama (default)
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐                                            │
│  │  UI Component   │                                            │
│  │  (BlockCard,    │                                            │
│  │   Dialog, etc)  │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ useCompression  │  React Hook                                │
│  │     Hook        │  (orchestrates compression)                │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌───────────────────────────────────────────┐                 │
│  │     CompressionService                     │                 │
│  │  - Provider detection                      │                 │
│  │  - Block validation                        │                 │
│  │  - Token counting                          │                 │
│  │  - Quality checking                        │                 │
│  └──────────┬─────────────────────────────────┘                 │
│             │                                                    │
│       ┌─────┴─────┐                                             │
│       │  Router   │  (based on provider)                        │
│       └─────┬─────┘                                             │
│             │                                                    │
│    ┌────────┼────────┐                                          │
│    ▼        ▼        ▼                                          │
│  Ollama  OpenRouter  Claude Code?                               │
│  (HTTP)   (HTTP)     (not available)                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                        │
                        │ Convex Mutation
                        │ (save compressed result)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Convex)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  blocks.compress / blocks.compressAndMerge              │   │
│  │  - Validate session access                              │   │
│  │  - Update block(s) with compressed content              │   │
│  │  - Set compression metadata                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Feature Flag Check (for future Claude Code integration):      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  if (CLAUDE_CODE_ENABLED) {                             │   │
│  │    // Call Claude Code via Convex action               │   │
│  │    // (Not yet implemented)                            │   │
│  │  }                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Scenario 1: Client-Side Compression (Remote/Cloud Mode)

### When Used

- `CLAUDE_CODE_ENABLED=false` (default for cloud deployment)
- User has configured Ollama or OpenRouter
- All compression happens in the browser

### Complete Flow: Single Block Compression

#### Step 1: User Initiates Compression

```typescript
// User clicks "Compress" button on a block card
// Component: BlockActions.tsx

<DropdownMenuItem onClick={() => setShowCompressDialog(true)}>
  <Minimize2 className="w-4 h-4 mr-2" />
  Compress
</DropdownMenuItem>
```

#### Step 2: Compression Hook Orchestrates

```typescript
// Hook: useCompression.ts
// Running in browser

const { compressSingle } = useCompression()

await compressSingle(block, "semantic")
```

**What happens inside useCompression:**

```typescript
// 1. Create compression service (auto-detects provider)
const service = new CompressionService()
// → Checks if OpenRouter is configured (localStorage has API key)
// → If yes: provider = "openrouter"
// → If no: provider = "ollama" (default)

// 2. Call service.compressBlock()
const result = await service.compressBlock(block, "semantic")
```

#### Step 3: Compression Service Validates and Routes

```typescript
// File: compressionService.ts
// Running in browser

async compressBlock(block, strategy) {
  // VALIDATION
  if (block.isCompressed) return { success: false, error: "Already compressed" }
  if (block.tokens < 100) return { success: false, error: "Too small" }

  // COMPRESS CONTENT
  const compressedContent = await this.compressContent(
    block.content,
    strategy,
    block.type
  )
  // ↓ Routes to compressSemantic()

  // TOKEN COUNTING
  const originalTokens = estimateTokens(block.content)      // ~chars/4
  const compressedTokens = estimateTokens(compressedContent) // ~chars/4
  const ratio = originalTokens / compressedTokens

  // QUALITY CHECK
  if (ratio < 1.2) return { success: false, error: "Not effective" }
  if (quality < 0.6) return { success: false, error: "Quality too low" }

  return {
    success: true,
    compressedContent,
    originalTokens,
    compressedTokens,
    compressionRatio: ratio,
    tokensSaved: originalTokens - compressedTokens
  }
}
```

#### Step 4: Semantic Compression Strategy (Client-Side LLM Call)

```typescript
// File: strategies/semantic.ts
// Running in browser

async compressSemantic(content, options) {
  // BUILD PROMPT
  const prompt = `You are a compression specialist...

CONTENT TO COMPRESS:
${content}

COMPRESSED VERSION:`

  // ROUTE TO PROVIDER
  if (options.provider === "ollama") {
    return compressWithOllama(prompt, options)
  } else if (options.provider === "openrouter") {
    return compressWithOpenRouter(prompt, options)
  }
}
```

##### Step 4a: If Using Ollama

```typescript
// Direct HTTP call from browser to Ollama
// No Convex involved here

async compressWithOllama(prompt, options) {
  const messages = [{ role: "user", content: prompt }]

  // STREAM FROM OLLAMA (localhost:11434)
  const generator = ollama.streamChat(messages, {
    model: "llama3.2:latest",
    temperature: 0.2
  })

  let compressed = ""
  for await (const chunk of generator) {
    compressed += chunk  // Accumulate streamed chunks
  }

  return compressed.trim()
}

// Inside ollama.streamChat():
// POST http://localhost:11434/api/chat
// Headers: { "Content-Type": "application/json" }
// Body: { model, messages, stream: true, options }
// Response: Server-Sent Events (SSE) stream of JSON chunks
```

**Network Request:**
```http
POST http://localhost:11434/api/chat
Content-Type: application/json

{
  "model": "llama3.2:latest",
  "messages": [
    {
      "role": "user",
      "content": "You are a compression specialist...\n\nCONTENT TO COMPRESS:\n[original content]\n\nCOMPRESSED VERSION:"
    }
  ],
  "stream": true,
  "options": {
    "temperature": 0.2,
    "top_p": 0.95
  }
}
```

**Network Response (streaming):**
```
{"message":{"content":"Here"},"done":false}
{"message":{"content":" is"},"done":false}
{"message":{"content":" the"},"done":false}
{"message":{"content":" compressed"},"done":false}
...
{"message":{"content":"."},"done":true,"total_duration":1234,"eval_count":150}
```

##### Step 4b: If Using OpenRouter

```typescript
// Direct HTTP call from browser to OpenRouter
// No Convex involved here

async compressWithOpenRouter(prompt, options) {
  const messages = [{ role: "user", content: prompt }]

  // STREAM FROM OPENROUTER (API key from localStorage)
  const generator = openrouter.streamChat(messages, {
    model: "anthropic/claude-sonnet-4",
    temperature: 0.2
  })

  let compressed = ""
  for await (const chunk of generator) {
    compressed += chunk  // Accumulate streamed chunks
  }

  return compressed.trim()
}

// Inside openrouter.streamChat():
// POST https://openrouter.ai/api/v1/chat/completions
// Headers: {
//   "Authorization": "Bearer sk-or-...",
//   "Content-Type": "application/json"
// }
// Body: { model, messages, stream: true, temperature, top_p }
// Response: Server-Sent Events (SSE) stream
```

**Network Request:**
```http
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer sk-or-v1-xxxxx
Content-Type: application/json

{
  "model": "anthropic/claude-sonnet-4",
  "messages": [
    {
      "role": "user",
      "content": "You are a compression specialist...\n\nCONTENT TO COMPRESS:\n[original content]\n\nCOMPRESSED VERSION:"
    }
  ],
  "stream": true,
  "temperature": 0.2,
  "top_p": 0.95
}
```

**Network Response (streaming):**
```
data: {"id":"gen-xxx","model":"anthropic/claude-sonnet-4","choices":[{"delta":{"content":"Here"},"index":0}]}

data: {"id":"gen-xxx","model":"anthropic/claude-sonnet-4","choices":[{"delta":{"content":" is"},"index":0}]}

data: {"id":"gen-xxx","model":"anthropic/claude-sonnet-4","choices":[{"delta":{"content":" compressed"},"index":0}]}

...

data: [DONE]
```

#### Step 5: Save Compressed Result to Convex

```typescript
// Back in useCompression hook
// Browser → Convex

if (compressionResult.success) {
  // CONVEX MUTATION CALL
  await compressMutation({
    blockId: block._id,
    compressedContent: compressionResult.compressedContent,
    originalTokens: compressionResult.originalTokens,
    compressedTokens: compressionResult.compressedTokens,
    compressionRatio: compressionResult.compressionRatio,
    strategy: "semantic"
  })
}
```

**Network Request (to Convex):**
```http
POST https://your-app.convex.cloud/api/mutation
Content-Type: application/json
Authorization: Bearer [convex-token]

{
  "path": "blocks:compress",
  "args": {
    "blockId": "abc123",
    "compressedContent": "[compressed text here]",
    "originalTokens": 500,
    "compressedTokens": 200,
    "compressionRatio": 2.5,
    "strategy": "semantic"
  }
}
```

#### Step 6: Convex Mutation Updates Database

```typescript
// File: convex/blocks.ts
// Running on Convex backend

export const compress = mutation({
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.blockId)

    // AUTH CHECK
    await requireSessionAccess(ctx, block.sessionId)

    // UPDATE BLOCK
    await ctx.db.patch(args.blockId, {
      content: args.compressedContent,        // Replace with compressed
      isCompressed: true,
      compressionStrategy: args.strategy,
      compressionRatio: args.compressionRatio,
      compressedAt: Date.now(),
      tokens: args.compressedTokens,          // Update current tokens
      originalTokens: block.originalTokens || args.originalTokens,
      updatedAt: Date.now()
    })

    // UPDATE SESSION TIMESTAMP
    await ctx.db.patch(block.sessionId, { updatedAt: Date.now() })

    return { success: true }
  }
})
```

#### Step 7: UI Updates Reactively

```typescript
// Convex reactivity automatically updates UI
// The block query re-runs and components re-render

const blocks = useQuery(api.blocks.list, { sessionId })
// → blocks now includes the compressed block with updated content and metadata

// BlockCard.tsx shows compression badge
{block.isCompressed && (
  <Badge variant="secondary">
    <Minimize2 className="w-3 h-3 mr-1" />
    {block.compressionRatio?.toFixed(1)}x
  </Badge>
)}
```

### Summary: Client-Side Flow

```
┌──────────┐   1. User Click    ┌─────────────────┐
│   UI     │ ─────────────────> │ useCompression  │
└──────────┘                     │     Hook        │
                                 └────────┬────────┘
                                          │
                                 2. Validate & Route
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │  Compression    │
                                 │    Service      │
                                 └────────┬────────┘
                                          │
                                 3. LLM Compression
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                    ▼
            ┌────────────────┐   ┌────────────────┐   ┌─────────────┐
            │ Ollama         │   │ OpenRouter     │   │ Claude Code │
            │ (localhost)    │   │ (API call)     │   │ (N/A)       │
            └───────┬────────┘   └───────┬────────┘   └─────────────┘
                    │                    │
                    └────────┬───────────┘
                             │
                    4. Compressed Content
                             │
                             ▼
                    ┌─────────────────┐
                    │ Convex Mutation │
                    │ blocks.compress │
                    └────────┬────────┘
                             │
                    5. Update Database
                             │
                             ▼
                    ┌─────────────────┐
                    │   Convex DB     │
                    │  (block updated)│
                    └────────┬────────┘
                             │
                    6. Reactive Update
                             │
                             ▼
                    ┌─────────────────┐
                    │   UI Re-renders │
                    │  (shows badge)  │
                    └─────────────────┘
```

**Key Points:**
- ✅ LLM compression happens **entirely in the browser**
- ✅ Direct HTTP calls to Ollama (localhost) or OpenRouter (API)
- ✅ Convex only stores the result (no LLM calls on backend)
- ✅ Works in cloud deployment (no backend dependencies)
- ✅ User provides their own API keys (BYOK)

---

## Scenario 2: Server-Side Compression (Local Mode)

### When Used

- `CLAUDE_CODE_ENABLED=true` (local development only)
- Claude Code CLI is available on the machine
- Compression happens on Convex backend via HTTP action

### Complete Flow: Single Block Compression

#### Step 1-2: Same as Client-Side

User clicks compress → `useCompression` hook is called.

#### Step 3: Provider Detection with Feature Flag Check

```typescript
// Hook: useCompression.ts
// Running in browser

// First, check feature flags from Convex
const flags = useQuery(api.features.getFlags, {})

if (flags?.claudeCodeEnabled) {
  // SERVER-SIDE MODE: Use Convex action
  await compressViaClaudeCode(block, strategy)
} else {
  // CLIENT-SIDE MODE: Use browser-based compression
  const service = new CompressionService()
  await service.compressBlock(block, strategy)
}
```

#### Step 4: Call Convex Action (Browser → Convex)

```typescript
// Hook calls Convex action instead of client-side service
// Browser → Convex backend

const compressAction = useAction(api.compression.compressWithClaudeCode)

const result = await compressAction({
  blockId: block._id,
  strategy: "semantic"
})
```

**Network Request:**
```http
POST https://localhost:3210/api/action
Content-Type: application/json
Authorization: Bearer [convex-token]

{
  "path": "compression:compressWithClaudeCode",
  "args": {
    "blockId": "abc123",
    "strategy": "semantic"
  }
}
```

#### Step 5: Convex Action Calls Claude Code (Backend)

```typescript
// File: convex/compression.ts (NEW - needs to be created)
// Running on Convex backend (local machine)

import { action } from "./_generated/server"
import { api } from "./_generated/api"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const compressWithClaudeCode = action({
  args: {
    blockId: v.id("blocks"),
    strategy: v.string()
  },
  handler: async (ctx, args) => {
    // 1. GET BLOCK DATA
    const block = await ctx.runQuery(api.blocks.get, { id: args.blockId })
    if (!block) throw new Error("Block not found")

    // 2. VALIDATE
    if (block.isCompressed) throw new Error("Already compressed")
    if (block.tokens < 100) throw new Error("Too small")

    // 3. BUILD PROMPT FOR CLAUDE CODE
    const prompt = `You are a compression specialist. Compress the following content...

CONTENT TO COMPRESS:
${block.content}

COMPRESSED VERSION:`

    // 4. CALL CLAUDE CODE CLI
    const { stdout } = await execAsync(
      `echo ${JSON.stringify(prompt)} | claude-code --no-streaming`,
      { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
    )

    const compressedContent = stdout.trim()

    // 5. TOKEN COUNTING
    const originalTokens = block.tokens || Math.ceil(block.content.length / 4)
    const compressedTokens = Math.ceil(compressedContent.length / 4)
    const ratio = originalTokens / compressedTokens

    // 6. VALIDATE COMPRESSION
    if (ratio < 1.2) throw new Error("Not effective")

    // 7. SAVE VIA MUTATION
    await ctx.runMutation(api.blocks.compress, {
      blockId: args.blockId,
      compressedContent,
      originalTokens,
      compressedTokens,
      compressionRatio: ratio,
      strategy: args.strategy
    })

    return {
      success: true,
      originalTokens,
      compressedTokens,
      compressionRatio: ratio,
      tokensSaved: originalTokens - compressedTokens
    }
  }
})
```

**What Happens:**
1. Convex action runs on Node.js backend (your local machine)
2. Calls `claude-code` CLI via `child_process.exec()`
3. Claude Code processes the prompt
4. Returns compressed content to Convex action
5. Convex action calls `blocks.compress` mutation to save result

**Process Flow:**
```
Browser                Convex Backend           Claude Code CLI
   │                         │                         │
   │ compressAction()        │                         │
   ├────────────────────────>│                         │
   │                         │                         │
   │                         │ exec("claude-code")     │
   │                         ├────────────────────────>│
   │                         │                         │
   │                         │   [Claude processes     │
   │                         │    compression prompt]  │
   │                         │                         │
   │                         │<────────────────────────┤
   │                         │ compressed content      │
   │                         │                         │
   │                         │ blocks.compress()       │
   │                         ├─────────────┐           │
   │                         │             │           │
   │                         │ [Update DB] │           │
   │                         │<────────────┘           │
   │                         │                         │
   │<────────────────────────┤                         │
   │  { success: true }      │                         │
   │                         │                         │
```

#### Step 6: UI Updates (Same as Client-Side)

Convex reactivity triggers re-render, showing compression badge.

### Summary: Server-Side Flow

```
┌──────────┐   1. User Click    ┌─────────────────┐
│   UI     │ ─────────────────> │ useCompression  │
└──────────┘                     │     Hook        │
                                 └────────┬────────┘
                                          │
                                 2. Check Feature Flag
                                          │
                                          ▼
                                 if (claudeCodeEnabled)
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ Convex Action   │
                                 │ (backend)       │
                                 └────────┬────────┘
                                          │
                                 3. Call Claude Code CLI
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ Claude Code     │
                                 │ (subprocess)    │
                                 └────────┬────────┘
                                          │
                                 4. Compressed Content
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ Convex Mutation │
                                 │ blocks.compress │
                                 └────────┬────────┘
                                          │
                                 5. Update Database
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │   Convex DB     │
                                 │  (block updated)│
                                 └────────┬────────┘
                                          │
                                 6. Reactive Update
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │   UI Re-renders │
                                 │  (shows badge)  │
                                 └─────────────────┘
```

**Key Points:**
- ✅ LLM compression happens **on Convex backend**
- ✅ Claude Code CLI executed as subprocess
- ✅ Only works in local development (feature flagged)
- ✅ No API keys needed (Claude Code uses your auth)
- ✅ Cannot be deployed to cloud (requires CLI)

---

## Comparison Table

| Aspect | Client-Side (Remote) | Server-Side (Local) |
|--------|---------------------|---------------------|
| **Feature Flag** | `CLAUDE_CODE_ENABLED=false` | `CLAUDE_CODE_ENABLED=true` |
| **LLM Location** | Browser (Ollama/OpenRouter) | Backend (Claude Code CLI) |
| **API Keys** | User provides (localStorage) | No keys needed |
| **Network Calls** | Browser → LLM provider | Convex → Claude Code |
| **Deployment** | ✅ Cloud-compatible | ❌ Local only |
| **Cost** | User pays (BYOK) | Developer pays (Claude Code) |
| **Performance** | Depends on user's connection | Depends on local machine |
| **Implementation** | `CompressionService` class | Convex action + CLI |

---

## Multi-Block Merge Compression

Both scenarios support merging multiple blocks into one compressed block. The flow is similar, with one key difference:

### Client-Side Merge

```typescript
// 1. Combine block contents
const combinedContent = blocks
  .map(b => `## ${extractTitle(b.content)}\n\n${b.content}`)
  .join("\n\n---\n\n")

// 2. Compress combined content (same as single block)
const result = await service.compressText(combinedContent, "semantic")

// 3. Save with special mutation
await compressAndMergeMutation({
  blockIds: blocks.map(b => b._id),
  compressedContent: result.compressedContent,
  originalTokens: sumOfOriginalTokens,
  compressedTokens: result.compressedTokens,
  compressionRatio: result.compressionRatio,
  strategy: "semantic",
  targetZone: "WORKING",
  targetType: "NOTE",
  targetPosition: 0
})
```

### Server-Side Merge

Same approach, but compression happens in Convex action via Claude Code.

---

## Zone Compression

Compressing all blocks in a zone is just a special case of multi-block merge:

1. Query all blocks in zone
2. Combine their contents
3. Compress combined content
4. Create single merged block
5. Delete all original blocks

---

## Implementation Checklist

### ✅ Already Implemented

- [x] Schema fields for compression metadata
- [x] TypeScript types
- [x] Convex mutations (`compress`, `compressAndMerge`)
- [x] Compression service with provider routing
- [x] Semantic compression strategy
- [x] Ollama and OpenRouter client integration
- [x] Token counting and quality validation

### 🚧 In Progress

- [ ] React hook (`useCompression`)
- [ ] UI components (dialogs, badges, buttons)

### 📋 TODO (For Claude Code Support)

- [ ] Create Convex action for Claude Code integration
- [ ] Add feature flag check in hook
- [ ] Test both modes thoroughly
- [ ] Add error handling for CLI failures
- [ ] Document deployment requirements

---

## FAQ

### Q: Why not always use server-side compression?

**A:** Server-side compression requires Claude Code CLI, which is only available locally. Cloud deployments (Convex Cloud) cannot run CLI tools, so we need client-side compression for production.

### Q: Can we support both simultaneously?

**A:** Yes! The feature flag allows the same codebase to work in both modes. Local development uses Claude Code, cloud deployment uses Ollama/OpenRouter.

### Q: What if user doesn't have Ollama or OpenRouter?

**A:** Compression will fail gracefully with an error message. In the future, we could add a fallback to a free LLM API or show a setup guide.

### Q: How do we test both modes?

**A:**
- **Client-side**: Set `CLAUDE_CODE_ENABLED=false`, test with Ollama/OpenRouter
- **Server-side**: Set `CLAUDE_CODE_ENABLED=true`, test with Claude Code CLI
- Use feature flag queries to verify correct mode is active

### Q: What about costs?

**A:**
- **Client-side**: User pays for their own LLM usage (BYOK model)
- **Server-side**: Developer pays for Claude Code usage (local dev only)

---

## Next Steps

1. ✅ Finish implementing React hook with feature flag check
2. ✅ Build UI components
3. ✅ Create Convex action for Claude Code integration
4. ✅ Add comprehensive error handling
5. ✅ Write tests for both modes
6. ✅ Document setup instructions for users

---

*Last Updated: 2026-01-31*
