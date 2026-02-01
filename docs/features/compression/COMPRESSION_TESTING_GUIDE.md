# Compression System Testing Guide

## Implementation Summary

The compression system has been fully implemented with the following features:

### ✅ Completed Features

1. **Schema & Types** - Database schema updates and TypeScript type definitions
2. **Convex Mutations** - `blocks.compress` and `blocks.compressAndMerge` mutations
3. **Compression Service** - Client-side compression with Ollama/OpenRouter support
4. **Claude Code Action** - Server-side compression via Claude Code CLI
5. **React Hook** - `useCompression` hook with automatic provider routing
6. **Single Block UI** - Compress button and compression badge on block cards
7. **Multi-Block Merge UI** - Selection checkboxes, floating action bar, and merge dialog
8. **Zone Compression UI** - Compress button on zone headers
9. **Toast Notifications** - Success/error notifications for all compression operations

---

## Testing Checklist

### Prerequisites

- [ ] Node.js and npm installed
- [ ] Convex account set up
- [ ] For local mode: Claude Code CLI installed
- [ ] For remote mode: Ollama OR OpenRouter API key

---

## Test 1: Remote Mode (Client-Side with Ollama)

### Setup

```bash
# Start Ollama with CORS enabled
OLLAMA_ORIGINS="*" ollama serve

# Pull a model
ollama pull llama3.2

# Start the app WITHOUT Claude Code flag
npm run dev
```

### Configuration

1. Go to **Settings** page
2. Configure Ollama:
   - URL: `http://localhost:11434`
   - Model: `llama3.2:latest`
3. Verify connection status shows green

### Test Single Block Compression

1. Create a block with at least 400 characters (100+ tokens)
2. Hover over the block to show actions
3. Click **Compress** button
4. Wait for compression to complete
5. Verify:
   - [ ] Toast notification shows "Block compressed!"
   - [ ] Compression badge appears with ratio (e.g., "2.5x")
   - [ ] Block content is replaced with compressed version
   - [ ] Token count is reduced

**Expected Network Activity:**
- Open browser DevTools → Network tab
- Should see POST to `http://localhost:11434/api/chat`
- Request contains the block content as prompt

### Test Multi-Block Merge

1. Select 3-5 blocks using checkboxes
2. Verify floating action bar appears at bottom
3. Click **Compress & Merge** button
4. In dialog:
   - [ ] Verify block count and total tokens
   - [ ] Choose target zone (e.g., WORKING)
   - [ ] Choose block type (e.g., note)
5. Click **Compress & Merge**
6. Verify:
   - [ ] Toast shows "Compression successful!"
   - [ ] Original blocks are deleted
   - [ ] New merged block appears with compression badge
   - [ ] Selection is cleared

### Test Zone Compression

1. Ensure a zone has 2+ blocks
2. Click **Compress** button on zone header
3. Verify compression dialog opens with all zone blocks
4. Confirm compression
5. Verify:
   - [ ] Toast shows "{Zone} zone compressed!"
   - [ ] All blocks merged into one
   - [ ] Compression badge shows ratio

---

## Test 2: Remote Mode (Client-Side with OpenRouter)

### Setup

```bash
# Start the app WITHOUT Claude Code flag
npm run dev
```

### Configuration

1. Go to **Settings** page
2. Get API key from https://openrouter.ai
3. Configure OpenRouter:
   - API Key: `sk-or-...`
   - Model: `anthropic/claude-sonnet-4`
4. Verify connection status shows green

### Test Compression

Follow the same test steps as Test 1, but verify:

**Expected Network Activity:**
- Should see POST to `https://openrouter.ai/api/v1/chat/completions`
- Request includes `Authorization: Bearer sk-or-...` header
- Request contains the compression prompt

---

## Test 3: Local Mode (Server-Side with Claude Code)

### Setup

```bash
# Set feature flag
export CLAUDE_CODE_ENABLED=true

# Start the app
npm run dev
```

### Prerequisites

- [ ] Claude Code CLI installed: `which claude-code`
- [ ] Claude Code authenticated: `claude-code --version`

### Test Single Block Compression

1. Create a block with at least 400 characters
2. Click **Compress** button
3. Verify:
   - [ ] Toast shows "Block compressed!"
   - [ ] Compression happens (may be slower than Ollama)
   - [ ] Block is compressed

**Expected Server Activity:**
- Check terminal running Convex
- Should see action execution: `compression.compressWithClaudeCode`
- Claude Code CLI is executed as subprocess

### Test Error Handling

1. **Block too small:**
   - Create block with < 100 tokens (~25 words)
   - Try to compress
   - Verify: Error toast "Block has only X tokens"

2. **Already compressed:**
   - Compress a block
   - Try to compress again
   - Verify: Compress button is hidden

3. **No API key (OpenRouter):**
   - Remove OpenRouter API key
   - Try to compress (should fall back to Ollama)
   - Verify: Uses Ollama or shows error

---

## Feature Flag Verification

### Check Feature Flag Response

```bash
# In browser console
const flags = await convex.query(api.features.getFlags)
console.log(flags)
// Should show: { claudeCodeEnabled: true/false, oauthEnabled: true/false }
```

### Verify Routing Logic

1. **With `CLAUDE_CODE_ENABLED=true`:**
   - Compression uses `compression.compressWithClaudeCode` action
   - No direct HTTP calls from browser to LLM providers

2. **With `CLAUDE_CODE_ENABLED=false`:**
   - Compression uses client-side `CompressionService`
   - Direct HTTP calls to Ollama or OpenRouter

---

## Common Issues & Fixes

### Issue: "Compression ratio too low"

**Cause:** Content already concise or LLM didn't compress enough
**Fix:** This is expected behavior for already-concise content

### Issue: "Ollama error: Failed to fetch"

**Cause:** Ollama not running or CORS not enabled
**Fix:**
```bash
OLLAMA_ORIGINS="*" ollama serve
```

### Issue: "OpenRouter error: 401"

**Cause:** Invalid API key
**Fix:** Check API key in Settings, regenerate if needed

### Issue: "Claude Code not found"

**Cause:** CLI not installed or not in PATH
**Fix:**
```bash
# Install Claude Code
npm install -g @anthropic/claude-code

# Verify installation
claude-code --version
```

### Issue: "Block compression succeeds but UI doesn't update"

**Cause:** Convex reactivity issue
**Fix:** Refresh page - mutations should trigger reactive updates

---

## Performance Benchmarks

Expected compression times:

| Mode | Provider | Block Size | Time |
|------|----------|------------|------|
| Client | Ollama (local GPU) | 500 tokens | 2-5s |
| Client | OpenRouter (Claude) | 500 tokens | 3-8s |
| Server | Claude Code | 500 tokens | 4-10s |

Expected compression ratios:

- **Verbose content:** 2.5x - 4.0x
- **Technical content:** 1.8x - 2.5x
- **Already concise:** 1.2x - 1.5x (or rejected)

---

## Next Steps After Testing

1. **Test in production:**
   - Deploy to Convex cloud
   - Test with real API keys
   - Verify CLAUDE_CODE_ENABLED=false in cloud

2. **Monitor usage:**
   - Check LLM API costs
   - Monitor compression success rates
   - Track token savings

3. **Future enhancements:**
   - Add compression preview before applying
   - Implement "undo compression"
   - Add compression analytics/stats
   - Batch compression for multiple zones
   - Custom compression targets (ratio, quality)

---

## Documentation

For detailed architecture and flows, see:
- [COMPRESSION_ARCHITECTURE.md](./COMPRESSION_ARCHITECTURE.md)
- [COMPRESSION_SEQUENCE_DIAGRAMS.md](./COMPRESSION_SEQUENCE_DIAGRAMS.md)
- [COMPRESSION_QUICK_START.md](./COMPRESSION_QUICK_START.md)

---

*Generated after TASK-010 implementation - all phases complete ✅*
