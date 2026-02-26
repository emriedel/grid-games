import { test, expect } from '@playwright/test';
import { CaromPage, LandingPage } from '../../page-objects';
import {
  CAROM_PUZZLE_1_SOLUTION,
  CAROM_PUZZLE_1_OPTIMAL_MOVES,
} from '../../helpers/solutions/carom';

/**
 * Carom game-specific tests.
 * Tests basic game functionality and UI.
 */
test.describe('Carom Game', () => {
  // Only run on carom project
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('carom'), 'Carom-only test');
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
      expect(gameName.toLowerCase()).toContain('carom');
    });

    test('can load puzzle #1 from archive', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const carom = new CaromPage(page);
      await carom.waitForBoard();

      // Board should be visible
      await expect(carom.gameBoard).toBeVisible();
    });

    test('shows pieces on the board', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const carom = new CaromPage(page);
      await carom.waitForBoard();

      // Should have at least the target piece
      await expect(carom.targetPiece).toBeVisible();

      // Should have blocker pieces
      const blockerCount = await carom.blockerPieces.count();
      expect(blockerCount).toBeGreaterThan(0);
    });

    test('shows move counter', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const carom = new CaromPage(page);
      await carom.waitForBoard();

      // Move counter should be visible
      await expect(carom.moveCounter).toBeVisible();
    });

    test('can select a piece', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const carom = new CaromPage(page);
      await carom.waitForBoard();

      // Select the target piece
      await carom.selectPiece('target');

      // Directional arrows should appear (at least one)
      await page.waitForTimeout(200);
      const arrowCount = await page.locator('button[aria-label^="Move"]').count();
      expect(arrowCount).toBeGreaterThan(0);
    });

    test('can select and move a piece', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const carom = new CaromPage(page);
      await carom.waitForBoard();

      // Get initial move count
      const initialCount = await carom.getMoveCount();

      // Select target and make a move
      await carom.selectPiece('target');
      await carom.move('left');

      // Move count should increase
      await page.waitForTimeout(300);
      const newCount = await carom.getMoveCount();
      expect(newCount).toBeGreaterThan(initialCount);
    });
  });

  test.describe('Puzzle Completion', () => {
    test.beforeEach(async ({ context }) => {
      await context.clearCookies();
    });

    test('can complete puzzle #1 with optimal solution', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const carom = new CaromPage(page);
      await carom.waitForBoard();

      // Verify starting state
      const initialMoves = await carom.getMoveCount();
      expect(initialMoves).toBe(0);

      // Play through the solution
      await carom.playSolution(CAROM_PUZZLE_1_SOLUTION);

      // Wait for game to detect completion
      await page.waitForTimeout(500);

      // Verify game is finished
      const finished = await carom.isFinished();
      expect(finished).toBe(true);

      // Verify optimal move count
      const finalMoves = await carom.getMoveCount();
      expect(finalMoves).toBe(CAROM_PUZZLE_1_OPTIMAL_MOVES);
    });

    test('shows results modal after completion', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const carom = new CaromPage(page);
      await carom.waitForBoard();

      // Complete the puzzle
      await carom.playSolution(CAROM_PUZZLE_1_SOLUTION);

      // Wait for results modal to auto-open
      await carom.resultsModal.waitForOpen();

      // Verify modal is open
      expect(await carom.resultsModal.isOpen()).toBe(true);

      // Primary stat should show move count
      const stat = await carom.resultsModal.getPrimaryStat();
      expect(stat).toContain('10');

      // Trophy emoji should appear in modal for optimal solution
      await expect(page.getByRole('dialog').getByText('🏆').first()).toBeVisible();
    });

    test('saves completion to localStorage', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const carom = new CaromPage(page);
      await carom.waitForBoard();

      // Complete the puzzle
      await carom.playSolution(CAROM_PUZZLE_1_SOLUTION);
      await page.waitForTimeout(500);

      // Check localStorage has completion data
      const hasStorage = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(k => k.startsWith('carom-1-'));
      });
      expect(hasStorage).toBe(true);
    });
  });
});
