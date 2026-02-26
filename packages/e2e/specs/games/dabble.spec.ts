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

  test.describe('Puzzle Completion', () => {
    test.beforeEach(async ({ context }) => {
      await context.clearCookies();
    });

    test('can submit a word and finish puzzle #1', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const dabble = new DabblePage(page);
      await dabble.waitForBoard();

      // Puzzle #1 letters include A, N, D - we can form "AND"
      // Place "AND" horizontally covering the center star (row 4, starting at col 3)
      // Center star is at (4, 4) in a 9x9 grid
      await dabble.placeWord('AND', 4, 3, 'horizontal');

      // Submit the word
      await dabble.submitWord();
      await page.waitForTimeout(500);

      // Score should have increased (AND = 1+1+2 = 4 points minimum)
      const score = await dabble.getScore();
      expect(score).toBeGreaterThanOrEqual(4);

      // Click Finish to complete
      await dabble.clickFinish();

      // Verify game is finished (See Results button should be visible)
      const finished = await dabble.isFinished();
      expect(finished).toBe(true);
    });

    test('shows results modal after completion', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const dabble = new DabblePage(page);
      await dabble.waitForBoard();

      // Place and submit a word
      await dabble.placeWord('AND', 4, 3, 'horizontal');
      await dabble.submitWord();
      await page.waitForTimeout(300);

      // Click Finish
      await dabble.clickFinish();

      // Results modal should auto-open or we need to click See Results
      await dabble.resultsModal.waitForOpen();

      // Verify modal is open
      expect(await dabble.resultsModal.isOpen()).toBe(true);

      // Modal should show game name and share button
      await expect(page.getByRole('dialog').getByText(/dabble/i)).toBeVisible();
      await expect(page.getByRole('dialog').getByRole('button', { name: /share/i })).toBeVisible();
    });

    test('saves completion to localStorage', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const dabble = new DabblePage(page);
      await dabble.waitForBoard();

      // Place and submit a word
      await dabble.placeWord('AND', 4, 3, 'horizontal');
      await dabble.submitWord();
      await page.waitForTimeout(300);

      // Click Finish
      await dabble.clickFinish();
      await page.waitForTimeout(500);

      // Check localStorage has completion data
      const hasStorage = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(k => k.startsWith('dabble-1-'));
      });
      expect(hasStorage).toBe(true);
    });
  });
});
