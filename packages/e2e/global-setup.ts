import { chromium, type FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests.
 * Runs once before all tests.
 */
async function globalSetup(config: FullConfig) {
  console.log('Running global setup...');

  // Optionally pre-warm the servers by hitting them
  // This ensures they're fully loaded before tests run
  const ports = [3001, 3002, 3004, 3005, 3006];

  const browser = await chromium.launch();
  const context = await browser.newContext();

  for (const port of ports) {
    try {
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/`, { timeout: 30000 });
      await page.close();
      console.log(`Pre-warmed server on port ${port}`);
    } catch (e) {
      console.log(`Could not pre-warm port ${port} (may not be running yet)`);
    }
  }

  await context.close();
  await browser.close();

  console.log('Global setup complete');
}

export default globalSetup;
