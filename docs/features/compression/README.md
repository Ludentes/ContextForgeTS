# Compression Feature Documentation

Multi-provider block compression system for token reduction.

## Documentation Files

| File | Purpose |
|------|---------|
| [COMPRESSION_QUICK_START.md](./COMPRESSION_QUICK_START.md) | **Start here** - Quick setup and usage guide |
| [COMPRESSION_ARCHITECTURE.md](./COMPRESSION_ARCHITECTURE.md) | System architecture and design decisions |
| [COMPRESSION_SEQUENCE_DIAGRAMS.md](./COMPRESSION_SEQUENCE_DIAGRAMS.md) | Flow diagrams for compression operations |
| [COMPRESSION_TESTING_GUIDE.md](./COMPRESSION_TESTING_GUIDE.md) | Testing strategies and examples |
| [DESIGN.md](./DESIGN.md) | Original design proposal and rationale |

## Quick Links

- **Implementation Task**: [TASK-010](../../completed/tasks/TASK-010-compression-system.md) ✅ Completed
- **Code Location**: `src/lib/compression/`, `convex/compression.ts`
- **User Settings**: Settings page → Compression Provider section

## Status

✅ **Completed** (2026-01-30)

### Features Implemented
- Multi-provider support (Claude Code, OpenRouter, Ollama)
- Server-side compression (Claude Code via Convex actions)
- Client-side compression (OpenRouter/Ollama via browser)
- Re-compression support with quality warnings
- User-configurable provider selection
- Single block and multi-block (zone) compression
- Comprehensive error handling and logging

### Configuration
See [COMPRESSION_QUICK_START.md](./COMPRESSION_QUICK_START.md) for setup instructions.
