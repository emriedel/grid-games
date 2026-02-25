import { test, expect } from '@playwright/test';
import { DabblePage, LandingPage } from '../../page-objects';

/**
 * Dabble game-specific tests.
 * Tests basic game functionality and UI.
 */
test.describe('Dabble Game', () => {
  // Only run on dabble project
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('dabble'), 'Dabble-only test');
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
      expect(gameName.toLowerCase()).toContain('dabble');
    });

    test('can load puzzle #1 from archive', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const dabble = new DabblePage(page);
      await dabble.waitForBoard();

      // Board should be visible
      await expect(dabble.gameBoard).toBeVisible();
    });

    test('shows letter rack with tiles', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const dabble = new DabblePage(page);
      await dabble.waitForBoard();

      // Letter rack should have tiles (buttons with single letters)
      await expect(dabble.letterRack).toBeVisible();
      const tileCount = await dabble.rackTiles.count();
      expect(tileCount).toBeGreaterThanOrEqual(10);
    });

    test('shows game board with cells', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const dabble = new DabblePage(page);
      await dabble.waitForBoard();

      // Board should have multiple cells
      const cellCount = await dabble.boardCells.count();
      expect(cellCount).toBeGreaterThan(20);
    });

    test('rack tiles display letters', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const dabble = new DabblePage(page);
      await dabble.waitForBoard();

      // Get text from rack tiles
      const rackLetters = await dabble.getRackLetters();
      expect(rackLetters.length).toBeGreaterThanOrEqual(10);
      // Each should be a single uppercase letter
      for (const letter of rackLetters) {
        expect(letter).toMatch(/^[A-Z]$/);
      }
    });

    test('can see the board layout', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const dabble = new DabblePage(page);
      await dabble.waitForBoard();

      // Take a screenshot of the initial state for verification
      await expect(dabble.gameBoard).toBeVisible();
    });
  });
});
