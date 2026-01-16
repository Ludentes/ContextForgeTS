/**
 * Playwright global setup - runs once before all tests.
 */

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL || "http://127.0.0.1:3211"

async function globalSetup() {
  console.log("Resetting test data before test run...")

  const response = await fetch(`${CONVEX_SITE_URL}/testing/reset`, {
    method: "POST",
  })

  if (response.ok) {
    const result = await response.json()
    console.log(`Test data reset complete: ${result.deleted} records deleted`)
  } else {
    console.warn("Failed to reset test data:", await response.text())
  }
}

export default globalSetup
