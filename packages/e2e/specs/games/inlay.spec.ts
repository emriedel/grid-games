import { test, expect } from '@playwright/test';
import { InlayPage, LandingPage } from '../../page-objects';
import {
  INLAY_PUZZLE_1_SOLUTION,
  INLAY_PUZZLE_1_PENTOMINOES,
} from '../../helpers/solutions/inlay';

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

  test.describe('Puzzle Completion', () => {
    test.beforeEach(async ({ context }) => {
      await context.clearCookies();
    });

    test('can complete puzzle #1 by placing all pieces', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const inlay = new InlayPage(page);
      await inlay.waitForBoard();

      // Verify we have the expected pieces in tray
      const initialPieceCount = await inlay.trayPieces.count();
      expect(initialPieceCount).toBe(INLAY_PUZZLE_1_PENTOMINOES.length);

      // Play through the solution
      await inlay.playSolution(INLAY_PUZZLE_1_SOLUTION);

      // Wait for game to detect completion
      await page.waitForTimeout(500);

      // Verify game is finished (See Results button should be visible)
      const finished = await inlay.isFinished();
      expect(finished).toBe(true);
    });

    test('shows results modal after completion', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const inlay = new InlayPage(page);
      await inlay.waitForBoard();

      // Complete the puzzle
      await inlay.playSolution(INLAY_PUZZLE_1_SOLUTION);

      // Wait for results modal to auto-open
      await inlay.resultsModal.waitForOpen();

      // Verify modal is open
      expect(await inlay.resultsModal.isOpen()).toBe(true);

      // Modal should show game name and share button
      await expect(page.getByRole('dialog').getByText(/inlay/i)).toBeVisible();
      await expect(page.getByRole('dialog').getByRole('button', { name: /share/i })).toBeVisible();
    });

    test('saves completion to localStorage', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const inlay = new InlayPage(page);
      await inlay.waitForBoard();

      // Complete the puzzle
      await inlay.playSolution(INLAY_PUZZLE_1_SOLUTION);
      await page.waitForTimeout(500);

      // Check localStorage has completion data
      const hasStorage = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(k => k.startsWith('inlay-1-'));
      });
      expect(hasStorage).toBe(true);
    });
  });
});
