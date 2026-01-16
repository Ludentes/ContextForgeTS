# Reference Materials

Links and resources to consult during implementation.

## Convex + TanStack Integration

| Resource | URL | Notes |
|----------|-----|-------|
| TanStack Start Quickstart | https://docs.convex.dev/quickstart/tanstack-start | Official Convex + TanStack setup guide |
| Convex TanStack SaaS | https://github.com/get-convex/convex-saas | Reference for project structure (2 years old, don't copy directly) |
| Netlify TanStack Template | https://github.com/netlify-templates/tanstack-template | TanStack Router + Convex + Claude AI patterns |

## Drag and Drop

| Resource | URL | Notes |
|----------|-----|-------|
| **Trellaux Example** | https://tanstack.com/start/latest/docs/framework/react/examples/start-convex-trellaux | TanStack + Convex + drag-drop board - **key reference for DnD** |
| Trellaux Source Code | https://github.com/TanStack/router/tree/main/examples/react/start-convex-trellaux | Actual implementation code |

## Convex Documentation

| Resource | URL | Notes |
|----------|-----|-------|
| Convex Docs | https://docs.convex.dev/ | Main documentation |
| Schema Definition | https://docs.convex.dev/database/schemas | Database schema syntax |
| Queries & Mutations | https://docs.convex.dev/functions | Server functions |
| HTTP Actions | https://docs.convex.dev/functions/http-actions | For streaming endpoints |
| Testing with convex-test | https://docs.convex.dev/testing/convex-test | Unit testing Convex functions |
| File Storage | https://docs.convex.dev/file-storage | If we need file uploads |

## AI / LLM Integration

| Resource | URL | Notes |
|----------|-----|-------|
| Convex + Vercel AI SDK Streaming | https://www.arhamhumayun.com/blog/streamed-ai-response | Detailed streaming implementation |
| Vercel AI SDK Docs | https://ai-sdk.dev/ | Main AI SDK documentation |
| Convex AI Chat Template | https://www.convex.dev/templates (search "AI Chat") | Reference for chat persistence patterns |

## TanStack

| Resource | URL | Notes |
|----------|-----|-------|
| TanStack Router Docs | https://tanstack.com/router/latest/docs/framework/react/overview | Router documentation |
| TanStack Start Docs | https://tanstack.com/start/latest | Full-stack framework (if we want SSR later) |
| File-Based Routing | https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing | Route file conventions |

## UI Components

| Resource | URL | Notes |
|----------|-----|-------|
| shadcn/ui | https://ui.shadcn.com/ | Component library (copy-paste, not npm) |
| Tailwind CSS | https://tailwindcss.com/docs | Utility classes |
| @dnd-kit | https://dndkit.com/ | If Trellaux uses this for DnD |

## Token Counting (JS)

| Resource | URL | Notes |
|----------|-----|-------|
| gpt-tokenizer | https://www.npmjs.com/package/gpt-tokenizer | Pure JS tokenizer |
| tiktoken (WASM) | https://www.npmjs.com/package/tiktoken | Official OpenAI tokenizer |
| js-tiktoken | https://www.npmjs.com/package/js-tiktoken | Lighter alternative |

---

## Priority Reading Order

1. **TanStack Start Quickstart** - Get Convex + TanStack working
2. **Trellaux Example** - Study DnD patterns with Convex
3. **Convex + Vercel AI SDK Streaming** - LLM integration
4. **Schema Definition** - Design our data model
