# Compression System - Quick Start Guide

## TL;DR

**The Problem:** We need compression to work both in cloud (without Claude Code) and locally (with Claude Code).

**The Solution:** Hybrid architecture with automatic provider detection.

```typescript
// Cloud/Remote: Client-side compression
Browser → Ollama/OpenRouter → Compressed Content → Convex DB

// Local: Server-side compression
Browser → Convex Action → Claude Code CLI → Compressed Content → Convex DB
```

---

## Key Concepts

### 1. **Two Deployment Modes**

| Mode | Environment | Compression Location | LLM Provider |
|------|------------|---------------------|--------------|
| **Remote** | Cloud (Convex Cloud) | Browser | Ollama or OpenRouter |
| **Local** | Development machine | Convex backend | Claude Code CLI |

### 2. **Automatic Provider Detection**

```typescript
// The system automatically chooses:
if (CLAUDE_CODE_ENABLED === "true") {
  // Local mode: Use Convex action → Claude Code CLI
  await compressViaClaudeCode()
} else {
  // Remote mode: Use client-side service
  if (hasOpenRouterKey) {
    await compressWithOpenRouter()
  } else {
    await compressWithOllama() // Default
  }
}
```

### 3. **Single Codebase, Dual Behavior**

The **same React hook** (`useCompression`) works in both modes:

```typescript
const { compressSingle } = useCompression()

// This call automatically routes to correct provider
await compressSingle(block, "semantic")

// ↓ Internally checks feature flag and provider config
// ↓ Routes to Ollama/OpenRouter (client) OR Claude Code (server)
```

---

## How It Works: Message Flow

### Remote Mode (Client-Side)

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. User clicks compress
       ▼
┌─────────────────────┐
│  useCompression()   │ React Hook
└──────┬──────────────┘
       │ 2. Create service
       ▼
┌─────────────────────┐
│ CompressionService  │ Provider detection: Ollama or OpenRouter
└──────┬──────────────┘
       │ 3. Direct HTTP call
       ▼
┌─────────────────────┐
│   Ollama (local)    │ http://localhost:11434/api/chat
│       OR            │ POST {messages, stream: true}
│ OpenRouter (cloud)  │ https://openrouter.ai/api/v1/chat/completions
└──────┬──────────────┘
       │ 4. LLM returns compressed content
       ▼
┌─────────────────────┐
│  Convex Mutation    │ blocks.compress({blockId, compressedContent})
│  (save to DB)       │ Updates block in database
└──────┬──────────────┘
       │ 5. Reactive update
       ▼
┌─────────────────────┐
│   UI Re-renders     │ Shows compression badge
└─────────────────────┘
```

**Key Points:**
- ✅ LLM call happens **in browser** (direct HTTP)
- ✅ No backend LLM dependencies
- ✅ Works in cloud deployment
- ✅ User pays for LLM usage (BYOK)

---

### Local Mode (Server-Side)

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. User clicks compress
       ▼
┌─────────────────────┐
│  useCompression()   │ React Hook
└──────┬──────────────┘
       │ 2. Check feature flag
       │    claudeCodeEnabled = true
       ▼
┌─────────────────────┐
│  Convex Action      │ compression.compressWithClaudeCode()
│  (backend call)     │ Running on Convex backend (Node.js)
└──────┬──────────────┘
       │ 3. Execute subprocess
       ▼
┌─────────────────────┐
│ Claude Code CLI     │ exec("echo prompt | claude-code")
│ (local machine)     │ Runs on your computer
└──────┬──────────────┘
       │ 4. CLI returns compressed content
       ▼
┌─────────────────────┐
│  Convex Mutation    │ blocks.compress({blockId, compressedContent})
│  (save to DB)       │ Updates block in database
└──────┬──────────────┘
       │ 5. Reactive update
       ▼
┌─────────────────────┐
│   UI Re-renders     │ Shows compression badge
└─────────────────────┘
```

**Key Points:**
- ✅ LLM call happens **on backend** (subprocess)
- ✅ No API keys needed (Claude Code auth)
- ⚠️ Only works locally (requires CLI)
- ⚠️ Cannot deploy to cloud

---

## Implementation Files

### Already Implemented ✅

```
ContextForgeTS/
├── convex/
│   ├── schema.ts                    # ✅ Compression fields added
│   ├── blocks.ts                    # ✅ compress & compressAndMerge mutations
│   └── lib/
│       └── featureFlags.ts          # ✅ CLAUDE_CODE_ENABLED flag
│
├── src/
│   └── lib/
│       └── compression/
│           ├── types.ts             # ✅ TypeScript types
│           ├── compressionService.ts # ✅ Main service with routing
│           ├── strategies/
│           │   └── semantic.ts      # ✅ LLM-based compression
│           └── index.ts             # ✅ Public API
```

### To Be Implemented 🚧

```
ContextForgeTS/
├── convex/
│   └── compression.ts               # 🚧 TODO: Convex action for Claude Code
│
├── src/
│   ├── hooks/
│   │   └── useCompression.ts        # 🚧 TODO: React hook
│   │
│   └── components/
│       └── compression/
│           ├── CompressionDialog.tsx # 🚧 TODO: Main dialog
│           ├── MergeDialog.tsx       # 🚧 TODO: Multi-block merge UI
│           └── ZoneCompressionBtn.tsx # 🚧 TODO: Zone compress button
```

---

## Usage Examples

### Single Block Compression

```typescript
import { useCompression } from "@/hooks/useCompression"

function BlockCard({ block }) {
  const { compressSingle, isCompressing, result } = useCompression()

  const handleCompress = async () => {
    try {
      await compressSingle(block, "semantic")
      toast.success(`Saved ${result.tokensSaved} tokens!`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Card>
      <CardContent>{block.content}</CardContent>
      <CardActions>
        <Button
          onClick={handleCompress}
          disabled={isCompressing || block.isCompressed || block.tokens < 100}
        >
          {isCompressing ? "Compressing..." : "Compress"}
        </Button>
      </CardActions>

      {block.isCompressed && (
        <Badge>
          <Minimize2 className="w-3 h-3" />
          {block.compressionRatio.toFixed(1)}x
        </Badge>
      )}
    </Card>
  )
}
```

### Multi-Block Merge

```typescript
function BlockSelection({ selectedBlocks }) {
  const { compressAndMerge, isCompressing } = useCompression()

  const handleMerge = async () => {
    try {
      await compressAndMerge(selectedBlocks, {
        strategy: "semantic",
        targetZone: "WORKING",
        targetType: "NOTE",
      })
      toast.success("Blocks merged successfully!")
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <FloatingBar>
      <Button onClick={handleMerge} disabled={isCompressing}>
        Compress & Merge ({selectedBlocks.length})
      </Button>
    </FloatingBar>
  )
}
```

### Zone Compression

```typescript
function ZoneHeader({ zone, blocks }) {
  const { compressZone, isCompressing } = useCompression()

  const handleCompressZone = async () => {
    const confirmed = confirm(`Merge all ${blocks.length} blocks in ${zone}?`)
    if (!confirmed) return

    try {
      await compressZone({ zone, sessionId, strategy: "semantic" })
      toast.success(`${zone} zone compressed!`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="zone-header">
      <h3>{zone}</h3>
      <IconButton onClick={handleCompressZone} disabled={isCompressing}>
        <Minimize2 />
      </IconButton>
    </div>
  )
}
```

---

## Configuration

### Remote Mode Setup

1. **For Ollama:**
   ```bash
   # Start Ollama with CORS enabled
   OLLAMA_ORIGINS="*" ollama serve

   # Pull a model
   ollama pull llama3.2
   ```

   Configure in UI Settings:
   - Ollama URL: `http://localhost:11434`
   - Model: `llama3.2:latest`

2. **For OpenRouter:**
   - Get API key from https://openrouter.ai
   - Add to Settings page
   - Choose model (e.g., `anthropic/claude-sonnet-4`)

### Local Mode Setup

1. **Environment Variable:**
   ```bash
   # .env.local
   CLAUDE_CODE_ENABLED=true
   ```

2. **Convex Action** (to be implemented):
   ```typescript
   // convex/compression.ts
   export const compressWithClaudeCode = action({
     handler: async (ctx, args) => {
       // Execute Claude Code CLI
       const { stdout } = await execAsync(`echo ${prompt} | claude-code`)
       return stdout.trim()
     }
   })
   ```

---

## Testing Both Modes

### Test Client-Side (Ollama)

```bash
# Start Ollama
OLLAMA_ORIGINS="*" ollama serve

# Start app (NO Claude Code flag)
npm run dev

# In UI:
# 1. Go to Settings
# 2. Verify Ollama is connected
# 3. Compress a block
# 4. Check browser DevTools → Network tab
#    → Should see POST to localhost:11434
```

### Test Client-Side (OpenRouter)

```bash
# Start app (NO Claude Code flag)
npm run dev

# In UI:
# 1. Go to Settings
# 2. Add OpenRouter API key
# 3. Compress a block
# 4. Check browser DevTools → Network tab
#    → Should see POST to openrouter.ai
```

### Test Server-Side (Claude Code)

```bash
# Set feature flag
export CLAUDE_CODE_ENABLED=true

# Start app
npm run dev

# In UI:
# 1. Compress a block
# 2. Check terminal running Convex
#    → Should see action execution
# 3. Compression happens via Claude Code
```

---

## Troubleshooting

### Error: "Block too small to compress"
- **Cause:** Block has < 100 tokens
- **Fix:** Only compress blocks with substantial content

### Error: "Compression ratio too low"
- **Cause:** LLM didn't compress enough (< 1.2x ratio)
- **Fix:** Content might already be concise, or try different LLM model

### Error: "Ollama error: Failed to fetch"
- **Cause:** Ollama not running or CORS not enabled
- **Fix:** `OLLAMA_ORIGINS="*" ollama serve`

### Error: "OpenRouter error: 401"
- **Cause:** Invalid API key
- **Fix:** Check API key in Settings

### Error: "Claude Code not found"
- **Cause:** Claude Code CLI not installed or not in PATH
- **Fix:** Install Claude Code and ensure `claude-code` command works

---

## Performance Considerations

### Token Counting

We use **approximate counting** (`content.length / 4`) for speed:
- ✅ Very fast (no tokenizer library needed)
- ✅ Good enough for compression validation
- ⚠️ Not exact (could be ±10% off)

For exact counts, could integrate `tiktoken` later.

### Compression Speed

- **Ollama (local):** Fast (depends on GPU)
- **OpenRouter:** Medium (depends on network + API)
- **Claude Code:** Medium-fast (local subprocess)

### Caching

Currently no caching (future enhancement):
- Could cache compression results by content hash
- Avoid re-compressing same content
- TTL: 1 hour (from Python implementation)

---

## Security Considerations

### API Keys

- **Ollama:** No keys needed (localhost only)
- **OpenRouter:** Stored in `localStorage` (client-side only, never sent to Convex)
- **Claude Code:** Uses your system auth (no keys in code)

### Content Privacy

- **Client-side:** Content sent to user's chosen LLM provider
- **Server-side:** Content processed by Claude Code (stays local)

### Access Control

All mutations check `requireSessionAccess()` before compression:
```typescript
await requireSessionAccess(ctx, block.sessionId)
// Ensures user owns the session before modifying blocks
```

---

## Next Steps

1. ✅ Complete React hook implementation
2. ✅ Build UI components (dialogs, badges)
3. ✅ Implement Convex action for Claude Code
4. ✅ Add comprehensive error handling
5. ✅ Test both modes thoroughly
6. ✅ Document user setup guide

---

*For detailed flows and architecture, see [COMPRESSION_ARCHITECTURE.md](./COMPRESSION_ARCHITECTURE.md) and [COMPRESSION_SEQUENCE_DIAGRAMS.md](./COMPRESSION_SEQUENCE_DIAGRAMS.md).*
