# Compression System - Sequence Diagrams

This document provides detailed sequence diagrams for both client-side and server-side compression flows.

---

## Scenario 1: Client-Side Compression with Ollama

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Component<br/>(BlockCard)
    participant Hook as useCompression<br/>Hook
    participant Service as CompressionService
    participant Ollama as Ollama API<br/>(localhost:11434)
    participant Mutation as Convex Mutation<br/>(blocks.compress)
    participant DB as Convex Database

    User->>UI: Click "Compress" button
    UI->>Hook: compressSingle(block, "semantic")

    Note over Hook: Create CompressionService<br/>(auto-detects provider)
    Hook->>Service: new CompressionService()
    Service-->>Hook: service instance<br/>(provider: "ollama")

    Hook->>Service: compressBlock(block, "semantic")

    Note over Service: Validate block
    Service->>Service: Check isCompressed
    Service->>Service: Check tokens >= 100
    Service->>Service: Check content exists

    Note over Service: Compress content
    Service->>Service: compressContent(content, "semantic")
    Service->>Service: compressSemantic()
    Service->>Service: formatPrompt(content)
    Service->>Service: compressWithOllama(prompt)

    Service->>Ollama: POST /api/chat<br/>{messages, stream: true}

    Note over Ollama: LLM processes<br/>compression request

    Ollama-->>Service: Stream chunk 1: "Here"
    Ollama-->>Service: Stream chunk 2: " is"
    Ollama-->>Service: Stream chunk 3: " the"
    Ollama-->>Service: Stream chunk N: "..."
    Ollama-->>Service: Stream complete

    Note over Service: Accumulate chunks
    Service->>Service: compressed = chunks.join()

    Note over Service: Count tokens
    Service->>Service: originalTokens = estimateTokens(original)
    Service->>Service: compressedTokens = estimateTokens(compressed)
    Service->>Service: ratio = original / compressed

    Note over Service: Validate compression
    Service->>Service: if (ratio < 1.2) fail
    Service->>Service: estimateQuality(original, compressed)
    Service->>Service: if (quality < 0.6) fail

    Service-->>Hook: CompressionResult<br/>{success: true, compressedContent, ratio}

    Note over Hook: Save to database
    Hook->>Mutation: compress({<br/>  blockId,<br/>  compressedContent,<br/>  originalTokens,<br/>  compressedTokens,<br/>  compressionRatio,<br/>  strategy<br/>})

    Mutation->>DB: ctx.db.get(blockId)
    DB-->>Mutation: block

    Mutation->>Mutation: requireSessionAccess()

    Mutation->>DB: ctx.db.patch(blockId, {<br/>  content: compressed,<br/>  isCompressed: true,<br/>  compressionRatio,<br/>  tokens,<br/>  originalTokens<br/>})

    DB-->>Mutation: success
    Mutation-->>Hook: {success: true}

    Hook-->>UI: Compression complete

    Note over UI,DB: Convex reactivity triggers<br/>UI re-render

    UI->>UI: Show compression badge<br/>"2.5x"
```

---

## Scenario 2: Client-Side Compression with OpenRouter

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Component
    participant Hook as useCompression<br/>Hook
    participant Service as CompressionService
    participant OR as OpenRouter API<br/>(openrouter.ai)
    participant Mutation as Convex Mutation
    participant DB as Convex Database

    User->>UI: Click "Compress" button
    UI->>Hook: compressSingle(block, "semantic")

    Note over Hook: Check localStorage for<br/>OpenRouter API key
    Hook->>Service: new CompressionService()
    Note over Service: Detects OpenRouter configured<br/>provider = "openrouter"
    Service-->>Hook: service instance

    Hook->>Service: compressBlock(block, "semantic")

    Note over Service: Validation (same as Ollama)

    Service->>Service: compressSemantic()
    Service->>Service: compressWithOpenRouter(prompt)

    Note over Service: Get API key from localStorage

    Service->>OR: POST /api/v1/chat/completions<br/>Authorization: Bearer sk-or-...<br/>{model, messages, stream: true}

    Note over OR: Claude Sonnet 4<br/>processes compression

    OR-->>Service: Stream chunk 1: "Here"
    OR-->>Service: Stream chunk 2: " is"
    OR-->>Service: Stream chunk N: "..."
    OR-->>Service: Stream complete<br/>(includes usage stats)

    Service->>Service: Validate & count tokens
    Service-->>Hook: CompressionResult

    Hook->>Mutation: compress({...})
    Mutation->>DB: Update block
    DB-->>Mutation: success
    Mutation-->>Hook: success
    Hook-->>UI: Complete
    UI->>UI: Show badge
```

---

## Scenario 3: Server-Side Compression with Claude Code (Local Mode)

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Component
    participant Hook as useCompression<br/>Hook
    participant FlagQuery as Convex Query<br/>(features.getFlags)
    participant Action as Convex Action<br/>(compression.compressWithClaudeCode)
    participant CLI as Claude Code CLI<br/>(subprocess)
    participant Mutation as Convex Mutation<br/>(blocks.compress)
    participant DB as Convex Database

    User->>UI: Click "Compress" button
    UI->>Hook: compressSingle(block, "semantic")

    Note over Hook: Check deployment mode
    Hook->>FlagQuery: useQuery(api.features.getFlags)
    FlagQuery-->>Hook: {claudeCodeEnabled: true}

    Note over Hook: Server-side mode detected!

    Hook->>Action: useAction(api.compression.compressWithClaudeCode)<br/>({blockId, strategy: "semantic"})

    Note over Action: Running on Convex backend<br/>(Node.js, local machine)

    Action->>Action: ctx.runQuery(api.blocks.get, {id})
    Note over Action,DB: Fetch block data
    Action->>DB: Get block
    DB-->>Action: block data

    Action->>Action: Validate block<br/>(isCompressed, tokens >= 100)

    Note over Action: Build compression prompt
    Action->>Action: Build prompt with content

    Note over Action: Call Claude Code CLI via child_process
    Action->>CLI: exec("echo prompt | claude-code --no-streaming")

    Note over CLI: Claude Code CLI<br/>runs on local machine

    CLI->>CLI: Process prompt with<br/>local Claude API

    CLI-->>Action: stdout: compressed content

    Note over Action: Process result
    Action->>Action: Count tokens<br/>(original vs compressed)
    Action->>Action: Calculate ratio
    Action->>Action: Validate ratio >= 1.2

    Note over Action: Save to database
    Action->>Mutation: ctx.runMutation(api.blocks.compress, {<br/>  blockId,<br/>  compressedContent,<br/>  originalTokens,<br/>  compressedTokens,<br/>  compressionRatio,<br/>  strategy<br/>})

    Mutation->>DB: ctx.db.patch(blockId, {...})
    DB-->>Mutation: success
    Mutation-->>Action: success

    Action-->>Hook: {<br/>  success: true,<br/>  originalTokens,<br/>  compressedTokens,<br/>  compressionRatio,<br/>  tokensSaved<br/>}

    Hook-->>UI: Compression complete

    Note over UI,DB: Convex reactivity<br/>triggers UI update

    UI->>UI: Show compression badge
```

---

## Scenario 4: Multi-Block Merge Compression (Client-Side)

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Component<br/>(CompressionDialog)
    participant Hook as useCompression Hook
    participant Service as CompressionService
    participant LLM as LLM Provider<br/>(Ollama/OpenRouter)
    participant Mutation as Convex Mutation<br/>(blocks.compressAndMerge)
    participant DB as Convex Database

    User->>UI: Select 5 blocks
    User->>UI: Click "Compress & Merge"
    UI->>UI: Show merge dialog
    User->>UI: Confirm merge

    UI->>Hook: compressAndMerge(blocks, {<br/>  strategy: "semantic",<br/>  targetZone: "WORKING",<br/>  targetType: "NOTE"<br/>})

    Note over Hook: Combine block contents
    Hook->>Hook: combinedContent = blocks.map(...).join()

    Note over Hook: Example combined content:<br/>"## Block 1 Title\nContent 1\n\n---\n\n## Block 2 Title\nContent 2..."

    Hook->>Service: compressText(combinedContent, "semantic")

    Service->>Service: compressSemantic(combinedContent)
    Service->>LLM: POST /api/chat<br/>{messages: [prompt with combined content]}

    Note over LLM: Compress ALL blocks<br/>into single summary

    LLM-->>Service: Compressed combined content

    Service->>Service: Count tokens for combined content
    Service-->>Hook: {<br/>  compressedContent,<br/>  originalTokens: 15000,<br/>  compressedTokens: 5000,<br/>  compressionRatio: 3.0<br/>}

    Note over Hook: Save merged block,<br/>delete originals

    Hook->>Mutation: compressAndMerge({<br/>  blockIds: [id1, id2, id3, id4, id5],<br/>  compressedContent,<br/>  originalTokens,<br/>  compressedTokens,<br/>  compressionRatio,<br/>  strategy: "semantic",<br/>  targetZone: "WORKING",<br/>  targetType: "NOTE",<br/>  targetPosition: 0<br/>})

    Mutation->>DB: Verify all blocks exist
    Mutation->>DB: Check session access

    Note over Mutation: Atomic operation:<br/>Create new + Delete old

    Mutation->>DB: ctx.db.insert("blocks", {<br/>  content: compressedContent,<br/>  isCompressed: true,<br/>  mergedFromCount: 5,<br/>  compressionRatio: 3.0,<br/>  ...<br/>})

    DB-->>Mutation: newBlockId

    Mutation->>DB: ctx.db.delete(id1)
    Mutation->>DB: ctx.db.delete(id2)
    Mutation->>DB: ctx.db.delete(id3)
    Mutation->>DB: ctx.db.delete(id4)
    Mutation->>DB: ctx.db.delete(id5)

    Mutation-->>Hook: {<br/>  success: true,<br/>  newBlockId,<br/>  blocksDeleted: 5<br/>}

    Hook-->>UI: Merge complete

    Note over UI: Show results:<br/>"Merged 5 blocks, saved 10,000 tokens"

    UI->>UI: Display new merged block<br/>with badge: "3.0x • Merged from 5"
```

---

## Scenario 5: Zone Compression (All Blocks in Zone)

```mermaid
sequenceDiagram
    participant User
    participant ZoneHeader as Zone Header<br/>(WORKING zone)
    participant Dialog as Compression Dialog
    participant Hook as useCompression Hook
    participant Query as Convex Query<br/>(blocks.listByZone)
    participant Service as CompressionService
    participant LLM as LLM Provider
    participant Mutation as Convex Mutation
    participant DB as Convex Database

    User->>ZoneHeader: Click compress icon
    ZoneHeader->>Query: listByZone({sessionId, zone: "WORKING"})
    Query->>DB: Get all blocks in WORKING zone
    DB-->>Query: [15 blocks]
    Query-->>ZoneHeader: blocks

    ZoneHeader->>Dialog: Open zone compression dialog<br/>(15 blocks, 8500 tokens total)

    Dialog->>User: Show warning:<br/>"Merge 15 blocks into 1?"
    User->>Dialog: Confirm

    Dialog->>Hook: compressZone({<br/>  zone: "WORKING",<br/>  sessionId,<br/>  strategy: "semantic"<br/>})

    Note over Hook: Same as multi-block merge,<br/>but for entire zone

    Hook->>Hook: Combine all 15 block contents
    Hook->>Service: compressText(combined, "semantic")
    Service->>LLM: Compress combined content
    LLM-->>Service: Single compressed summary
    Service-->>Hook: Result

    Hook->>Mutation: compressAndMerge({<br/>  blockIds: [all 15 IDs],<br/>  targetZone: "WORKING",<br/>  ...<br/>})

    Note over Mutation: Create 1 block,<br/>delete 15 blocks

    Mutation->>DB: Atomic transaction
    DB-->>Mutation: success
    Mutation-->>Hook: {newBlockId, blocksDeleted: 15}

    Hook-->>Dialog: Complete
    Dialog->>User: "WORKING zone compressed:<br/>15 blocks → 1 block<br/>Saved 6,000 tokens (71%)"

    Note over ZoneHeader: Zone now contains<br/>single compressed block
```

---

## Error Handling Flow

```mermaid
sequenceDiagram
    participant UI
    participant Hook
    participant Service
    participant LLM as LLM Provider<br/>(Ollama/OpenRouter)

    UI->>Hook: compressSingle(block)
    Hook->>Service: compressBlock(block)

    alt Block already compressed
        Service-->>Hook: {success: false,<br/>error: "Already compressed"}
        Hook-->>UI: Show error toast

    else Block too small (< 100 tokens)
        Service-->>Hook: {success: false,<br/>error: "Block has only 50 tokens"}
        Hook-->>UI: Show error toast

    else LLM call fails
        Service->>LLM: POST /api/chat
        LLM-->>Service: Error 500 (or timeout)
        Service-->>Hook: {success: false,<br/>error: "Ollama error: 500"}
        Hook-->>UI: Show error toast

    else Compression ratio too low
        Service->>LLM: POST /api/chat
        LLM-->>Service: Compressed content
        Note over Service: ratio = 1.1 (< 1.2 minimum)
        Service-->>Hook: {success: false,<br/>error: "Ratio 1.1x below minimum"}
        Hook-->>UI: Show warning:<br/>"Compression not effective"

    else Quality too low
        Note over Service: Only 30% of important<br/>words preserved
        Service-->>Hook: {success: false,<br/>error: "Quality 30% too low"}
        Hook-->>UI: Show error toast

    else Success
        Service->>LLM: POST /api/chat
        LLM-->>Service: Good compressed content
        Service-->>Hook: {success: true, ratio: 2.5}
        Hook->>Hook: Save to Convex
        Hook-->>UI: Show success toast:<br/>"Saved 500 tokens"
    end
```

---

## Feature Flag Decision Flow

```mermaid
graph TD
    Start[User clicks Compress] --> CheckFlags{Check Feature Flags}

    CheckFlags -->|CLAUDE_CODE_ENABLED=true| ServerSide[Server-Side Mode]
    CheckFlags -->|CLAUDE_CODE_ENABLED=false| ClientSide[Client-Side Mode]

    ServerSide --> ConvexAction[Call Convex Action]
    ConvexAction --> ClaudeCLI[Execute Claude Code CLI]
    ClaudeCLI --> SaveResult[Save to Convex DB]

    ClientSide --> DetectProvider{Detect Provider}
    DetectProvider -->|OpenRouter key found| UseOpenRouter[Use OpenRouter API]
    DetectProvider -->|No OR key| UseOllama[Use Ollama API<br/>default]

    UseOpenRouter --> CompressClient[Client-side Compression]
    UseOllama --> CompressClient
    CompressClient --> SaveResult

    SaveResult --> UpdateUI[Update UI<br/>Show Badge]

    style ServerSide fill:#e1f5ff
    style ClientSide fill:#fff3e1
    style UpdateUI fill:#e8f5e9
```

---

## Token Flow Visualization

```mermaid
graph LR
    subgraph "Before Compression"
        B1[Block 1<br/>500 tokens]
        B2[Block 2<br/>300 tokens]
        B3[Block 3<br/>700 tokens]
    end

    B1 --> Merge[Combine Content<br/>1500 tokens total]
    B2 --> Merge
    B3 --> Merge

    Merge --> LLM[LLM Compression<br/>Target: 2.0x ratio]

    LLM --> Result[Compressed Block<br/>600 tokens<br/>2.5x ratio]

    Result --> Save[Save to DB<br/>isCompressed: true<br/>mergedFromCount: 3]

    style Merge fill:#fff9c4
    style LLM fill:#e1bee7
    style Result fill:#c8e6c9
    style Save fill:#b2dfdb
```

---

*These diagrams provide complete visual documentation of all compression flows.*
