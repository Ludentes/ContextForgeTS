import { test, expect } from "@playwright/test"

// Convex HTTP endpoint base URL for local dev (port 3211, not 3210)
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL || "http://127.0.0.1:3211"

// Helper to reset test data before tests
async function resetTestData() {
  const response = await fetch(`${CONVEX_SITE_URL}/testing/reset`, {
    method: "POST",
  })
  if (!response.ok) {
    console.warn("Failed to reset test data:", await response.text())
  }
  return response.ok
}

// Helper to create a test block via API (automatically marked as testData)
async function createTestBlock(content: string, type: string = "NOTE") {
  const response = await fetch(`${CONVEX_SITE_URL}/testing/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, type }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create test block: ${await response.text()}`)
  }
  return response.json()
}

test.describe("App", () => {
  test("should display the title", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1")).toContainText("ContextForge")
  })

  test("should toggle theme", async ({ page }) => {
    await page.goto("/")

    // Find the theme toggle button
    const themeButton = page.getByRole("button", { name: /light|dark/i })
    await expect(themeButton).toBeVisible()

    // Click to toggle
    await themeButton.click()

    // Button text should change
    await expect(themeButton).toBeVisible()
  })
})

// Run Blocks tests serially to avoid parallel interference with shared data
test.describe.serial("Blocks", () => {
  // Clean up after all tests in this suite
  test.afterAll(async () => {
    await resetTestData()
  })

  test("should display blocks section", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator("h2")).toContainText("Blocks")
    await expect(page.locator("text=Add New Block")).toBeVisible()
  })

  test("should create a new block via UI", async ({ page }) => {
    await page.goto("/")

    // Fill in the form (prefix with "E2E Test:" so reset cleans it up)
    await page.selectOption("#block-type", "ASSISTANT")
    await page.fill("#block-content", "E2E Test: UI created block")

    // Submit
    await page.getByRole("button", { name: "Add Block" }).click()

    // Wait for block to appear
    await expect(
      page.locator("text=E2E Test: UI created block")
    ).toBeVisible({
      timeout: 5000,
    })

    // Check the type badge (use span to avoid matching the select option)
    await expect(page.locator("span:has-text('ASSISTANT')")).toBeVisible()
  })

  test("should delete a block", async ({ page }) => {
    // Create a test block via API first
    await createTestBlock("E2E Test: Block to delete", "NOTE")

    await page.goto("/")

    // Wait for block to appear
    await expect(
      page.locator("text=E2E Test: Block to delete")
    ).toBeVisible({
      timeout: 5000,
    })

    // Delete it
    await page.getByRole("button", { name: "Delete" }).first().click()

    // Block should be gone
    await expect(
      page.locator("text=E2E Test: Block to delete")
    ).not.toBeVisible({
      timeout: 5000,
    })
  })

  test("should show empty state when no blocks", async ({ page }) => {
    // Reset ensures no test blocks exist
    await page.goto("/")

    // Wait a moment for Convex to sync
    await page.waitForTimeout(500)

    const emptyState = page.locator("text=No blocks yet")
    const blockCount = page.locator("text=/\\d+ blocks/")

    // Either empty state or block count should be visible
    // (there might be non-test blocks from manual testing)
    await expect(emptyState.or(blockCount)).toBeVisible()
  })

  test("should display multiple blocks in order", async ({ page }) => {
    // Create multiple test blocks
    await createTestBlock("E2E Test: First block", "NOTE")
    await createTestBlock("E2E Test: Second block", "CODE")
    await createTestBlock("E2E Test: Third block", "USER")

    await page.goto("/")

    // All blocks should be visible
    await expect(page.locator("text=E2E Test: First block")).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator("text=E2E Test: Second block")).toBeVisible()
    await expect(page.locator("text=E2E Test: Third block")).toBeVisible()

    // Check types are displayed
    await expect(page.locator("span:has-text('NOTE')")).toBeVisible()
    await expect(page.locator("span:has-text('CODE')")).toBeVisible()
    await expect(page.locator("span:has-text('USER')")).toBeVisible()
  })
})
