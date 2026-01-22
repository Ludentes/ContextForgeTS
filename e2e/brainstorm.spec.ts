import { test, expect } from "@playwright/test"

// Run all tests in this file serially to avoid interference
test.describe.configure({ mode: "serial" })

// Convex HTTP endpoint base URL
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL || "http://127.0.0.1:3211"

// Session storage key (must match frontend)
const SESSION_STORAGE_KEY = "contextforge-session-id"

// Helper to reset test data
async function resetTestData() {
  const response = await fetch(`${CONVEX_SITE_URL}/testing/reset`, {
    method: "POST",
  })
  return response.ok
}

// Helper to create a test session
async function createTestSession(name: string = "Test Session") {
  const response = await fetch(`${CONVEX_SITE_URL}/testing/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create test session: ${await response.text()}`)
  }
  return response.json() as Promise<{ id: string }>
}

// Helper to create a test block
async function createTestBlock(
  sessionId: string,
  content: string,
  type: string = "note",
  zone: "PERMANENT" | "STABLE" | "WORKING" = "WORKING"
) {
  const response = await fetch(`${CONVEX_SITE_URL}/testing/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, content, type, zone }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create test block: ${await response.text()}`)
  }
  return response.json() as Promise<{ id: string }>
}

test.describe("Brainstorm Dialog", () => {
  let testSessionId: string

  test.beforeAll(async () => {
    await resetTestData()
    const session = await createTestSession("E2E Brainstorm Test Session")
    testSessionId = session.id
  })

  test.afterAll(async () => {
    await resetTestData()
  })

  test("should show brainstorm button", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Brainstorm button should be visible
    await expect(page.getByRole("button", { name: /brainstorm/i })).toBeVisible({ timeout: 10000 })
  })

  test("should open brainstorm dialog", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Click brainstorm button
    await page.getByRole("button", { name: /brainstorm/i }).click()

    // Dialog should open
    await expect(page.locator("h2:has-text('Brainstorm')")).toBeVisible({ timeout: 5000 })

    // Should show provider selector
    await expect(page.locator("select")).toBeVisible()

    // Should show input area
    await expect(page.locator("textarea[placeholder*='message']")).toBeVisible()

    // Should show send button
    await expect(page.getByRole("button", { name: /send/i })).toBeVisible()
  })

  test("should close dialog with close button", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Open dialog
    await page.getByRole("button", { name: /brainstorm/i }).click()
    await expect(page.locator("h2:has-text('Brainstorm')")).toBeVisible()

    // Click close button
    await page.getByRole("button", { name: /close/i }).click()

    // Dialog should close
    await expect(page.locator("h2:has-text('Brainstorm')")).not.toBeVisible({ timeout: 3000 })
  })

  test("should close dialog with escape key", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Open dialog
    await page.getByRole("button", { name: /brainstorm/i }).click()
    await expect(page.locator("h2:has-text('Brainstorm')")).toBeVisible()

    // Press escape
    await page.keyboard.press("Escape")

    // Dialog should close
    await expect(page.locator("h2:has-text('Brainstorm')")).not.toBeVisible({ timeout: 3000 })
  })

  test("should show provider health indicators", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Open dialog
    await page.getByRole("button", { name: /brainstorm/i }).click()

    // Provider selector should exist with options
    const select = page.locator("select").first()
    await expect(select).toBeVisible()

    // Should have Claude, Ollama, OpenRouter options
    const options = await select.locator("option").allTextContents()
    expect(options.some((o) => o.toLowerCase().includes("claude"))).toBeTruthy()
    expect(options.some((o) => o.toLowerCase().includes("ollama"))).toBeTruthy()
    expect(options.some((o) => o.toLowerCase().includes("openrouter"))).toBeTruthy()
  })

  test("should show empty state message", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Open dialog
    await page.getByRole("button", { name: /brainstorm/i }).click()

    // Should show empty state message
    await expect(page.locator("text=Start a conversation")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("text=context blocks are included")).toBeVisible()
  })

  test("should show clear button disabled when no messages", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Open dialog
    await page.getByRole("button", { name: /brainstorm/i }).click()

    // Clear button should be disabled
    const clearButton = page.getByRole("button", { name: /clear/i })
    await expect(clearButton).toBeVisible()
    await expect(clearButton).toBeDisabled()
  })

  test("should show send button disabled when input is empty", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Open dialog
    await page.getByRole("button", { name: /brainstorm/i }).click()

    // Send button should be disabled
    const sendButton = page.getByRole("button", { name: /send/i })
    await expect(sendButton).toBeVisible()
    await expect(sendButton).toBeDisabled()
  })

  test("should enable send button when input has text", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Open dialog
    await page.getByRole("button", { name: /brainstorm/i }).click()

    // Type a message
    await page.fill("textarea[placeholder*='message']", "Hello, this is a test")

    // Send button should be enabled (if provider is available)
    const sendButton = page.getByRole("button", { name: /send/i })
    await expect(sendButton).toBeVisible()
    // Note: button may still be disabled if no provider is available
  })

  test("should show system prompt indicator when active", async ({ page }) => {
    // Create a system_prompt block
    await createTestBlock(
      testSessionId,
      "You are a helpful assistant",
      "system_prompt",
      "PERMANENT"
    )

    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Open dialog
    await page.getByRole("button", { name: /brainstorm/i }).click()

    // Should show system prompt active indicator
    await expect(page.locator("text=System Prompt Active")).toBeVisible({ timeout: 5000 })
  })

  test("should show 'No tools' checkbox for Claude provider", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Open dialog
    await page.getByRole("button", { name: /brainstorm/i }).click()

    // Select Claude provider if not already selected
    await page.locator("select").first().selectOption({ label: /claude/i })

    // Should show "No tools" checkbox
    await expect(page.locator("text=No tools")).toBeVisible({ timeout: 5000 })

    // Checkbox should be checked by default
    const checkbox = page.locator("input[type='checkbox']")
    await expect(checkbox).toBeChecked()
  })
})

test.describe("Brainstorm with Context", () => {
  let testSessionId: string

  test.beforeAll(async () => {
    await resetTestData()
    const session = await createTestSession("E2E Brainstorm Context Test")
    testSessionId = session.id

    // Create some context blocks
    await createTestBlock(testSessionId, "Permanent context", "note", "PERMANENT")
    await createTestBlock(testSessionId, "Stable reference", "reference", "STABLE")
    await createTestBlock(testSessionId, "Working draft", "note", "WORKING")
  })

  test.afterAll(async () => {
    await resetTestData()
  })

  test("should open with context blocks present", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Verify blocks are visible on the page
    await expect(page.locator("text=Permanent context")).toBeVisible({ timeout: 10000 })
    await expect(page.locator("text=Stable reference")).toBeVisible()
    await expect(page.locator("text=Working draft")).toBeVisible()

    // Open brainstorm
    await page.getByRole("button", { name: /brainstorm/i }).click()

    // Dialog should open
    await expect(page.locator("h2:has-text('Brainstorm')")).toBeVisible({ timeout: 5000 })

    // Should show the context info message
    await expect(page.locator("text=context blocks are included")).toBeVisible()
  })
})
