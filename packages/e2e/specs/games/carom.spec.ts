import { test, expect } from '@playwright/test';
import { CaromPage, LandingPage } from '../../page-objects';

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
});
