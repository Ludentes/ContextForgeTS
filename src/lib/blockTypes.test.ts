/**
 * Unit tests for block types utilities.
 */
import { describe, it, expect } from "vitest"
import {
  BLOCK_TYPES,
  BLOCK_TYPE_METADATA,
  getBlockTypesByCategory,
  getBlockTypeMetadata,
  isValidBlockType,
  CATEGORY_LABELS,
  type BlockType,
} from "./blockTypes"

describe("BLOCK_TYPES", () => {
  it("contains 12 block types", () => {
    expect(BLOCK_TYPES).toHaveLength(12)
  })

  it("includes all expected types", () => {
    const expectedTypes = [
      "system_prompt",
      "note",
      "code",
      "guideline",
      "template",
      "reference",
      "document",
      "user_message",
      "assistant_message",
      "instruction",
      "persona",
      "framework",
    ]
    expect(BLOCK_TYPES).toEqual(expect.arrayContaining(expectedTypes))
  })
})

describe("BLOCK_TYPE_METADATA", () => {
  it("has metadata for all block types", () => {
    for (const type of BLOCK_TYPES) {
      expect(BLOCK_TYPE_METADATA[type]).toBeDefined()
    }
  })

  it("each metadata has required properties", () => {
    for (const type of BLOCK_TYPES) {
      const meta = BLOCK_TYPE_METADATA[type]
      expect(meta.displayName).toBeTruthy()
      expect(meta.description).toBeTruthy()
      expect(["PERMANENT", "STABLE", "WORKING"]).toContain(meta.defaultZone)
      expect(["core", "document", "conversation", "meta"]).toContain(meta.category)
      expect(meta.icon).toBeTruthy()
      expect(meta.color).toBeTruthy()
    }
  })

  it("system_prompt has PERMANENT as default zone", () => {
    expect(BLOCK_TYPE_METADATA.system_prompt.defaultZone).toBe("PERMANENT")
  })

  it("note has WORKING as default zone", () => {
    expect(BLOCK_TYPE_METADATA.note.defaultZone).toBe("WORKING")
  })

  it("template has STABLE as default zone", () => {
    expect(BLOCK_TYPE_METADATA.template.defaultZone).toBe("STABLE")
  })
})

describe("getBlockTypesByCategory", () => {
  it("returns all 4 categories", () => {
    const categories = getBlockTypesByCategory()
    expect(Object.keys(categories)).toEqual(["core", "document", "conversation", "meta"])
  })

  it("groups types correctly", () => {
    const categories = getBlockTypesByCategory()

    expect(categories.core).toContain("system_prompt")
    expect(categories.core).toContain("note")
    expect(categories.core).toContain("code")

    expect(categories.document).toContain("guideline")
    expect(categories.document).toContain("template")
    expect(categories.document).toContain("reference")
    expect(categories.document).toContain("document")

    expect(categories.conversation).toContain("user_message")
    expect(categories.conversation).toContain("assistant_message")
    expect(categories.conversation).toContain("instruction")

    expect(categories.meta).toContain("persona")
    expect(categories.meta).toContain("framework")
  })

  it("total types across categories equals BLOCK_TYPES length", () => {
    const categories = getBlockTypesByCategory()
    const total = Object.values(categories).flat().length
    expect(total).toBe(BLOCK_TYPES.length)
  })
})

describe("getBlockTypeMetadata", () => {
  it("returns correct metadata for known types", () => {
    const meta = getBlockTypeMetadata("note")
    expect(meta.displayName).toBe("Note")
    expect(meta.category).toBe("core")
  })

  it("returns fallback metadata for unknown types", () => {
    const meta = getBlockTypeMetadata("UNKNOWN_TYPE")
    expect(meta.displayName).toBe("UNKNOWN_TYPE")
    expect(meta.description).toBe("Unknown block type")
    expect(meta.defaultZone).toBe("WORKING")
    expect(meta.category).toBe("core")
    expect(meta.icon).toBe("HelpCircle")
  })

  it("handles legacy uppercase types as unknown", () => {
    const meta = getBlockTypeMetadata("NOTE")
    expect(meta.displayName).toBe("NOTE")
    expect(meta.description).toBe("Unknown block type")
  })
})

describe("isValidBlockType", () => {
  it("returns true for valid block types", () => {
    expect(isValidBlockType("note")).toBe(true)
    expect(isValidBlockType("system_prompt")).toBe(true)
    expect(isValidBlockType("code")).toBe(true)
    expect(isValidBlockType("assistant_message")).toBe(true)
  })

  it("returns false for invalid types", () => {
    expect(isValidBlockType("invalid")).toBe(false)
    expect(isValidBlockType("NOTE")).toBe(false) // Case sensitive
    expect(isValidBlockType("")).toBe(false)
    expect(isValidBlockType("ASSISTANT")).toBe(false) // Legacy type
  })
})

describe("CATEGORY_LABELS", () => {
  it("has labels for all categories", () => {
    expect(CATEGORY_LABELS.core).toBe("Core")
    expect(CATEGORY_LABELS.document).toBe("Documents")
    expect(CATEGORY_LABELS.conversation).toBe("Conversation")
    expect(CATEGORY_LABELS.meta).toBe("Meta")
  })
})
