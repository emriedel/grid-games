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

  test.describe('Puzzle Completion', () => {
    test.beforeEach(async ({ context }) => {
      await context.clearCookies();
    });

    test('can trace words and finish puzzle #1', async ({ page }) => {
      await page.goto('/?puzzle=1&debug=true');
      const jumble = new JumblePage(page);
      await jumble.waitForBoard();

      // Puzzle #1 board:
      // N F D T N
      // E T I I F
      // A I U E B
      // U W R O S
      // R H E E T

      // Trace "TIE": (1,1) T -> (1,2) I -> (2,3) E
      await jumble.traceWord([
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 3 },
      ]);

      // Trace "NET": (0,0) N -> (1,0) E -> (1,1) T
      await jumble.traceWord([
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ]);

      // Trace "FIT": (0,1) F -> (1,2) I -> (0,3) T
      await jumble.traceWord([
        { row: 0, col: 1 },
        { row: 1, col: 2 },
        { row: 0, col: 3 },
      ]);

      // Wait briefly for words to be registered
      await page.waitForTimeout(500);

      // "Finish Early" button should be visible after finding words
      const finishButton = page.getByRole('button', { name: /finish early/i });
      await expect(finishButton).toBeVisible();

      // Click Finish Early
      await jumble.clickFinish();

      // Game should be finished
      const finished = await jumble.isFinished();
      expect(finished).toBe(true);
    });

    test('shows results modal after completion', async ({ page }) => {
      await page.goto('/?puzzle=1&debug=true');
      const jumble = new JumblePage(page);
      await jumble.waitForBoard();

      // Trace "TIE": (1,1) T -> (1,2) I -> (2,3) E
      await jumble.traceWord([
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 3 },
      ]);

      // Click Finish Early
      await jumble.clickFinish();

      // Results modal should auto-open
      await page.waitForTimeout(500);
      expect(await jumble.resultsModal.isOpen()).toBe(true);

      // Modal should show game name
      await expect(page.getByRole('dialog').getByText(/jumble/i)).toBeVisible();

      // Share button should be present
      await expect(page.getByRole('dialog').getByRole('button', { name: /share/i })).toBeVisible();
    });

    test('saves completion to localStorage', async ({ page }) => {
      await page.goto('/?puzzle=1&debug=true');
      const jumble = new JumblePage(page);
      await jumble.waitForBoard();

      // Trace "NET": (0,0) N -> (1,0) E -> (1,1) T
      await jumble.traceWord([
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ]);

      // Click Finish Early
      await jumble.clickFinish();
      await page.waitForTimeout(500);

      // Check localStorage has completion data
      const hasStorage = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(k => k.startsWith('jumble-1-'));
      });
      expect(hasStorage).toBe(true);
    });
  });
});
