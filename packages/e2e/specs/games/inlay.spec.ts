import { test, expect } from '@playwright/test';
import { InlayPage, LandingPage } from '../../page-objects';

/**
 * Inlay game-specific tests.
 * Tests basic game functionality and UI.
 */
test.describe('Inlay Game', () => {
  // Only run on inlay project
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('inlay'), 'Inlay-only test');
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
      expect(gameName.toLowerCase()).toContain('inlay');
    });

    test('can load puzzle #1 from archive', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const inlay = new InlayPage(page);
      await inlay.waitForBoard();

      // Board should be visible
      await expect(inlay.gameBoard).toBeVisible();
    });

    test('shows piece tray with pentominoes', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const inlay = new InlayPage(page);
      await inlay.waitForBoard();

      // Piece tray should be visible
      await expect(inlay.pieceTray).toBeVisible();

      // Should have pieces (buttons with aria-labels)
      const pieceCount = await inlay.trayPieces.count();
      expect(pieceCount).toBeGreaterThanOrEqual(5);
    });

    test('pieces have identifying labels', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const inlay = new InlayPage(page);
      await inlay.waitForBoard();

      // Look for pieces with known pentomino names in aria-labels
      const knownPieces = ['F', 'I', 'L', 'N', 'P', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
      let foundPiece = false;
      for (const pieceName of knownPieces) {
        const piece = inlay.page.locator(`button[aria-label^="${pieceName}"]`).first();
        if (await piece.isVisible({ timeout: 500 }).catch(() => false)) {
          foundPiece = true;
          break;
        }
      }
      expect(foundPiece).toBe(true);
    });

    test('can select a piece from tray', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const inlay = new InlayPage(page);
      await inlay.waitForBoard();

      // Find first available piece and click it
      const firstPiece = inlay.trayPieces.first();
      await firstPiece.click();
      await page.waitForTimeout(200);

      // Piece should now show as selected (check for ring or selected class)
      const ariaLabel = await firstPiece.getAttribute('aria-label');
      const ariaPressed = await firstPiece.getAttribute('aria-pressed');
      // Either the aria-label contains "selected" or aria-pressed is true
      const isSelected = ariaLabel?.includes('selected') || ariaPressed === 'true';
      expect(isSelected).toBe(true);
    });
  });
});
