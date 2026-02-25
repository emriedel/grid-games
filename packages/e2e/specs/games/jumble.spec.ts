import { test, expect } from '@playwright/test';
import { JumblePage, LandingPage } from '../../page-objects';

/**
 * Jumble game-specific tests.
 * Tests basic game functionality and UI.
 */
test.describe('Jumble Game', () => {
  // Only run on jumble project
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('jumble'), 'Jumble-only test');
  });

  test.describe('Game UI', () => {
    test.beforeEach(async ({ context }) => {
      await context.clearCookies();
    });

    test('landing page shows game name', async ({ page }) => {
      await page.goto('/');
      const landing = new LandingPage(page);
      await landing.waitForLoad();

      const gameName = await landing.getGameName();
      expect(gameName.toLowerCase()).toContain('jumble');
    });

    test('can load puzzle #1 from archive', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const jumble = new JumblePage(page);
      await jumble.waitForBoard();

      // Board should be visible
      await expect(jumble.gameBoard).toBeVisible();
    });

    test('shows 5x5 grid of tiles', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const jumble = new JumblePage(page);
      await jumble.waitForBoard();

      // Should have 25 tiles (5x5)
      const tileCount = await jumble.tiles.count();
      expect(tileCount).toBe(25);
    });

    test('tiles have letter content', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const jumble = new JumblePage(page);
      await jumble.waitForBoard();

      // Get first tile's text
      const firstTile = jumble.tiles.first();
      const tileText = await firstTile.textContent();
      // Should contain a letter (may also have point value)
      expect(tileText).toBeTruthy();
      expect(tileText?.length).toBeGreaterThan(0);
    });

    test('shows timer', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const jumble = new JumblePage(page);
      await jumble.waitForBoard();

      // Timer should be visible
      await expect(jumble.timer).toBeVisible();
    });

    test('timer displays time format', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const jumble = new JumblePage(page);
      await jumble.waitForBoard();

      // Timer text should contain time (like "1:30" or "90")
      const timerText = await jumble.timer.textContent();
      expect(timerText).toBeTruthy();
      // Should match time format (m:ss or just seconds)
      expect(timerText).toMatch(/\d/);
    });

    test('tiles have position data attributes', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const jumble = new JumblePage(page);
      await jumble.waitForBoard();

      // First tile should have data-row and data-col
      const firstTile = jumble.tiles.first();
      const row = await firstTile.getAttribute('data-row');
      const col = await firstTile.getAttribute('data-col');

      expect(row).toBeTruthy();
      expect(col).toBeTruthy();
    });
  });
});
